import { useState, useEffect } from 'react'

export default function AuditAdmin() {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [filterActor, setFilterActor] = useState('')

  useEffect(() => { fetchPage() }, [page, limit])

  async function fetchPage() {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filterAction) params.set('action', filterAction)
    if (filterActor) params.set('actor', filterActor)

    const res = await fetch(`/api/admin/audit?${params.toString()}`, { headers: { Authorization: 'Bearer ' + (process.env.NEXT_PUBLIC_ADMIN_SECRET || '') } })
    if (res.ok) {
      const j = await res.json()
      setRows(j.rows || [])
      setTotal(j.total || 0)
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Audit Logs</h1>
      <div style={{ marginBottom: 10 }}>
        <input placeholder="action (CREATE_KEY|ROTATE_KEY|TOGGLE_KEY)" value={filterAction} onChange={e => setFilterAction(e.target.value)} />
        <input placeholder="actor substring" value={filterActor} onChange={e => setFilterActor(e.target.value)} style={{ marginLeft: 8 }} />
        <button onClick={() => { setPage(1); fetchPage() }} style={{ marginLeft: 8 }}>Filter</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Time</th>
            <th style={{ textAlign: 'left' }}>Actor</th>
            <th style={{ textAlign: 'left' }}>Action</th>
            <th style={{ textAlign: 'left' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{new Date(r.timestamp).toLocaleString()}</td>
              <td>{r.actor}</td>
              <td>{r.action}</td>
              <td><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(r.details)}</pre></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 10 }}>
        <span>Page {page} of {Math.ceil(total / limit || 1)}</span>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} style={{ marginLeft: 8 }}>Prev</button>
        <button onClick={() => setPage(p => p + 1)} style={{ marginLeft: 8 }}>Next</button>
        <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }} style={{ marginLeft: 8 }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </main>
  )
}
