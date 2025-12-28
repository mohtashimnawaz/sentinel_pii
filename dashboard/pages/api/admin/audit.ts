import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from 'pg'
import { isAdminAuthorizedAsync } from '../../../lib/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await isAdminAuthorizedAsync(req, process.env.ADMIN_SECRET))) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const conn = process.env.DATABASE_URL
  if (!conn) return res.status(500).json({ error: 'Database not configured' })

  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const offset = (page - 1) * limit

  const action = req.query.action ? String(req.query.action) : null
  const actor = req.query.actor ? String(req.query.actor) : null
  const since = req.query.since ? String(req.query.since) : null

  const client = new Client({ connectionString: conn })
  await client.connect()

  try {
    const filters: string[] = []
    const params: any[] = []
    let idx = 1
    if (action) {
      filters.push(`action = $${idx++}`)
      params.push(action)
    }
    if (actor) {
      filters.push(`actor ILIKE $${idx++}`)
      params.push(`%${actor}%`)
    }
    if (since) {
      filters.push(`timestamp >= $${idx++}`)
      params.push(since)
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const qCount = `SELECT COUNT(*) AS total FROM audit_logs ${where}`
    const countRes = await client.query(qCount, params)
    const total = Number(countRes.rows[0].total || 0)

    const q = `SELECT id, timestamp, actor, action, details FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`
    params.push(limit, offset)
    const r = await client.query(q, params)

    res.status(200).json({ total, page, limit, rows: r.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'DB error' })
  } finally {
    await client.end()
  }
}
