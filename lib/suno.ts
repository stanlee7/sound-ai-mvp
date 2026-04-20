const STUDIO_BASE = "https://studio-api.prod.suno.com";

export interface SunoClip {
  id: string;
  status: "submitted" | "queued" | "streaming" | "complete" | "error";
  audio_url: string | null;
  video_url: string | null;
  image_url: string | null;
  title: string;
  metadata: {
    duration?: number;
    prompt?: string;
    tags?: string;
    error_message?: string;
  };
}

export class SunoClient {
  // __session 쿠키는 이미 Suno API용 JWT → 직접 Bearer로 사용
  constructor(private jwt: string) {}

  private async api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${STUDIO_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Suno API 오류 (${res.status}): ${body}`);
    }
    return res.json() as T;
  }

  async generate(opts: {
    prompt: string;
    tags: string;
    title: string;
    mv?: string;
    makeInstrumental?: boolean;
  }): Promise<{ clips: SunoClip[] }> {
    return this.api("/api/generate/v2/", {
      method: "POST",
      body: JSON.stringify({
        prompt: opts.prompt,
        tags: opts.tags,
        title: opts.title,
        mv: opts.mv ?? "chirp-v4",
        make_instrumental: opts.makeInstrumental ?? false,
        continue_clip_id: null,
        continue_at: null,
      }),
    });
  }

  async getClips(ids: string[]): Promise<{ clips: SunoClip[] }> {
    return this.api(`/api/feed/v2?ids=${ids.join(",")}`);
  }

  async getCredits(): Promise<{ total_credits_left: number }> {
    return this.api("/api/billing/info/");
  }
}
