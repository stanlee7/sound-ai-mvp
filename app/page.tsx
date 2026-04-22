"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { generateSongAction, type GenerateResult } from "./actions/generate";
import type { SunoClip } from "@/lib/suno";

const GENRES = [
  "K-Pop", "발라드", "힙합", "R&B", "락", "포크", "재즈",
  "일렉트로닉", "Lo-fi", "트로트", "인디", "OST",
];

const SUNO_MODELS = [
  { value: "chirp-v4", label: "V4 (기본 · 추천)" },
  { value: "chirp-v4-5", label: "V4.5 (고품질)" },
  { value: "chirp-v5", label: "V5 (최신 · Pro 플랜 필요)" },
  { value: "chirp-v3-5", label: "V3.5 (빠름)" },
];

const COUNT_OPTIONS = [
  { value: 2, label: "2곡", credits: 20 },
  { value: 4, label: "4곡", credits: 40 },
  { value: 6, label: "6곡", credits: 60 },
  { value: 10, label: "10곡", credits: 100 },
];

const TOKEN_TTL = 300;

type SunoStatus = "idle" | "generating" | "done" | "error";
type ExtStatus = "checking" | "connected" | "expiring" | "expired" | "disconnected";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs text-[var(--muted)] hover:text-[var(--accent)] transition ml-2"
    >
      {copied ? "✓ 복사됨" : "복사"}
    </button>
  );
}

