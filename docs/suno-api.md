# Suno 비공식 API 호출 레퍼런스 (v0.5용)

> ⚠️ **주의**: Suno는 공식 공개 API를 제공하지 않습니다.
> 아래는 브라우저가 `suno.com`과 통신하는 내부 엔드포인트이며,
> 언제든 변경될 수 있고 **본인 계정에만** 사용해야 합니다.

## 1. 인증 구조 (Clerk 기반)

Suno는 Clerk를 인증 서비스로 사용합니다. 흐름:

```
[브라우저] suno.com 로그인
     ↓ (Clerk가 __session 쿠키 설정)
[앱] Clerk에서 단기 JWT 요청
     ↓
[앱] studio-api에 Bearer 토큰으로 호출
```

### 필요한 두 가지 정보
1. **`__session` 쿠키** — suno.com 도메인에 저장됨
2. **`session_id`** — Clerk 세션 ID (`/v1/client` 응답에서 획득)

## 2. JWT 토큰 발급

```http
POST https://clerk.suno.com/v1/client/sessions/{SESSION_ID}/tokens?_clerk_js_version=5.35.1
Cookie: __session={SESSION_COOKIE}
Content-Type: application/x-www-form-urlencoded
```

**응답**:
```json
{ "jwt": "eyJhbGci..." }
```

이 JWT는 약 **60초**만 유효 → 매 호출마다 갱신 필요.

## 3. 곡 생성

```http
POST https://studio-api.prod.suno.com/api/generate/v2/
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "prompt": "[Verse 1]\n가사...\n[Chorus]\n...",
  "tags": "korean ballad, piano, emotional, female vocal",
  "title": "새벽의 한강",
  "mv": "chirp-v4",
  "continue_clip_id": null,
  "continue_at": null,
  "make_instrumental": false
}
```

**응답** (2곡 동시 생성):
```json
{
  "clips": [
    { "id": "abc-123", "status": "submitted", ... },
    { "id": "def-456", "status": "submitted", ... }
  ]
}
```

### 모델 옵션 (`mv`)
| 값 | 설명 |
|---|---|
| `chirp-v3-5` | V3.5 (빠름) |
| `chirp-v4` | V4 (기본) |
| `chirp-v4-5` | V4.5 (고품질) |
| `chirp-v5` | V5 (최신) |

## 4. 진행 상태 폴링

```http
GET https://studio-api.prod.suno.com/api/feed/v2?ids={CLIP_ID_1},{CLIP_ID_2}
Authorization: Bearer {JWT}
```

**응답**:
```json
{
  "clips": [{
    "id": "abc-123",
    "status": "streaming" | "complete" | "error",
    "audio_url": "https://cdn1.suno.ai/abc-123.mp3",
    "video_url": "https://cdn1.suno.ai/abc-123.mp4",
    "image_url": "https://cdn2.suno.ai/image_abc-123.jpeg",
    "metadata": { "duration": 193.2, "prompt": "...", "tags": "..." }
  }]
}
```

**권장 폴링 패턴**: 15~30초 간격, 최대 3~5분 대기.
- `streaming`: 일부 미리듣기 가능 (audio_url이 준비됨)
- `complete`: 전체 생성 완료
- `error`: 실패 (fail_reason 포함)

## 5. 크레딧 조회

```http
GET https://studio-api.prod.suno.com/api/billing/info/
Authorization: Bearer {JWT}
```

응답에서 `total_credits_left` 확인 (1곡 = 10 credits 소모).

## 6. Node.js 클라이언트 예시

```ts
// lib/suno.ts
export class SunoClient {
  private jwt: string | null = null;
  private jwtExpiresAt = 0;

  constructor(
    private sessionCookie: string,
    private sessionId: string,
  ) {}

  private async refreshJwt() {
    if (Date.now() < this.jwtExpiresAt - 5000) return;

    const res = await fetch(
      `https://clerk.suno.com/v1/client/sessions/${this.sessionId}/tokens?_clerk_js_version=5.35.1`,
      {
        method: "POST",
        headers: {
          Cookie: `__session=${this.sessionCookie}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const { jwt } = await res.json();
    this.jwt = jwt;
    this.jwtExpiresAt = Date.now() + 55_000;
  }

  private async api(path: string, init?: RequestInit) {
    await this.refreshJwt();
    const res = await fetch(`https://studio-api.prod.suno.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`Suno ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async generate(opts: {
    prompt: string;      // 가사 (섹션 태그 포함)
    tags: string;        // 스타일 태그 (쉼표 구분)
    title: string;
    mv?: string;
    makeInstrumental?: boolean;
  }) {
    return this.api("/api/generate/v2/", {
      method: "POST",
      body: JSON.stringify({
        prompt: opts.prompt,
        tags: opts.tags,
        title: opts.title,
        mv: opts.mv ?? "chirp-v4",
        make_instrumental: opts.makeInstrumental ?? false,
        continue_clip_id: null,
        continue_at: null,
      }),
    });
  }

  async getClips(ids: string[]) {
    return this.api(`/api/feed/v2?ids=${ids.join(",")}`);
  }

  async waitForClips(ids: string[], timeoutMs = 5 * 60_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const { clips } = await this.getClips(ids);
      if (clips.every((c: any) => c.status === "complete" || c.status === "error")) {
        return clips;
      }
      await new Promise((r) => setTimeout(r, 20_000));
    }
    throw new Error("Suno generation timeout");
  }
}
```

## 7. 쿠키 수동 추출 방법 (v0.5 UI 안내용)

사용자에게 안내할 스텝:

1. Chrome에서 https://suno.com 로그인
2. F12 (개발자 도구) → **Application** 탭
3. 왼쪽 **Cookies → https://suno.com** 선택
4. `__session` 쿠키 Value 복사
5. **Network** 탭에서 `/v1/client` 요청 찾아 응답 JSON에서 `id` 필드가 session_id

## 8. 주의사항 & 레이트 리밋

| 항목 | 제한 |
|---|---|
| 동시 생성 | **계정당 10곡** (Pro 플랜 기준) |
| 일일 크레딧 | 플랜별 다름 (Basic 50곡, Pro 500곡 등) |
| API 호출 빈도 | 과도한 호출 시 IP/계정 차단 가능 |
| JWT 유효 시간 | 약 60초 |
| 쿠키 유효 시간 | 약 7일 (재로그인 필요) |

**지켜야 할 것**:
- 동일 계정에 병렬 요청 3개 이하 권장
- 폴링 간격은 최소 15초
- 에러 시 exponential backoff (2s → 4s → 8s)
- 사용자에게 "본인 Suno 계정 약관 책임" 명시

## 9. 공식 API 대안 (2025 이후)

Suno는 2025년 하반기부터 **공식 Developer API**를 제한적으로 제공 중입니다.
- https://suno.com/developer-api
- 월 구독료 + 사용량 과금
- ToS 위반 위험 제거

프로덕션 오픈 시 **공식 API로 마이그레이션** 고려 권장.

## 10. 참고 오픈소스 래퍼

- [gcui-art/suno-api](https://github.com/gcui-art/suno-api) — Node.js 래퍼
- [SunoAI-API/Suno-API](https://github.com/SunoAI-API/Suno-API) — Python FastAPI 버전

이들 코드를 참고하면 구현이 빠릅니다. (단, 라이선스 및 최신 엔드포인트 반영 여부 확인 필수)
