const DEFAULT_URL = "http://localhost:3000";

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "SUNO_TOKEN" || !msg.token) return;

  chrome.storage.local.get(["serverUrl"], async (data) => {
    const base = (data.serverUrl || DEFAULT_URL).replace(/\/$/, "");
    const url = `${base}/api/suno/token`;

    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: msg.token }),
      });
      chrome.storage.local.set({ status: "connected", lastSync: Date.now() });
    } catch {
      chrome.storage.local.set({ status: "server_off" });
    }
  });
});
