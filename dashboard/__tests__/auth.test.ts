import { allowRequest, resetLimiter } from '../lib/rate_limiter'

afterEach(() => {
  resetLimiter()
})

test('allowRequest allows many requests until limit', () => {
  const key = 'testkey'
  let allowed = 0
  for (let i = 0; i < 100; i++) {
    if (allowRequest(key)) allowed++
  }
  expect(allowed).toBeGreaterThan(0)
})

test('rate limiter enforces limit', () => {
  const key = 'ratelimitkey'
  let allowed = 0
  for (let i = 0; i < 200; i++) {
    if (allowRequest(key)) allowed++
  }
  expect(allowed).toBeLessThan(200)
})
