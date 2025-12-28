import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Home() {
  const { data, error } = useSWR('/api/stats', fetcher)

  if (error) return <div>Failed to load</div>
  if (!data) return <div>Loading...</div>

  return (
    <main style={{ padding: 20 }}>
      <h1>Sentinel Dashboard (MVP)</h1>
      <p>Events in the last 24h: {data.count_24h}</p>
      <h2>Top apps</h2>
      <ul>
        {data.top_apps.map((a: any) => (
          <li key={a.app}>{a.app} — {a.count}</li>
        ))}
      </ul>
    </main>
  )
}
