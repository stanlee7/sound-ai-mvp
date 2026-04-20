import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SunoClient } from "@/lib/suno";
import { getToken } from "@/lib/token-store";

const Schema = z.object({
  lyrics: z.string().min(10),
  styleTags: z.string().min(3),
  title: z.string().min(1),
  model: z.enum(["chirp-v3-5", "chirp-v4", "chirp-v4-5", "chirp-v5"]).default("chirp-v4"),
  makeInstrumental: z.boolean().default(false),
  count: z.number().int().min(2).max(10).default(2),
});

const FRIENDLY_ERRORS: Record<string, string> = {
  "Token validation failed": "Suno 연결이 끊겼습니다. suno.com을 새로고침 후 다시 시도해주세요.",
  "Unauthorized": "Suno 인증이 만료됐습니다. suno.com을 새로고침해주세요.",
  "402": "Suno 크레딧이 부족합니다. suno.com에서 크레딧을 확인해주세요.",
  "429": "Suno 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
};

function friendlyError(msg: string): string {
  for (const [key, val] of Object.entries(FRIENDLY_ERRORS)) {
    if (msg.includes(key)) return val;
  }
  return msg;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값 오류: " + parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const stored = await getToken();
    if (!stored) {
      return NextResponse.json(
        { error: "Suno 토큰이 없습니다. suno.com을 새로고침 후 다시 시도해주세요." },
        { status: 401 },
      );
    }

    const { lyrics, styleTags, title, model, makeInstrumental, count } = parsed.data;
    const client = new SunoClient(stored.token);

    // Suno는 1회 호출당 2곡 생성 → count/2 회 호출
    const calls = Math.ceil(count / 2);
    const allClipIds: string[] = [];

    for (let i = 0; i < calls; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1000)); // 연속 호출 방지
      const result = await client.generate({ prompt: lyrics, tags: styleTags, title, mv: model, makeInstrumental });
      allClipIds.push(...result.clips.map((c) => c.id));
    }

    return NextResponse.json({ clipIds: allClipIds.slice(0, count) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: friendlyError(msg) }, { status: 500 });
  }
}
