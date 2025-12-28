import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from 'pg'
import crypto from 'crypto'
import { isAdminAuthorized } from '../../../lib/adminAuth'
import { z } from 'zod'

const CreateSchema = z.object({ name: z.string().min(1).max(100) })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthorized(req, process.env.ADMIN_SECRET)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const conn = process.env.DATABASE_URL
  if (!conn) return res.status(500).json({ error: 'Database not configured' })

  const client = new Client({ connectionString: conn })
  await client.connect()

  try {
    if (req.method === 'GET') {
      const r = await client.query('SELECT id, name, enabled, created_at FROM ingest_keys ORDER BY created_at DESC')
      res.status(200).json({ keys: r.rows })
      return
    }

    if (req.method === 'POST') {
      const parsed = CreateSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload' })
        return
      }

      const token = crypto.randomBytes(32).toString('hex')
      const hash = crypto.createHash('sha256').update(token).digest('hex')

      const name = parsed.data.name
      await client.query('INSERT INTO ingest_keys(name, key_hash, enabled) VALUES($1,$2,TRUE)', [name, hash])
      // Return the plaintext token ONLY at creation time
      res.status(201).json({ token })
      return
    }

    if (req.method === 'PATCH') {
      // toggle enable/disable: expect { id: uuid, enabled: boolean }
      const { id, enabled } = req.body as { id?: string; enabled?: boolean }
      if (!id || typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'Missing id or enabled' })
        return
      }
      await client.query('UPDATE ingest_keys SET enabled = $1 WHERE id = $2', [enabled, id])
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    await client.end()
  }
}
