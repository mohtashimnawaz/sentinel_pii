import jwt from 'jsonwebtoken'

export function isAdminAuthorized(req: any, adminSecret?: string): boolean {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth

  // First, plain admin secret
  if (adminSecret && token === adminSecret) return true

  // Next, JWT SSO: verify using ADMIN_JWT_PUBLIC_KEY (PEM) and check role/scope
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
