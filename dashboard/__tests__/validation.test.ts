import { validateEvent } from '../lib/validation'

test('valid event passes validation', () => {
  const ev = {
    timestamp: new Date().toISOString(),
    secret_type: 'AWS',
    action: 'blocked',
  }
  const res = validateEvent(ev)
  expect(res.success).toBe(true)
})

test('invalid secret_type fails', () => {
  const ev: any = {
    timestamp: new Date().toISOString(),
    secret_type: 'UNKNOWN',
    action: 'blocked',
  }
  const res = validateEvent(ev)
  expect(res.success).toBe(false)
})
