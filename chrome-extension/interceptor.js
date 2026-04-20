// MAIN world — window.fetch 직접 오버라이드
(function () {
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
          ? input.url
          : String(input);

      if (url.includes("studio-api")) {
        let auth = null;
        if (init?.headers) {
          const h = init.headers;
          auth =
            h instanceof Headers
              ? h.get("authorization")
              : h["authorization"] || h["Authorization"];
        } else if (input instanceof Request) {
          auth = input.headers.get("authorization");
        }
        if (auth?.startsWith("Bearer ")) {
          window.postMessage(
            { type: "SOUND_AI_TOKEN", token: auth.replace(/^Bearer\s+/i, "") },
            "*",
          );
        }
      }
    } catch (_) {}
    return _fetch.apply(this, arguments);
  };
})();
