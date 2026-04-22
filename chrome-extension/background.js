const DEFAULT_URL = "https://sound-ai-mvp.vercel.app";
const STUDIO = "https://studio-api.prod.suno.com";

let storedJwt = null;

function sunoHeaders(jwt) {
  return {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://suno.com",
    Referer: "https://suno.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // 토큰 수신 → 저장 + Vercel로 전송
  if (msg.type === "SUNO_TOKEN" && msg.token) {
    storedJwt = msg.token;

    chrome.storage.local.get(["serverUrl"], async (data) => {
      const base = (data.serverUrl || DEFAULT_URL).replace(/\/$/, "");
      const url = `${base}/api/suno/token`;
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: msg.token }),
        });
        if (resp.ok) {
          chrome.storage.local.set({ status: "connected", lastSync: Date.now(), lastUrl: url });
        } else {
          chrome.storage.local.set({ status: "server_error", lastUrl: url, lastCode: resp.status });
        }
      } catch (e) {
        chrome.storage.local.set({ status: "server_off", lastUrl: url, lastError: String(e) });
      }
    });
    return;
  }

  // 곡 생성 요청 → Suno API 직접 호출
  if (msg.type === "SUNO_GENERATE") {
    if (!storedJwt) {
      sendResponse({ error: "JWT 없음 — suno.com에서 곡을 재생해주세요" });
      return true;
    }
    const { payload, count } = msg;
    const calls = Math.ceil((count || 2) / 2);
    const allClipIds = [];

    (async () => {
      try {
        for (let i = 0; i < calls; i++) {
          if (i > 0) await new Promise((r) => setTimeout(r, 1000));
          const resp = await fetch(`${STUDIO}/api/generate/v2/`, {
            method: "POST",
            headers: sunoHeaders(storedJwt),
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            const body = await resp.text().catch(() => "");
            throw new Error(`Suno ${resp.status}: ${body}`);
          }
          const data = await resp.json();
          allClipIds.push(...data.clips.map((c) => c.id));
        }
        sendResponse({ clipIds: allClipIds.slice(0, count || 2) });
      } catch (e) {
        sendResponse({ error: String(e) });
      }
    })();
    return true;
  }

  // 상태 조회
  if (msg.type === "SUNO_STATUS") {
    if (!storedJwt) {
      sendResponse({ error: "JWT 없음" });
      return true;
    }
    (async () => {
      try {
        const resp = await fetch(`${STUDIO}/api/feed/v2?ids=${msg.ids}`, {
          headers: sunoHeaders(storedJwt),
        });
        const data = await resp.json();
        sendResponse({ data });
      } catch (e) {
        sendResponse({ error: String(e) });
      }
    })();
    return true;
  }
});
