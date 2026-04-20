// ISOLATED world — postMessage 수신 후 background로 전달
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.type !== "SOUND_AI_TOKEN") return;
  chrome.runtime.sendMessage({ type: "SUNO_TOKEN", token: e.data.token });
});
