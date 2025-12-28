import { allowRequestRedis } from '../lib/redis_limiter'

// Lightweight in-memory Redis-like mock for testing
class SimpleRedisMock {
  store: Map<string, { v: number; exp?: number }> = new Map()
  async incr(k: string) {
    const now = Date.now() / 1000
    const e = this.store.get(k)
    if (!e) {
      this.store.set(k, { v: 1 })
      return 1
    }
    // if expired, reset
    if (e.exp && e.exp <= now) {
      e.v = 1
      delete e.exp
      return 1
    }
    e.v += 1
    return e.v
  }
  async expire(k: string, seconds: number) {
    const e = this.store.get(k)
    if (!e) return 0
    e.exp = Date.now() / 1000 + seconds
    return 1
  }
}

test('redis limiter allows under limit and blocks over limit', async () => {
  const redis = new SimpleRedisMock()
  const key = 'testkey'
  let allowed = 0
  for (let i = 0; i < 130; i++) {
    if (await allowRequestRedis(redis as any, key)) allowed++
  }
  expect(allowed).toBeLessThan(130)
  expect(allowed).toBeGreaterThan(100)
})
