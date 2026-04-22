import { Redis } from "@upstash/redis";

const REDIS_KEY = "suno:token";
const TTL_SEC = 300; // 5분 — 탭 전환 시 여유 확보

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// In-memory fallback for local dev
let _memToken: string | null = null;
let _memTs = 0;

export async function setToken(token: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(REDIS_KEY, token, { ex: TTL_SEC });
      console.log("[token-store] Redis SET ok");
    } catch (e) {
      console.error("[token-store] Redis SET error:", e);
    }
  } else {
    console.log("[token-store] No Redis env vars — using in-memory");
    _memToken = token;
    _memTs = Date.now();
  }
}

export async function getToken(): Promise<{ token: string; ageMs: number } | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const token = await redis.get<string>(REDIS_KEY);
      console.log("[token-store] Redis GET result:", token ? "found" : "null");
      if (!token) return null;
      return { token, ageMs: 0 };
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
