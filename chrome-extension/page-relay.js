// Sound AI 웹페이지 ↔ 백그라운드 브릿지 (ISOLATED world)
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data?.type) return;

  if (e.data.type === "SOUND_AI_GENERATE") {
    const { reqId, payload, count } = e.data;
    chrome.runtime.sendMessage({ type: "SUNO_GENERATE", payload, count }, (resp) => {
      window.postMessage({ type: "SOUND_AI_GENERATE_RESULT", reqId, ...(resp || { error: "Extension no response" }) }, "*");
    });
  }

  if (e.data.type === "SOUND_AI_STATUS") {
    const { reqId, ids } = e.data;
    chrome.runtime.sendMessage({ type: "SUNO_STATUS", ids }, (resp) => {
      window.postMessage({ type: "SOUND_AI_STATUS_RESULT", reqId, ...(resp || { error: "Extension no response" }) }, "*");
    });
  }
});
