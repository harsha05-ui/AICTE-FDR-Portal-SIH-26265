import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import { NotFoundError, ForbiddenError, UnauthorizedError } from '../../lib/errors'
import { param } from '../../lib/params'
import { decryptBuffer } from '../../lib/encryption'
import { config } from '../../config'
import { authenticate } from '../../middleware/auth'

export const documentsRouter = Router()

export function generateDocumentSignature(docId: string, expires: number): string {
  const secret = config.FILE_ENC_KEY || config.JWT_SECRET
  return crypto.createHmac('sha256', secret).update(`${docId}:${expires}`).digest('hex')
}

// GET /documents/:id/download-url (Scoped: returns 5-minute HMAC-signed download link)
documentsRouter.get('/:id/download-url', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        fdr: { include: { institution: true } },
      },
    })

    if (!doc) {
      throw new NotFoundError(`Document ${id} not found.`)
    }

    // Institution user scope check
    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== doc.fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot generate download link for another institution document')
    }

    // 5-minute expiry (300 seconds)
    const expires = Math.floor(Date.now() / 1000) + 300
    const sig = generateDocumentSignature(doc.id, expires)
    const expiresAt = new Date(expires * 1000).toISOString()

    const downloadUrl = `${config.API_PREFIX}/documents/${doc.id}/download?expires=${expires}&sig=${sig}`

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        actorName: req.user?.name,
        actorRole: req.user?.role,
        action: 'GENERATE_SIGNED_DOWNLOAD_URL',
        entityType: 'Document',
        entityId: doc.id,
        changeSummary: `Generated 5-minute signed download URL for file ${doc.originalFilename}.`,
        metadata: JSON.stringify({ docId: doc.id, expiresAt }),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json({
      downloadUrl,
      expiresAt,
      validSeconds: 300,
    })
  } catch (err) {
    next(err)
  }
})

// GET /documents/:id/download (Supports HMAC-signed URL or Bearer authentication)
documentsRouter.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const { expires, sig } = req.query

    let isSignedAccess = false

    if (sig && expires) {
      // Validate HMAC-signed URL
      const expNumber = Number(expires)
      const nowSeconds = Math.floor(Date.now() / 1000)

      if (isNaN(expNumber) || nowSeconds > expNumber) {
        throw new ForbiddenError('Signed download URL has expired. Please generate a new URL.')
      }

      const expectedSig = generateDocumentSignature(id, expNumber)
      if (sig !== expectedSig) {
        throw new ForbiddenError('Invalid signature for signed download URL.')
      }

      isSignedAccess = true
    } else {
      // Bearer token authentication required
      if (!req.user) {
        await new Promise<void>((resolve, reject) => {
          authenticate(req, res, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }
    }

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        fdr: {
          include: { institution: true },
        },
      },
    })

    if (!doc) {
      throw new NotFoundError(`Document ${id} not found.`)
    }

    // Scoped check for standard bearer access: if INSTITUTION_USER, must match institution
    if (!isSignedAccess && req.user?.role === 'INSTITUTION_USER') {
      if (req.user.institutionId !== doc.fdr.institutionId) {
        throw new ForbiddenError('Access forbidden: cannot download document from another institution')
      }
    }

    const filePath = path.resolve(config.UPLOAD_DIR, doc.storageKey)
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Underlying document file not found on storage.')
    }

    const encryptedData = fs.readFileSync(filePath)
    let fileBuffer: Buffer

    if (doc.iv && doc.authTag) {
      fileBuffer = decryptBuffer(encryptedData, doc.iv, doc.authTag)
    } else {
      fileBuffer = encryptedData
    }

    // Log download in AuditLog
    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id || undefined,
        actorName: req.user?.name || 'Authorized Signed Link Bearer',
        actorRole: req.user?.role || 'SIGNED_LINK',
        action: isSignedAccess ? 'SIGNED_DOCUMENT_DOWNLOAD' : 'DOCUMENT_DOWNLOAD',
        entityType: 'Document',
        entityId: doc.id,
        changeSummary: `Downloaded file ${doc.originalFilename} (version ${doc.version}) for FDR ${doc.fdr.referenceNumber} via ${isSignedAccess ? 'signed URL' : 'Bearer auth'}.`,
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.setHeader('Content-Type', doc.mimeType)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.originalFilename)}"`
    )
    res.send(fileBuffer)
  } catch (err) {
    next(err)
  }
})
