import Redis from 'ioredis'

const WINDOW = 60 // seconds
const MAX_PER_WINDOW = 120

export async function allowRequestRedis(redis: Redis, key: string): Promise<boolean> {
  const k = `rate:${key}`
  try {
    const v = await redis.incr(k)
    if (v === 1) {
      await redis.expire(k, WINDOW)
    }
    return v <= MAX_PER_WINDOW
  } catch (e) {
    console.error('Redis error in allowRequestRedis', e)
    // Fail-open: if Redis is unavailable, allow request
    return true
  }
}
