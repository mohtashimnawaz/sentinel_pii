import { useState, useEffect } from 'react'

export default function KeysAdmin() {
  const [keys, setKeys] = useState<any[]>([])
  const [name, setName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchKeys() }, [])

  async function fetchKeys() {
    const res = await fetch('/api/admin/keys', { headers: { Authorization: 'Bearer ' + (process.env.NEXT_PUBLIC_ADMIN_SECRET || '') } })
    if (res.ok) {
      const j = await res.json()
      setKeys(j.keys || [])
    }
  }

  async function createKey(e: any) {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (process.env.NEXT_PUBLIC_ADMIN_SECRET || '') },
      body: JSON.stringify({ name })
    })
    if (!res.ok) {
      setError('Failed to create key')
      return
    }
    const j = await res.json()
    setCreatedToken(j.token)
    setName('')
    fetchKeys()
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>API Keys (Admin)</h1>
      <form onSubmit={createKey}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Key name" />
        <button type="submit">Create</button>
      </form>
      {createdToken && (
        <div style={{ marginTop: 10 }}>
          <strong>New key:</strong>
          <pre>{createdToken}</pre>
          <p>Store this token safely; it will not be shown again.</p>
        </div>
      )}

      <h2>Existing keys</h2>
      <ul>
        {keys.map(k => (
          <li key={k.id}>
            {k.name} — {k.enabled ? 'enabled' : 'disabled'} — {k.created_at}
            <button style={{ marginLeft: 8 }} onClick={() => rotateKey(k.id)}>Regenerate</button>
          </li>
        ))}
      </ul>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </main>
  )
}
