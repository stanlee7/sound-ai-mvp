# Sound AI MVP — v0

Gemini 기반 Suno 자동화 서비스의 **최소 프로토타입**.
테마+장르만 입력하면 가사·제목·스타일 태그가 JSON으로 돌아옵니다.

## 바로 실행하기

```bash
# 1. 의존성 설치
npm install

# 2. API 키 설정
cp .env.local.example .env.local
# 에디터로 열어서 GEMINI_API_KEY 입력
# https://aistudio.google.com/apikey 에서 발급

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 열기.

## 프로젝트 구조

```
sound-ai-mvp/
├── app/
│   ├── actions/generate.ts   # Server Action (Gemini 호출)
│   ├── layout.tsx
│   ├── page.tsx              # UI (테마·장르 → 가사)
│   └── globals.css
├── lib/
│   ├── gemini.ts             # Gemini SDK 래퍼
│   └── prompts.ts            # 한국어 가사 프롬프트 템플릿
└── docs/
    └── suno-api.md           # Suno 비공식 API 레퍼런스 (v0.5용)
```

## 다음 단계 (v0.5)

현재 버전은 가사까지만 생성. 실제 Suno에서 MP3를 받으려면:

1. `docs/suno-api.md` 참고
2. 쿠키 입력 UI 추가
3. `/api/suno/generate` 라우트에서 Suno 호출
4. 30초 폴링 + 오디오 플레이어 렌더링

## 비용 (Gemini 2.5 Flash)

- 입력: $0.30 / 1M tokens
- 출력: $2.50 / 1M tokens
- 1곡 예상 비용: 약 **₩10~15** (가사만) / **₩30~40** (풀 파이프라인)

* flash-lite 모델 사용 시 50% 절감 가능 (`.env.local`에서 `GEMINI_MODEL=gemini-2.5-flash-lite`)
