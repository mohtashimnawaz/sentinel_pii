import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from 'pg'
import { v4 as uuidv4 } from 'uuid'

import { validateEvent } from '../../lib/validation'
import { allowRequest } from '../../lib/rate_limiter'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Basic API key authorization
  const apiKey = process.env.INGEST_API_KEY
  if (apiKey) {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
    if (!token || token !== apiKey) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    // Rate limiting per API key
    if (!allowRequest(token)) {
      res.status(429).json({ error: 'Rate limit exceeded' })
      return
    }
  }

  const body = req.body
  const parsed = validateEvent(body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
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
      [id, parsed.data.timestamp, parsed.data.secret_type, parsed.data.action, parsed.data.app_name || null, parsed.data.rule || null, parsed.data.machine_id_hashed || null, parsed.data.agent_version || null]
    )
    res.status(201).json({ id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to store event' })
  } finally {
    await client.end()
  }
}
