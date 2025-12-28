import crypto from 'crypto'

export async function createIngestKey(client: any, name: string, actor?: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')

  await client.query('INSERT INTO ingest_keys(name, key_hash, enabled) VALUES($1,$2,TRUE)', [name, hash])

  const details = { name }
  await client.query('INSERT INTO audit_logs(actor, action, details) VALUES($1,$2,$3)', [actor || null, 'CREATE_KEY', JSON.stringify(details)])

  return token
}

export async function rotateIngestKey(client: any, id: string, actor?: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')

  await client.query('UPDATE ingest_keys SET key_hash = $1 WHERE id = $2', [hash, id])
  const details = { id }
  await client.query('INSERT INTO audit_logs(actor, action, details) VALUES($1,$2,$3)', [actor || null, 'ROTATE_KEY', JSON.stringify(details)])

  return token
}
