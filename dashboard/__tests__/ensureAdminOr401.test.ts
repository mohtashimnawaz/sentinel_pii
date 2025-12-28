import httpMocks from 'node-mocks-http'
import { ensureAdminOr401 } from '../lib/adminAuth'

afterEach(() => { jest.restoreAllMocks(); delete process.env.ADMIN_SECRET })

test('ensureAdminOr401 returns 401 and sets JSON when not authorized', async () => {
  const req: any = { headers: {} }
  const res = httpMocks.createResponse()
  const result = await ensureAdminOr401(req, res as any)
  expect(result).toBe(false)
  expect(res.statusCode).toBe(401)
  expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
})

test('ensureAdminOr401 returns true when authorized via ADMIN_SECRET', async () => {
  process.env.ADMIN_SECRET = 'secret'
  const req: any = { headers: { authorization: 'Bearer secret' } }
  const res = httpMocks.createResponse()
  const result = await ensureAdminOr401(req, res as any)
  expect(result).toBe(true)
  expect(res.statusCode).not.toBe(401)
})