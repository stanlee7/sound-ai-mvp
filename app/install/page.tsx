export default function InstallPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-[#ededed] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-amber-400 mb-2">🔌 크롬 확장프로그램 설치 가이드</h1>
        <p className="text-stone-400 mb-8 text-sm">Sound AI를 사용하려면 Suno 계정 연동을 위한 크롬 확장프로그램이 필요합니다.</p>

        {/* Step 1 */}
        <Step num={1} title="확장프로그램 파일 다운로드">
          <p>아래 버튼을 눌러 확장프로그램 ZIP 파일을 다운로드합니다.</p>
          <a
            href="/sound-ai-extension.zip"
            className="inline-block mt-3 px-4 py-2 bg-amber-400 text-black text-sm font-semibold rounded-lg hover:opacity-90"
          >
            ⬇ 확장프로그램 다운로드
          </a>
          <p className="text-stone-500 text-xs mt-2">
            다운로드 후 ZIP을 원하는 폴더에 <strong>압축 해제</strong>해 주세요.
          </p>
        </Step>

        {/* Step 2 */}
        <Step num={2} title="크롬 확장프로그램 관리 페이지 열기">
          <p>Chrome 주소창에 아래 주소를 입력하거나 복사해서 이동합니다:</p>
          <code className="block mt-2 bg-[#1c1917] px-3 py-2 rounded text-amber-300 text-sm font-mono select-all">
            chrome://extensions
          </code>
          <p className="text-stone-500 text-xs mt-2">또는 Chrome 메뉴 → 도구 더보기 → 확장프로그램</p>
        </Step>

        {/* Step 3 */}
        <Step num={3} title="개발자 모드 켜기">
          <p>확장프로그램 페이지 오른쪽 상단의 <strong className="text-amber-300">개발자 모드</strong> 토글을 켜세요.</p>
          <div className="mt-3 bg-[#1c1917] rounded-lg p-4 text-sm text-stone-300">
            <span className="text-stone-500">오른쪽 상단 →</span>{" "}
            <span className="bg-[#2a2a2e] px-2 py-0.5 rounded border border-zinc-600">개발자 모드 ●</span>
          </div>
        </Step>

        {/* Step 4 */}
        <Step num={4} title="압축 해제된 확장프로그램 로드">
          <p>
            <strong className="text-amber-300">압축해제된 확장 프로그램을 로드합니다</strong> 버튼을 누르고,
            1단계에서 압축 해제한 폴더를 선택합니다.
          </p>
          <p className="text-stone-500 text-xs mt-2">
            폴더 안에 <code className="text-amber-300">manifest.json</code> 파일이 있는 폴더를 선택해야 합니다.
          </p>
        </Step>

        {/* Step 5 */}
        <Step num={5} title="서버 URL 설정">
          <p>
            크롬 우측 상단 퍼즐 아이콘 → <strong className="text-amber-300">Sound AI Connector</strong>를 클릭하여
            팝업을 엽니다.
          </p>
          <p className="mt-2">서버 URL 입력란에 이 사이트 주소를 입력하고 저장합니다:</p>
          <code className="block mt-2 bg-[#1c1917] px-3 py-2 rounded text-amber-300 text-sm font-mono break-all select-all">
            {process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app"}
          </code>
        </Step>

        {/* Step 6 */}
        <Step num={6} title="Suno 연동하기">
          <ol className="list-decimal list-inside space-y-1 text-sm text-stone-300">
            <li>
              <a href="https://suno.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">
                suno.com
              </a>에 로그인합니다
            </li>
            <li>아무 곡이나 재생합니다 (재생 버튼 클릭)</li>
            <li>이 페이지로 돌아와서 상단의 연결 상태가 <span className="text-green-400">✅ 연결됨</span>으로 바뀌는지 확인합니다</li>
          </ol>
          <div className="mt-4 bg-amber-900/20 border border-amber-800 rounded-lg p-3 text-xs text-amber-300">
            ⚠ Suno 토큰은 약 60초마다 갱신됩니다. 연결이 끊기면 suno.com에서 곡을 다시 재생하면 자동으로 재연결됩니다.
          </div>
        </Step>

        <div className="mt-8 text-center">
          <a href="/" className="text-amber-400 text-sm hover:underline">← 메인으로 돌아가기</a>
        </div>
      </div>
    </main>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-7 h-7 rounded-full bg-amber-400 text-black text-sm font-bold flex items-center justify-center flex-shrink-0">
          {num}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="ml-10 text-sm text-stone-300 space-y-1">{children}</div>
    </div>
  );
}
