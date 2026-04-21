import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sound AI MVP",
  description: "Groq AI 기반 Suno 자동 가사 생성 MVP",
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
