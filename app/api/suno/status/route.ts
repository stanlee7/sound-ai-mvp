import { NextRequest, NextResponse } from "next/server";
import { SunoClient } from "@/lib/suno";
import { getToken } from "@/lib/token-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");

  if (!ids) {
    return NextResponse.json({ error: "ids 파라미터가 필요합니다." }, { status: 400 });
  }

  const stored = await getToken();
  if (!stored) {
    return NextResponse.json(
      { error: "Suno 토큰 만료. suno.com 페이지를 새로고침해주세요." },
      { status: 401 },
    );
  }

  try {
    const client = new SunoClient(stored.token);
    const result = await client.getClips(ids.split(","));
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
