import { isAdminAuthorized, isAdminAuthorizedAsync } from '../lib/adminAuth'

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

// Async wrapper tests for JWKS-ready paths
test('isAdminAuthorizedAsync returns true with correct token', async () => {
  const req: any = { headers: { authorization: 'Bearer secret' } }
  await expect(isAdminAuthorizedAsync(req, 'secret')).resolves.toBe(true)
})

test('isAdminAuthorizedAsync returns false when missing or wrong', async () => {
  const req1: any = { headers: {} }
  await expect(isAdminAuthorizedAsync(req1, 'secret')).resolves.toBe(false)
  const req2: any = { headers: { authorization: 'Bearer wrong' } }
  await expect(isAdminAuthorizedAsync(req2, 'secret')).resolves.toBe(false)
})