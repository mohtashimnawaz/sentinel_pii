import handler from '../pages/api/admin/audit.csv'
import httpMocks from 'node-mocks-http'

jest.mock('pg', () => ({ Client: jest.fn().mockImplementation(() => ({
  connect: jest.fn(),
  end: jest.fn(),
  query: jest.fn((sql: string, params?: any[]) => {
    return Promise.resolve({ rows: [{ id: '1', timestamp: new Date().toISOString(), actor: 'admin', action: 'CREATE_KEY', details: {} }] })
  })
})) }))

test('audit csv API returns CSV with attachment headers', async () => {
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/sentinel'
  const req = httpMocks.createRequest({ method: 'GET', query: { page: '1', limit: '10' }, headers: { authorization: 'Bearer secret' } })
  const res = httpMocks.createResponse()
  jest.spyOn(require('../lib/adminAuth'), 'isAdminAuthorizedAsync').mockResolvedValue(true)

  await handler(req as any, res as any)
  expect(res.statusCode).toBe(200)
  expect(res.getHeader('Content-Type')).toBe('text/csv')
  expect(res.getHeader('Content-Disposition')).toContain('attachment')
  delete process.env.DATABASE_URL
})