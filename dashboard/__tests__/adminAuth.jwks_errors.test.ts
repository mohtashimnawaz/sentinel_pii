import jwt from 'jsonwebtoken'
import { isAdminAuthorizedAsync } from '../lib/adminAuth'
const jwks = require('../lib/jwks')

afterEach(() => { jest.restoreAllMocks(); delete process.env.ADMIN_JWKS_URI })

test('isAdminAuthorizedAsync returns false when JWKS fetch fails', async () => {
  process.env.ADMIN_JWKS_URI = 'https://example.com/.well-known/jwks.json'
  jest.spyOn(jwt, 'decode').mockReturnValue({ header: { kid: 'k1' } } as any)
  jest.spyOn(jwks, 'getSigningKey').mockRejectedValue(new Error('network error'))
  const req: any = { headers: { authorization: 'Bearer fake' } }
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

  await expect(isAdminAuthorizedAsync(req, undefined)).resolves.toBe(false)
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('JWT/JWKS verification failed'), expect.anything())
})

test('isAdminAuthorizedAsync returns false when token header missing kid', async () => {
  process.env.ADMIN_JWKS_URI = 'https://example.com/.well-known/jwks.json'
  jest.spyOn(jwt, 'decode').mockReturnValue({ header: {} } as any)
  const req: any = { headers: { authorization: 'Bearer fake' } }
  await expect(isAdminAuthorizedAsync(req, undefined)).resolves.toBe(false)
})

test('isAdminAuthorizedAsync returns false when token is expired (verify throws)', async () => {
  process.env.ADMIN_JWKS_URI = 'https://example.com/.well-known/jwks.json'
  jest.spyOn(jwt, 'decode').mockReturnValue({ header: { kid: 'k1' } } as any)
  jest.spyOn(jwks, 'getSigningKey').mockResolvedValue('-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqh...\n-----END CERTIFICATE-----')
  jest.spyOn(jwt, 'verify').mockImplementation(() => { throw new Error('jwt expired') })
  const req: any = { headers: { authorization: 'Bearer fake' } }
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

  await expect(isAdminAuthorizedAsync(req, undefined)).resolves.toBe(false)
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('JWT/JWKS verification failed'), expect.anything())
})
