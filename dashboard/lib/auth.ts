import crypto from 'crypto'
import { Client } from 'pg'

export async function verifyApiKeyWithDb(token: string, connString: string): Promise<boolean> {
  if (!token) return false
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  const client = new Client({ connectionString: connString })
  try {
    await client.connect()
    const res = await client.query('SELECT 1 FROM ingest_keys WHERE key_hash = $1 AND enabled = true LIMIT 1', [hash])
    return res.rowCount > 0
  } catch (err) {
    console.error('DB error checking API key', err)
    return false
  } finally {
    await client.end()
  }
}
