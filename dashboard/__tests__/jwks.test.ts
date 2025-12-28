import { fetchJwks, getSigningKey, clearCache } from '../lib/jwks'

const SAMPLE_JWKS = {
  keys: [
    { kid: 'k1', kty: 'RSA', x5c: ['MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...'] }
  ]
}

beforeEach(() => { clearCache(); (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_JWKS) }) })

afterEach(() => { jest.restoreAllMocks(); delete (global as any).fetch })

test('fetchJwks caches and returns keys', async () => {
  const keys1 = await fetchJwks('https://example.com/.well-known/jwks.json')
  expect(keys1.length).toBe(1)
  // Second call uses cache
  const keys2 = await fetchJwks('https://example.com/.well-known/jwks.json')
  expect((global as any).fetch).toHaveBeenCalledTimes(1)
})

test('getSigningKey returns certificate PEM', async () => {
  const pem = await getSigningKey('k1', 'https://example.com/.well-known/jwks.json')
  expect(pem).toContain('BEGIN CERTIFICATE')
})

test('getSigningKey throws for unknown kid', async () => {
  await expect(getSigningKey('k2', 'https://example.com/.well-known/jwks.json')).rejects.toThrow('Key not found')
})