type Jwk = { kty: string; kid: string; use?: string; n?: string; e?: string; x5c?: string[] }

const CACHE_TTL_MS = Number(process.env.ADMIN_JWKS_CACHE_TTL_MS || 60 * 60 * 1000) // 1h
let cached: { keys: Jwk[]; fetchedAt: number } | null = null

export async function fetchJwks(uri: string): Promise<Jwk[]> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.keys
  }

  const res = await fetch(uri)
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`)
  const body = await res.json()
  const keys: Jwk[] = body.keys || []
  cached = { keys, fetchedAt: Date.now() }
  return keys
}

export async function getSigningKey(kid: string, jwksUri: string): Promise<string> {
  const keys = await fetchJwks(jwksUri)
  const key = keys.find(k => k.kid === kid)
  if (!key) throw new Error('Key not found')

  // Prefer x5c if present
  if (key.x5c && key.x5c.length > 0) {
    const cert = `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
    return cert
  }

  // Otherwise, try to convert n/e to PEM for RSA (left as an exercise — providers usually supply x5c).
  throw new Error('Unsupported JWK format (no x5c)')
}

export function clearCache() {
  cached = null
}
