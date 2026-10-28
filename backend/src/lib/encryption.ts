import crypto from 'crypto'
import fs from 'fs'
import { config } from '../config'

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(config.FILE_ENC_KEY).digest()
}

export function encryptBuffer(data: Buffer): {
  encrypted: Buffer
  iv: string
  authTag: string
} {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

export function decryptBuffer(encrypted: Buffer, ivHex: string, authTagHex: string): Buffer {
  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

export function encryptFileSelfContained(data: Buffer): Buffer {
  const { encrypted, iv, authTag } = encryptBuffer(data)
  return Buffer.concat([Buffer.from(iv, 'hex'), Buffer.from(authTag, 'hex'), encrypted])
}

export function decryptFileSelfContained(payload: Buffer): Buffer {
  if (payload.length < 28) {
    throw new Error('Invalid encrypted payload length.')
  }
  const ivHex = payload.subarray(0, 12).toString('hex')
  const authTagHex = payload.subarray(12, 28).toString('hex')
  const encrypted = payload.subarray(28)
  return decryptBuffer(encrypted, ivHex, authTagHex)
}
