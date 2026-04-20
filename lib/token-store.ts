import { Redis } from "@upstash/redis";

const REDIS_KEY = "suno:token";
const REDIS_TS_KEY = "suno:token:ts";
const TTL_SEC = 55;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// In-memory fallback for local dev without Redis env vars
let _memToken: string | null = null;
let _memTs = 0;

export async function setToken(token: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await Promise.all([
      redis.set(REDIS_KEY, token, { ex: TTL_SEC }),
      redis.set(REDIS_TS_KEY, Date.now(), { ex: TTL_SEC }),
    ]);
  } else {
    _memToken = token;
    _memTs = Date.now();
  }
}

export async function getToken(): Promise<{ token: string; ageMs: number } | null> {
  const redis = getRedis();
  if (redis) {
    const [token, ts] = await Promise.all([
      redis.get<string>(REDIS_KEY),
      redis.get<number>(REDIS_TS_KEY),
    ]);
    if (!token || !ts) return null;
    return { token, ageMs: Date.now() - ts };
  } else {
    if (!_memToken) return null;
    const ageMs = Date.now() - _memTs;
    if (ageMs > TTL_SEC * 1000) return null;
    return { token: _memToken, ageMs };
  }
}
