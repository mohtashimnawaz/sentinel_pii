import jwt from 'jsonwebtoken'
import { getSigningKey } from './jwks'

export async function isAdminAuthorizedAsync(req: any, adminSecret?: string): Promise<boolean> {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth

  // First, plain admin secret
  if (adminSecret && token === adminSecret) return true

  // Next, verify via JWKS URI
  const jwksUri = process.env.ADMIN_JWKS_URI
  if (jwksUri && token) {
    try {
      const decodedHeader = jwt.decode(token, { complete: true }) as any
      if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
        return false
      }
      const kid = decodedHeader.header.kid
      const key = await getSigningKey(kid, jwksUri)

      // Optional issuer/audience checks
      const opts: any = { algorithms: ['RS256'] }
      if (process.env.ADMIN_JWT_ISS) opts.issuer = process.env.ADMIN_JWT_ISS
      if (process.env.ADMIN_JWT_AUD) opts.audience = process.env.ADMIN_JWT_AUD

      const decoded: any = jwt.verify(token, key, opts)
      if (decoded && (decoded.role === 'admin' || (decoded.scope && decoded.scope.split(' ').includes('admin')))) {
        return true
      }
    } catch (e: any) {
      console.error('JWT/JWKS verification failed', e.message || e)
      return false
    }
  }

  // Last fallback: ADMIN_JWT_PUBLIC_KEY (raw PEM)
  const publicKey = process.env.ADMIN_JWT_PUBLIC_KEY
  if (publicKey && token) {
    try {
      const decoded: any = jwt.verify(token, publicKey, { algorithms: ['RS256'] })
      if (decoded && (decoded.role === 'admin' || (decoded.scope && decoded.scope.split(' ').includes('admin')))) {
        return true
      }
    } catch (e: any) {
      console.error('JWT verification failed', e.message || e)
      return false
    }
  }

  return false
}

// Backwards-compatible wrapper expected by handlers
export function isAdminAuthorized(req: any, adminSecret?: string): boolean {
  // Note: we intentionally block sync path for JWT; encourage async call
  // For backwards compatibility in tests, support the simple secret check
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  if (adminSecret && token === adminSecret) return true
  console.warn('isAdminAuthorized called synchronously — JWT/JWKS checks require async path; call isAdminAuthorizedAsync when possible')
  return false
}
