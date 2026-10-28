import swaggerUi from 'swagger-ui-express'
import { Router } from 'express'
import { config } from '../config'

export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AICTE Security Deposit and Fixed Deposit Receipt (FDR) Management Portal API',
    version: '1.0.0',
    description: `Official statutory portal backend for managing technical institution security deposits, Fixed Deposit Receipts (FDR), Bank Guarantees (BG), and RTGS deposits. Compliant with AICTE Approval Process Handbook (APH) 2024-27.
    
**Statutory Features:**
- Multi-tier RBAC (INSTITUTION_USER, REVIEWER, APPROVER, ADMIN)
- Separation of duties across regulatory offices (Regional Office, Approval Bureau, Grievance Cell, Vigilance Bureau, Competent Authority)
- Bank verification adapter with honest simulation indicators (\`trustSimulated = true\`)
- AES-256-GCM encrypted document uploads with HMAC-signed 5-minute download links
- Regulatory holds blocking release creation and final approval
- Official NOC and Sanction Order PDF generation with reference numbering
- Dynamic rules and SLA configurations stored in statutory Setting table
- Rotating refresh tokens with httpOnly cookies`,
    contact: {
      name: 'AICTE National Regulatory Portal Support',
      url: 'https://www.aicte-india.org',
      email: 'regulatory-fdr@aicte.gov.in',
    },
  },
  servers: [
    {
      url: config.API_PREFIX,
      description: 'API v1 Base Endpoint',
    },
    {
      url: '/',
      description: 'Root Context',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Standard JSON Web Token authorization header: Bearer <token>',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'Rotating refresh token stored in httpOnly secure cookie',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid parameter provided' },
            },
          },
        },
      },
      FdrInstrument: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmvnksra7001' },
          referenceNumber: { type: 'string', example: 'FDR/SBI/2021/77190' },
          bankName: { type: 'string', example: 'State Bank of India' },
          branchName: { type: 'string', example: 'Okhla Phase-III' },
          depositAmount: { type: 'string', example: '10000000.00' },
          interestRate: { type: 'string', example: '7.25' },
          instrumentType: { type: 'string', enum: ['FDR', 'RTGS_DEPOSIT', 'BANK_GUARANTEE'] },
          verificationStatus: { type: 'string', enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'DISCREPANCY', 'REJECTED'] },
          lifecycleStatus: { type: 'string', enum: ['ACTIVE', 'EXPIRING', 'MATURED', 'RENEWED', 'RELEASED'] },
          trustLevel: { type: 'string', enum: ['SUBMITTED', 'STAFF_VERIFIED', 'BANK_CONFIRMED'] },
          trustSimulated: { type: 'boolean', example: false },
          lienStatus: { type: 'string', enum: ['NOT_RECORDED', 'CLAIMED_BY_INSTITUTION', 'CONFIRMED_BY_STAFF', 'CONFIRMED_BY_BANK'] },
          daysToMaturity: { type: 'integer', example: 7 },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authenticate user credentials',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful; returns token and sets httpOnly refresh cookie' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate refresh token and obtain new access token',
        tags: ['Authentication'],
        security: [{ CookieAuth: [] }],
        responses: {
          200: { description: 'Token successfully rotated' },
          401: { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Log out current session and revoke refresh cookie',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Session closed' },
        },
      },
    },
    '/fdrs': {
      get: {
        summary: 'List statutory instruments with role scoping and filters',
        tags: ['Instruments'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'instrumentType', in: 'query', schema: { type: 'string' } },
          { name: 'trustLevel', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Array of instruments' },
        },
      },
      post: {
        summary: 'Create a new statutory deposit instrument',
        tags: ['Instruments'],
        responses: {
          201: { description: 'Instrument created' },
        },
      },
    },
    '/fdrs/{id}/bank-verify': {
      post: {
        summary: 'Execute bank verification adapter (Honesty rule: Manual / Mock / Live)',
        tags: ['Instruments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Verification result' },
        },
      },
    },
    '/fdrs/{id}/lien': {
      patch: {
        summary: 'Update lien record and status',
        tags: ['Instruments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Lien record updated' },
        },
      },
    },
    '/release-requests': {
      get: {
        summary: 'List release requests',
        tags: ['Release Workflow'],
        responses: {
          200: { description: 'List of release requests' },
        },
      },
    },
    '/release-requests/{id}': {
      get: {
        summary: 'Get release request with multi-office stages and time spent breakdown',
        tags: ['Release Workflow'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Full release docket' },
        },
      },
    },
    '/release-requests/{id}/stages/{stageId}/action': {
      post: {
        summary: 'Approve, reject, or return a regulatory release stage',
        tags: ['Release Workflow'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'stageId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action', 'remarks'],
                properties: {
                  action: { type: 'string', enum: ['APPROVE', 'REJECT', 'RETURN'] },
                  remarks: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Stage processed' },
          403: { description: 'Separation of duties or wrong office' },
          409: { description: 'Blocked by active regulatory hold' },
        },
      },
    },
    '/release-requests/{id}/order': {
      get: {
        summary: 'Download decrypted official NOC or Sanction Order PDF',
        tags: ['Release Workflow'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Decrypted PDF document stream', content: { 'application/pdf': {} } },
          404: { description: 'Order not yet generated' },
        },
      },
    },
    '/holds': {
      get: {
        summary: 'List regulatory holds',
        tags: ['Regulatory Holds'],
        parameters: [
          { name: 'active', in: 'query', schema: { type: 'boolean' } },
          { name: 'institutionId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of holds' },
        },
      },
    },
    '/institutions/{id}/holds': {
      post: {
        summary: 'Place regulatory hold on an institution (Approver / Admin)',
        tags: ['Regulatory Holds'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          201: { description: 'Hold placed' },
        },
      },
    },
    '/holds/{id}/clear': {
      post: {
        summary: 'Clear an active regulatory hold with mandatory remarks',
        tags: ['Regulatory Holds'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Hold cleared' },
        },
      },
    },
    '/settings': {
      get: {
        summary: 'Get statutory settings (Staff)',
        tags: ['Settings'],
        responses: {
          200: { description: 'Array of system settings' },
        },
      },
    },
    '/settings/{key}': {
      put: {
        summary: 'Update statutory setting (Admin only, audited with old/new values)',
        tags: ['Settings'],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Setting updated' },
        },
      },
    },
    '/documents/{id}/download-url': {
      get: {
        summary: 'Generate HMAC-signed 5-minute direct download URL',
        tags: ['Documents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Returns download URL with signature and expiration' },
        },
      },
    },
    '/documents/{id}/download': {
      get: {
        summary: 'Download decrypted document (supports Bearer token or signed query params)',
        tags: ['Documents'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'expires', in: 'query', schema: { type: 'integer' } },
          { name: 'sig', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Decrypted document stream' },
          403: { description: 'Expired or invalid signature' },
        },
      },
    },
    '/import/instruments': {
      post: {
        summary: 'Bulk import instruments from CSV or JSON with dryRun support (Admin only)',
        tags: ['Import'],
        parameters: [{ name: 'dryRun', in: 'query', schema: { type: 'boolean' } }],
        responses: {
          200: { description: 'Dry run results' },
          201: { description: 'Instruments imported successfully' },
        },
      },
    },
    '/dashboard/summary': {
      get: {
        summary: 'Comprehensive dashboard metrics with trust levels, expiry bands, SLA status',
        tags: ['Dashboard'],
        responses: {
          200: { description: 'Summary metrics' },
        },
      },
    },
  },
}

export const swaggerRouter = Router()

// Serve raw spec as JSON
swaggerRouter.get('/swagger.json', (_req, res) => {
  res.json(openapiSpec)
})

// Serve Swagger UI
swaggerRouter.use('/', swaggerUi.serve, swaggerUi.setup(openapiSpec, { explorer: true }))
