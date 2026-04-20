import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT, buildLyricsPrompt } from "./prompts";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const FALLBACK_MODEL = "gemini-1.5-flash-8b";

export interface GeneratedSong {
  title: string;
  lyrics: string;
  style_tags: string;
  mood: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

async function callGemini(
  ai: GoogleGenAI,
  model: string,
  theme: string,
  genre: string,
) {
  return ai.models.generateContent({
    model,
    contents: buildLyricsPrompt(theme, genre),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          lyrics: { type: Type.STRING },
          style_tags: { type: Type.STRING },
          mood: { type: Type.STRING },
        },
        required: ["title", "lyrics", "style_tags", "mood"],
      },
      temperature: 0.9,
    },
  });
}

export async function generateLyrics(
  theme: string,
  genre: string,
  apiKey?: string,
): Promise<GeneratedSong> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API 키가 필요합니다.");
  const ai = new GoogleGenAI({ apiKey: key });

  let response;
  try {
    // 1차 시도: 기본 모델
    response = await callGemini(ai, DEFAULT_MODEL, theme, genre);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    // 503 과부하 시 fallback 모델로 재시도
    if (msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("overloaded")) {
      await new Promise((r) => setTimeout(r, 1500));
      response = await callGemini(ai, FALLBACK_MODEL, theme, genre);
    } else {
      throw e;
    }
  }

  const text = response.text ?? "";
  const parsed = JSON.parse(text);

  return {
    title: parsed.title,
    lyrics: parsed.lyrics,
    style_tags: parsed.style_tags,
    mood: parsed.mood,
    usage: {
      input_tokens: response.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: response.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}
