// 페이지 컨텍스트에 인터셉터 주입 (isolated world 우회)
const script = document.createElement("script");
script.textContent = `
(function() {
  const _fetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      const url = typeof input === "string" ? input : (input instanceof Request ? input.url : String(input));
      if (url && url.includes("studio-api")) {
        let auth = null;
        if (init && init.headers) {
          const h = init.headers;
          auth = (h instanceof Headers) ? h.get("authorization") : (h["authorization"] || h["Authorization"]);
        } else if (input instanceof Request) {
          auth = input.headers.get("authorization");
        }
        if (auth && auth.startsWith("Bearer ")) {
          window.postMessage({ type: "SOUND_AI_TOKEN", token: auth.replace(/^Bearer\\s+/i, "") }, "*");
        }
      }
    } catch(e) {}
    return _fetch.apply(this, arguments);
  };
})();
`;
document.documentElement.prepend(script);
script.remove();

// 페이지에서 토큰 수신 → 백그라운드로 전달
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.type !== "SOUND_AI_TOKEN") return;
  chrome.runtime.sendMessage({ type: "SUNO_TOKEN", token: e.data.token });
});
