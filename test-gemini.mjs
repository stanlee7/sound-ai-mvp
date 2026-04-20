// 실행: node test-gemini.mjs YOUR_API_KEY
import { GoogleGenAI } from "@google/genai";

const key = process.argv[2];
if (!key) { console.error("사용법: node test-gemini.mjs YOUR_API_KEY"); process.exit(1); }

const MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash-lite"];

for (const model of MODELS) {
  process.stdout.write(`테스트 중: ${model} ... `);
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const res = await ai.models.generateContent({
      model,
      contents: "안녕이라고만 대답해",
      config: { maxOutputTokens: 10 },
    });
    console.log(`✅ 성공 (${res.usageMetadata?.totalTokenCount ?? "?"}tokens)`);
    console.log(`  → 사용 가능 모델: ${model}`);
    break;
  } catch (e) {
    console.log(`❌ ${e.message?.slice(0, 80)}`);
  }
}
