"use server";

import { z } from "zod";
import { generateLyrics, type GeneratedSong } from "@/lib/llm";

const InputSchema = z.object({
  theme: z.string().min(2).max(200),
  genre: z.string().min(2).max(50),
  apiKey: z.string().optional(),
});

export type GenerateResult =
  | { ok: true; data: GeneratedSong; cost_krw: number }
  | { ok: false; error: string };

// Groq 무료 티어 = $0, 유료 단가: 입력 $0.59/1M, 출력 $0.79/1M (llama-3.3-70b)
const PRICE_INPUT_PER_1M = 0.59 * 1350;
const PRICE_OUTPUT_PER_1M = 0.79 * 1350;

export async function generateSongAction(
  formData: FormData,
): Promise<GenerateResult> {
  try {
    const parsed = InputSchema.safeParse({
      theme: formData.get("theme"),
      genre: formData.get("genre"),
      apiKey: formData.get("apiKey") || undefined,
    });

    if (!parsed.success) {
      return { ok: false, error: "입력값이 올바르지 않습니다." };
    }

    const result = await generateLyrics(
      parsed.data.theme,
      parsed.data.genre,
      parsed.data.apiKey,
    );

    const inputCost = (result.usage.input_tokens / 1_000_000) * PRICE_INPUT_PER_1M;
    const outputCost = (result.usage.output_tokens / 1_000_000) * PRICE_OUTPUT_PER_1M;
    const cost_krw = Math.round((inputCost + outputCost) * 100) / 100;

    return { ok: true, data: result, cost_krw };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { ok: false, error: msg };
  }
}
