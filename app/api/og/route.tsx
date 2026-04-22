import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #0a0a0b 0%, #1c1917 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎵</div>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#f59e0b", marginBottom: 12 }}>
          Sound AI
        </div>
        <div style={{ fontSize: 28, color: "#a8a29e", marginBottom: 40 }}>
          AI 가사 생성 + Suno MP3 자동 제작
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            fontSize: 20,
            color: "#ededed",
          }}
        >
          <span style={{ background: "#1c1917", padding: "8px 20px", borderRadius: "8px", border: "1px solid #3f3f46" }}>✨ Groq AI 가사</span>
          <span style={{ background: "#1c1917", padding: "8px 20px", borderRadius: "8px", border: "1px solid #3f3f46" }}>🎸 Suno 연동</span>
          <span style={{ background: "#1c1917", padding: "8px 20px", borderRadius: "8px", border: "1px solid #3f3f46" }}>⚡ 최대 10곡</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
