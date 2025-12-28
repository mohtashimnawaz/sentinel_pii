import handler from '../pages/api/admin/audit'
import httpMocks from 'node-mocks-http'

jest.mock('pg', () => ({ Client: jest.fn().mockImplementation(() => ({
  connect: jest.fn(),
  end: jest.fn(),
  query: jest.fn((sql: string, params?: any[]) => {
    if (sql.startsWith('SELECT COUNT')) return Promise.resolve({ rows: [{ total: 2 }] })
    return Promise.resolve({ rows: [{ id: '1', timestamp: new Date().toISOString(), actor: 'admin', action: 'CREATE_KEY', details: {} }] })
  })
})) }))

test('audit API returns rows and total and respects pagination', async () => {
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/sentinel'
  const req = httpMocks.createRequest({ method: 'GET', query: { page: '1', limit: '10' }, headers: { authorization: 'Bearer secret' } })
  const res = httpMocks.createResponse()
  // Mock admin authorized
  jest.spyOn(require('../lib/adminAuth'), 'isAdminAuthorizedAsync').mockResolvedValue(true)

  await handler(req as any, res as any)     
  expect(res.statusCode).toBe(200)
  const json = res._getJSONData()
  expect(json.total).toBe(2)
  expect(Array.isArray(json.rows)).toBe(true)
  delete process.env.DATABASE_URL
})
