import { NextRequest, NextResponse } from "next/server";
import { setToken, getToken } from "@/lib/token-store";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400, headers: CORS });
  await setToken(token);
  return NextResponse.json({ ok: true }, { headers: CORS });
}

export async function GET() {
  const data = await getToken();
  if (!data) return NextResponse.json({ connected: false }, { headers: CORS });
  return NextResponse.json(
    { connected: true, ageSec: Math.round(data.ageMs / 1000) },
    { headers: CORS },
  );
}
