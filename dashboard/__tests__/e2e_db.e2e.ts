import { Client } from 'pg'
import { createIngestKey, rotateIngestKey } from '../lib/adminActions'

// This e2e test expects DATABASE_URL env var to point to a running Postgres instance.
const dbUrl = process.env.DATABASE_URL
const INGEST_KEY = process.env.INGEST_API_KEY || 'test-ingest-key-123'

if (!dbUrl) {
  // Skip test when no DB available
  test('e2e: skipped (no DATABASE_URL)', () => {
    expect(true).toBe(true)
  })
} else {
  test('e2e: migrations + admin actions work', async () => {
    const client = new Client({ connectionString: dbUrl })
    await client.connect()

    // Clean tables
    await client.query('DELETE FROM audit_logs')
    await client.query('DELETE FROM ingest_keys')

    // Create key via helper
    const token = await createIngestKey(client, 'e2e-key', 'e2e-test')
    expect(typeof token).toBe('string')

    // Check ingest_keys has one row
    const r = await client.query('SELECT COUNT(*) AS c FROM ingest_keys')
    expect(Number(r.rows[0].c)).toBe(1)

    // Rotate the key
    const idRes = await client.query('SELECT id FROM ingest_keys LIMIT 1')
    const id = idRes.rows[0].id
    const newToken = await rotateIngestKey(client, id, 'e2e-test')
    expect(typeof newToken).toBe('string')

    // Check audit logs exist
    const a = await client.query('SELECT COUNT(*) AS c FROM audit_logs')
    expect(Number(a.rows[0].c)).toBeGreaterThanOrEqual(2)

    await client.end()
  }, 20000)
}