export default function Home() {
  // ① Groq API 키 — localStorage 유지
  const [apiKey, setApiKey] = useState("");
  useEffect(() => {
    const saved = localStorage.getItem("groq_api_key");
    if (saved) setApiKey(saved);
  }, []);
  const handleApiKeyChange = (v: string) => {
    setApiKey(v);
    localStorage.setItem("groq_api_key", v);
  };

  // Step 1
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // ② 확장 연결 상태 + 카운트다운
  const [extStatus, setExtStatus] = useState<ExtStatus>("checking");
  const [tokenAge, setTokenAge] = useState<number | null>(null);
  const tokenRemaining = tokenAge != null ? Math.max(0, TOKEN_TTL - tokenAge) : null;

  // Step 2
  const [sunoModel, setSunoModel] = useState("chirp-v4");
  const [songCount, setSongCount] = useState(2);
  const [sunoStatus, setSunoStatus] = useState<SunoStatus>("idle");
  const [sunoError, setSunoError] = useState("");
  const [clips, setClips] = useState<SunoClip[]>([]);
  const [pollProgress, setPollProgress] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // 확장 연결 상태 폴링 (2초)
  const checkToken = useCallback(async () => {
    try {
      const res = await fetch("/api/suno/token");
      const data = await res.json();
      if (!data.connected) {
        setExtStatus("disconnected");
        setTokenAge(null);
      } else {
        setTokenAge(data.ageSec);
        const remaining = TOKEN_TTL - data.ageSec;
        if (remaining <= 0) setExtStatus("expired");
        else if (remaining <= 15) setExtStatus("expiring");
        else setExtStatus("connected");
      }
    } catch {
      setExtStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    checkToken();
    const id = setInterval(checkToken, 2000);
    // 탭이 다시 활성화될 때 즉시 확인 (백그라운드 일시중단 해결)
    const onVisible = () => { if (document.visibilityState === "visible") checkToken(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [checkToken]);

  const handleLyricsSubmit = (formData: FormData) => {
    setResult(null);
    setClips([]);
    setSunoStatus("idle");
    setSunoError("");
    startTransition(async () => {
      const res = await generateSongAction(formData);
      setResult(res);
    });
  };

  const startPolling = (ids: string[]) => {
    let elapsed = 0;
    const INTERVAL = 15_000;
    const MAX = 5 * 60_000;

    pollRef.current = setInterval(async () => {
      elapsed += INTERVAL;
      setPollProgress(Math.min(90, (elapsed / MAX) * 100));
      try {
        const res = await fetch(`/api/suno/status?ids=${ids.join(",")}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const allClips: SunoClip[] = data.clips;
        const allDone = allClips.every((c) => c.status === "complete" || c.status === "error");
        if (allDone || elapsed >= MAX) {
          clearInterval(pollRef.current!);
          setPollProgress(100);
          const done = allClips.filter((c) => c.status === "complete");
          setClips(done);
          setSunoStatus(done.length > 0 ? "done" : "error");
          if (done.length === 0) setSunoError("생성 실패. Suno 크레딧을 확인해주세요.");
        }
      } catch (e) {
        clearInterval(pollRef.current!);
        setSunoStatus("error");
        setSunoError(e instanceof Error ? e.message : "폴링 오류");
      }
    }, INTERVAL);
  };

  const handleSunoGenerate = async () => {
    if (!result?.ok) return;
    if (extStatus === "disconnected" || extStatus === "expired") {
      setSunoError("Suno 연결이 끊겼습니다. suno.com을 새로고침해주세요.");
      return;
    }
    setSunoStatus("generating");
    setSunoError("");
    setPollProgress(5);
    setClips([]);
    try {
      const res = await fetch("/api/suno/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics: result.data.lyrics,
          styleTags: result.data.style_tags,
          title: result.data.title,
          model: sunoModel,
          makeInstrumental: false,
          count: songCount,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      startPolling(data.clipIds);
    } catch (e) {
      setSunoStatus("error");
      setSunoError(e instanceof Error ? e.message : "생성 요청 실패");
    }
  };

  const isConnected = extStatus === "connected" || extStatus === "expiring";

  // 연결 상태 UI 색상/문구
  const extUI = {
    connected: { bg: "bg-green-950/40 border-green-800/40", text: "text-green-300" },
    expiring:  { bg: "bg-yellow-950/40 border-yellow-800/40", text: "text-yellow-300" },
    expired:   { bg: "bg-red-950/40 border-red-800/40", text: "text-red-300" },
    disconnected: { bg: "bg-zinc-900/60 border-zinc-700", text: "text-zinc-300" },
    checking:  { bg: "bg-zinc-900/60 border-zinc-700", text: "text-zinc-400" },
  }[extStatus];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">🎵 Sound AI MVP</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Groq (Llama 3.3) 가사 생성 → Suno MP3 변환
        </p>
      </header>

      {/* ─── STEP 1: 가사 생성 ─── */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--accent)]">STEP 1 — 가사 생성</h2>
        <form action={handleLyricsSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Groq API 키
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
                className="ml-2 text-xs text-[var(--accent)] hover:underline">
                무료 발급 →
              </a>
            </label>
            <input
              type="password"
              name="apiKey"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-4 py-3 text-sm font-mono focus:border-[var(--accent)] focus:outline-none"
            />
            {apiKey && <p className="mt-1 text-xs text-green-500">✓ 저장됨 (재접속 시 자동 입력)</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">테마</label>
            <textarea name="theme" required rows={3}
              placeholder="예: 새벽 한강, 이별 후의 담담함, 카페에서 떠오른 옛사랑"
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">장르</label>
            <select name="genre" defaultValue="발라드"
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none">
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <button type="submit" disabled={isPending}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-50">
            {isPending ? "생성 중..." : "① 가사 생성"}
          </button>
        </form>

        {result && !result.ok && <p className="mt-4 text-red-400 text-sm">❌ {result.error}</p>}
        {result?.ok && (
          <div className="mt-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="font-bold text-lg">{result.data.title}</p>
              <span className="text-xs text-[var(--muted)]">
                {result.data.usage.total_tokens} tokens · ≈ ₩{result.cost_krw}
              </span>
            </div>
            <div>
              <div className="flex items-center mb-1">
                <p className="text-xs font-semibold text-[var(--muted)]">Style Tags</p>
                <CopyButton text={result.data.style_tags} />
              </div>
              <code className="block rounded bg-black/40 p-2 text-xs break-all">{result.data.style_tags}</code>
            </div>
            <div>
              <div className="flex items-center mb-1">
                <p className="text-xs font-semibold text-[var(--muted)]">가사</p>
                <CopyButton text={result.data.lyrics} />
              </div>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-black/40 p-4 text-sm leading-relaxed">
                {result.data.lyrics}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* ─── STEP 2: Suno 연동 ─── */}
      {result?.ok && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--accent)]">STEP 2 — Suno MP3 생성</h2>

          {/* ② 확장 연결 상태 */}
          <div className={`mb-5 rounded-lg border p-4 ${extUI.bg} ${extUI.text}`}>
            {extStatus === "checking" && (
              <p className="text-sm">⏳ 연결 확인 중...</p>
            )}

            {extStatus === "connected" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">✅ Suno 연결됨 — 곡 생성 가능</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-black/30">
                  <div className="h-1.5 rounded-full bg-green-400 transition-all"
                    style={{ width: `${((tokenRemaining ?? 0) / TOKEN_TTL) * 100}%` }} />
                </div>
                <p className="text-xs opacity-60 mt-1">토큰 유효 · {tokenRemaining}초 남음</p>
              </div>
            )}

            {extStatus === "expiring" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">⚠️ 곧 만료 — 지금 생성하세요</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-black/30">
                  <div className="h-1.5 rounded-full bg-yellow-400 transition-all"
                    style={{ width: `${((tokenRemaining ?? 0) / TOKEN_TTL) * 100}%` }} />
                </div>
                <p className="text-xs opacity-60 mt-1">{tokenRemaining}초 후 만료 · suno.com에서 곡을 재생하면 자동 갱신</p>
              </div>
            )}

            {extStatus === "expired" && (
              <div>
                <p className="font-semibold mb-1">⏰ 토큰 만료 — 재연결 필요</p>
                <p className="text-xs opacity-80 mb-3">suno.com에서 아무 곡이나 재생하면 자동으로 재연결됩니다.</p>
                <a href="https://suno.com" target="_blank" rel="noreferrer"
                  className="inline-block rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold transition">
                  🔗 suno.com 열기 →
                </a>
              </div>
            )}

            {extStatus === "disconnected" && (
              <div>
                <p className="font-semibold mb-2">🔌 Suno 미연결</p>
                <ol className="text-xs space-y-1.5 opacity-80 list-decimal list-inside mb-3">
                  <li>
                    <a href="/install" target="_blank" rel="noreferrer" className="underline text-amber-300">
                      Sound AI Connector 확장 설치
                    </a>
                    {" "}(처음 사용 시)
                  </li>
                  <li>확장 팝업에서 이 페이지 URL 저장</li>
                  <li>suno.com 접속 후 아무 곡이나 재생</li>
                  <li>이 페이지로 돌아오면 자동 연결</li>
                </ol>
                <a href="https://suno.com" target="_blank" rel="noreferrer"
                  className="inline-block rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold transition">
                  🔗 suno.com 열기 →
                </a>
              </div>
            )}
          </div>

          {/* ③ 곡 수 + 모델 선택 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">생성 곡 수</label>
              <div className="grid grid-cols-4 gap-2">
                {COUNT_OPTIONS.map((o) => (
                  <button key={o.value} type="button"
                    onClick={() => setSongCount(o.value)}
                    className={`rounded-lg border py-2 text-sm font-semibold transition ${
                      songCount === o.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
                        : "border-[var(--border)] hover:border-zinc-500"
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                크레딧 {COUNT_OPTIONS.find(o => o.value === songCount)?.credits}개 소모
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Suno 모델</label>
              <select value={sunoModel} onChange={(e) => setSunoModel(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none">
                {SUNO_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <button onClick={handleSunoGenerate}
            disabled={sunoStatus === "generating" || !isConnected}
            className="w-full rounded-lg border border-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-black disabled:opacity-40">
            {sunoStatus === "generating"
              ? `생성 중... (${songCount}곡)`
              : `② ${songCount}곡 생성 (크레딧 ${COUNT_OPTIONS.find(o => o.value === songCount)?.credits}개)`}
          </button>

          {sunoStatus === "generating" && (
            <div className="mt-3 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-[var(--border)]">
                <div className="h-1.5 rounded-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${pollProgress}%` }} />
              </div>
              <p className="text-xs text-[var(--muted)] text-center">
                Suno 생성 중... 보통 1~3분 소요 ({Math.round(pollProgress)}%)
              </p>
            </div>
          )}

          {sunoStatus === "error" && (
            <div className="mt-3 rounded-lg bg-red-950/30 border border-red-800/40 p-3">
              <p className="text-red-400 text-sm">❌ {sunoError}</p>
              <button onClick={handleSunoGenerate}
                className="mt-2 text-xs text-red-300 hover:text-red-100 underline">
                다시 시도
              </button>
            </div>
          )}
        </section>
      )}

      {/* ─── STEP 3: 결과 ─── */}
      {clips.length > 0 && (
        <section className="rounded-xl border border-green-800/40 bg-green-950/20 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-green-400">✅ 생성 완료 — {clips.length}곡</h2>
          {clips.map((clip) => (
            <div key={clip.id} className="rounded-lg border border-[var(--border)] bg-black/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {clip.image_url && (
                  <img src={clip.image_url} alt="cover" className="h-14 w-14 rounded-lg object-cover" />
                )}
                <div>
                  <p className="font-semibold">{clip.title || (result?.ok ? result.data.title : "")}</p>
                  {clip.metadata.duration && (
                    <p className="text-xs text-[var(--muted)]">{Math.round(clip.metadata.duration)}초</p>
                  )}
                </div>
              </div>
              {clip.audio_url && (
                <audio controls src={clip.audio_url} className="w-full" style={{ height: 36 }} />
              )}
              {clip.audio_url && (
                <a href={clip.audio_url} download
                  className="inline-block text-xs text-[var(--accent)] hover:underline">
                  ⬇ MP3 다운로드
                </a>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
