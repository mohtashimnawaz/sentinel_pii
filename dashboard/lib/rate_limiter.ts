type Entry = { count: number; window_start: number }

const WINDOW_MS = 60_000 // 1 minute
const MAX_PER_WINDOW = 120 // 120 requests per window per key

const store: Map<string, Entry> = new Map()

export function allowRequest(key: string): boolean {
  const now = Date.now()
  const e = store.get(key)
  if (!e || now - e.window_start > WINDOW_MS) {
    store.set(key, { count: 1, window_start: now })
    return true
  }

  if (e.count >= MAX_PER_WINDOW) return false
  e.count += 1
  return true
}

export function resetLimiter() {
  store.clear()
}
