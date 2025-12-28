import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from 'pg'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const conn = process.env.DATABASE_URL
  if (!conn) return res.status(500).json({ error: 'Database not configured' })

  const client = new Client({ connectionString: conn })
  try {
    await client.connect()
    const { rows } = await client.query(`
      SELECT COUNT(*) FILTER (WHERE timestamp >= now() - interval '24 hours') AS count_24h
    `)

    const top = await client.query(`
      SELECT app_name AS app, COUNT(*) AS count FROM telemetry_events
      WHERE timestamp >= now() - interval '7 days'
      GROUP BY app_name ORDER BY count DESC LIMIT 10
    `)

    res.status(200).json({ count_24h: Number(rows[0].count_24h), top_apps: top.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'db error' })
  } finally {
    await client.end()
  }
}
