import Groq from "groq-sdk";
import { SYSTEM_PROMPT, buildLyricsPrompt } from "./prompts";

const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

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

async function callGroq(
  client: Groq,
  model: string,
  theme: string,
  genre: string,
) {
  return client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildLyricsPrompt(theme, genre) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.9,
    max_tokens: 2000,
  });
}

export async function generateLyrics(
  theme: string,
  genre: string,
  apiKey?: string,
): Promise<GeneratedSong> {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) throw new Error("Groq API 키가 필요합니다.");
  const client = new Groq({ apiKey: key });

  let response;
  try {
    response = await callGroq(client, PRIMARY_MODEL, theme, genre);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("429") || msg.includes("503") || msg.includes("rate_limit")) {
      await new Promise((r) => setTimeout(r, 1500));
      response = await callGroq(client, FALLBACK_MODEL, theme, genre);
    } else {
      throw e;
    }
  }

  const text = response.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(text);

  return {
    title: parsed.title,
    lyrics: parsed.lyrics,
    style_tags: parsed.style_tags,
    mood: parsed.mood,
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    },
  };
}
