import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const REDIS_KEY = "suno:token";

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ error: "env vars missing", url: !!url, token: !!token });
  }

  try {
    const redis = new Redis({ url, token });

    // 현재 저장된 토큰 확인
    const stored = await redis.get<string>(REDIS_KEY);
    const ttl = await redis.ttl(REDIS_KEY);

    return NextResponse.json({
      redis: "ok",
      tokenStored: !!stored,
      tokenPreview: stored ? stored.slice(0, 20) + "..." : null,
      ttlSeconds: ttl,
    });
  } catch (e) {
    return NextResponse.json({ redis: "error", message: String(e) });
  }
}
