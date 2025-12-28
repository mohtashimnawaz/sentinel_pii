import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from 'pg'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = req.body
  if (!body || !body.secret_type || !body.action || !body.timestamp) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const conn = process.env.DATABASE_URL
  if (!conn) {
    res.status(500).json({ error: 'Database not configured' })
    return
  }

  const client = new Client({ connectionString: conn })
  try {
    await client.connect()
    const id = uuidv4()
    await client.query(
      `INSERT INTO telemetry_events(id, timestamp, secret_type, action, app_name, rule, machine_id_hashed, agent_version)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, body.timestamp, body.secret_type, body.action, body.app_name || null, body.rule || null, body.machine_id_hashed || null, body.agent_version || null]
    )
    res.status(201).json({ id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to store event' })
  } finally {
    await client.end()
  }
}
