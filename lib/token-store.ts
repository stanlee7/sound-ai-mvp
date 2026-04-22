import { Redis } from "@upstash/redis";

const REDIS_KEY = "suno:token";
const REDIS_TS_KEY = "suno:token:ts";
const TTL_SEC = 60; // Suno JWT 실제 유효시간

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

let _memToken: string | null = null;
let _memTs = 0;

export async function setToken(token: string): Promise<void> {
  const now = Date.now();
  const redis = getRedis();
  if (redis) {
    try {
      await Promise.all([
        redis.set(REDIS_KEY, token, { ex: TTL_SEC }),
        redis.set(REDIS_TS_KEY, String(now), { ex: TTL_SEC }),
      ]);
    } catch (e) {
      console.error("[token-store] Redis SET error:", e);
    }
  } else {
    _memToken = token;
    _memTs = now;
  }
}

export async function getToken(): Promise<{ token: string; ageMs: number } | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const [token, tsStr] = await Promise.all([
        redis.get<string>(REDIS_KEY),
        redis.get<string>(REDIS_TS_KEY),
      ]);
      if (!token || !tsStr) return null;
      const ageMs = Date.now() - Number(tsStr);
      return { token, ageMs };
    } catch (e) {
      console.error("[token-store] Redis GET error:", e);
      return null;
    }
  } else {
    if (!_memToken) return null;
    const ageMs = Date.now() - _memTs;
    if (ageMs > TTL_SEC * 1000) return null;
    return { token: _memToken, ageMs };
  }
}
