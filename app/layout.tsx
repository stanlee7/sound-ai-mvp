import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sound AI — AI 음악 자동 생성",
  description: "Groq AI로 한국어 가사를 생성하고 Suno로 MP3를 자동 제작합니다.",
  openGraph: {
    title: "Sound AI — AI 음악 자동 생성",
    description: "Groq AI 가사 + Suno MP3 자동 제작. 최대 10곡 동시 생성.",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
