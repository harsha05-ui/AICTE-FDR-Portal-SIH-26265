import { describe, it, expect, afterAll, vi } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'

describe('Module 1: Health & Standard Error Protocol', () => {
  // Spy on prisma.$queryRaw to simulate healthy DB query without requiring live Postgres daemon in unit tests
  vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ 1: 1 }] as any)

  afterAll(async () => {
    vi.restoreAllMocks()
    await prisma.$disconnect()
  })

  it('GET /api/v1/health should return status 200 with service and database metrics', async () => {
    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('healthy')
    expect(res.body.service).toBe('aicte-fdr-portal-api')
    expect(res.body.database.status).toBe('healthy')
    expect(typeof res.body.database.latencyMs).toBe('number')
    expect(res.body.memoryUsageMB).toBeDefined()
  })

  it('GET /health (root alias) should also return healthy status', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('healthy')
  })

  it('Unmatched routes should return structured JSON 404 conforming to error schema', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-endpoint')

    expect(res.status).toBe(404)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toContain('not found')
    // Ensure no stack trace leaks
    expect(res.body.error.details).toEqual([])
  })
})
