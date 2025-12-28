import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from 'pg'
import { isAdminAuthorized } from '../../../lib/adminAuth'

function toCSV(rows: any[]) {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const out: string[] = []
  out.push(headers.join(','))
  for (const r of rows) {
    const line = headers.map(h => {
      const v = r[h]
      if (v === null || v === undefined) return ''
      // JSON stringify objects
      if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"'
      return '"' + String(v).replace(/"/g, '""') + '"'
    }).join(',')
    out.push(line)
  }
  return out.join('\n')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthorized(req, process.env.ADMIN_SECRET)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const conn = process.env.DATABASE_URL
  if (!conn) return res.status(500).json({ error: 'Database not configured' })

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

    const q = `SELECT id, timestamp, actor, action, details FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT 10000`
    const r = await client.query(q, params)

    const csv = toCSV(r.rows)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"')
    res.status(200).send(csv)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'DB error' })
  } finally {
    await client.end()
  }
}
