export function isAdminAuthorized(req: any, adminSecret?: string): boolean {
  if (!adminSecret) return false
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  return token === adminSecret
}
