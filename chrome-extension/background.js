const DEFAULT_URL = "https://sound-ai-mvp.vercel.app";

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "SUNO_TOKEN" || !msg.token) return;

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
        chrome.storage.local.set({ status: "server_error", lastSync: Date.now(), lastUrl: url, lastCode: resp.status });
      }
    } catch (e) {
      chrome.storage.local.set({ status: "server_off", lastUrl: url, lastError: String(e) });
    }
  });
});
