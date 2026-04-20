const el = document.getElementById("status");
const urlInput = document.getElementById("serverUrl");
const saveBtn = document.getElementById("saveBtn");

// 저장된 서버 URL 불러오기
chrome.storage.local.get(["status", "lastSync", "serverUrl"], (data) => {
  urlInput.value = data.serverUrl || "http://localhost:3000";

  const { status, lastSync } = data;
  if (status === "connected" && lastSync) {
    const ago = Math.round((Date.now() - lastSync) / 1000);
    el.className = "status connected";
    el.innerHTML = `✅ 연결됨<div class="ago">${ago}초 전 동기화</div>`;
  } else if (status === "server_off") {
    el.className = "status server_off";
    el.textContent = "❌ 서버 응답 없음 — URL 확인";
  } else {
    el.className = "status waiting";
    el.textContent = "⏳ suno.com에서 곡을 재생해주세요";
  }
});

saveBtn.addEventListener("click", () => {
  const url = urlInput.value.trim().replace(/\/$/, "");
  chrome.storage.local.set({ serverUrl: url }, () => {
    saveBtn.textContent = "✓ 저장됨";
    setTimeout(() => (saveBtn.textContent = "저장"), 1500);
  });
});
