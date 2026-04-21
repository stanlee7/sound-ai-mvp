import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ error: "env vars missing", url: !!url, token: !!token });
  }

  try {
    const redis = new Redis({ url, token });
    await redis.set("debug:test", "ok", { ex: 10 });
    const val = await redis.get("debug:test");
    return NextResponse.json({ redis: "ok", testValue: val });
  } catch (e) {
    return NextResponse.json({ redis: "error", message: String(e) });
  }
}
