import { isAdminAuthorized } from '../lib/adminAuth'

test('isAdminAuthorized returns true with correct token', () => {
  const req: any = { headers: { authorization: 'Bearer secret' } }
  expect(isAdminAuthorized(req, 'secret')).toBe(true)
})

test('isAdminAuthorized returns false when missing or wrong', () => {
  const req1: any = { headers: {} }
  expect(isAdminAuthorized(req1, 'secret')).toBe(false)
  const req2: any = { headers: { authorization: 'Bearer wrong' } }
  expect(isAdminAuthorized(req2, 'secret')).toBe(false)
})