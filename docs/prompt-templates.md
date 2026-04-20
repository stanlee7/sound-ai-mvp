# Gemini 프롬프트 템플릿 (한국어 가사 최적화)

`lib/prompts.ts`에 들어간 기본 템플릿의 **이유·변형·실전 팁**을 정리한 문서.
프롬프트는 곡 품질의 70%를 결정합니다. 여기부터 튜닝하세요.

## 1. 왜 이 구조인가

Suno가 "좋은 곡"을 만들려면 **프롬프트 필드 3개**가 정확해야 합니다:

| Suno 입력 | 우리가 Gemini에게 만들게 할 것 |
|---|---|
| `prompt` (가사) | **섹션 태그** 포함 구조화된 가사 |
| `tags` (스타일) | **영문 쉼표 구분** 5~8개 키워드 |
| `title` (제목) | 한국어 12자 이내 |

Gemini에 "가사 써줘" 하면 줄글로 주기 때문에 Suno가 파싱을 못 합니다.
**반드시 JSON 스키마로 강제**해야 프로덕션에서 안정적입니다.

## 2. System Prompt 설계 원칙

**좋은 System Prompt = 가드레일 + 예시 + 출력형식**

```
✅ 좋은 예
- "각 섹션은 반드시 [Verse 1] [Chorus] 같은 영문 태그로 구분"
- "한 줄은 8~14자, 한 섹션은 4~8줄"
- "진부한 클리셰 금지"

❌ 나쁜 예
- "예쁜 가사 써줘"
- "K-pop 느낌으로"
```

Gemini는 **수치화된 제약**을 훨씬 잘 따릅니다.

## 3. Suno 섹션 태그 (영문 필수)

Suno가 인식하는 태그:

```
[Intro]           도입부 (8~16초)
[Verse 1]         1절
[Pre-Chorus]      후렴 전 빌드업
[Chorus]          후렴 (가장 중독적)
[Verse 2]         2절
[Bridge]          다리 (3절 또는 전환부)
[Outro]           마무리
[Instrumental]    연주 파트
[Guitar Solo]     기타 솔로
```

**팁**: Suno V4 이후는 `[Chorus]` 안에 `[Female Vocal]` 같은 메타태그도 인식합니다.

## 4. 장르별 Style Tags 사전 (영문)

Gemini에 장르만 넘기면 일반적인 태그가 나옵니다. 고품질을 원하면
**장르별 템플릿 예시**를 System Prompt에 포함시키세요.

```typescript
export const GENRE_STYLE_HINTS = {
  "발라드": "korean ballad, piano, emotional, female vocal, slow tempo, melancholic",
  "K-Pop": "korean pop, upbeat, synth, catchy hook, female group, 2020s kpop",
  "힙합": "korean hiphop, trap beat, 808, rap verse, dark, moody",
  "R&B": "korean rnb, smooth, falsetto, neo soul, chill, late night",
  "락": "korean rock band, electric guitar, drums, powerful vocals, 2000s rock",
  "포크": "korean folk, acoustic guitar, warm vocals, intimate, storytelling",
  "재즈": "korean jazz, upright bass, piano, swing, vocal jazz",
  "일렉트로닉": "korean edm, future bass, drop, synth lead, 128bpm",
  "Lo-fi": "lofi beats, chill, rain sounds, tape hiss, study music",
  "트로트": "korean trot, retro, brass, accordion, showa ballad",
  "인디": "korean indie, dream pop, reverb guitar, soft vocals, bedroom pop",
  "OST": "korean drama ost, orchestral, strings, cinematic, emotional peak",
};
```

이걸 System Prompt에 넘기면 Gemini가 장르에 맞는 태그를 **정확히** 뽑습니다.

## 5. 프롬프트 체이닝 구조 (v1 이상)

1곡 완성까지 Gemini 호출 순서:

```
Step 1: 가사 생성
  ├─ input: theme, genre
  └─ output: title, lyrics, style_tags, mood

Step 2: YouTube 메타데이터 (가사 기반)
  ├─ input: title, lyrics, genre
  └─ output: yt_title, description, tags, pinned_comment, timeline

Step 3: 번역 (가사 기반, 선택)
  ├─ input: lyrics (Korean)
  └─ output: lyrics_en

Step 4: 썸네일 프롬프트 (mood 기반, 선택)
  ├─ input: title, mood
  └─ output: imagen_prompt
```

**비용 절감 팁**: Step 1은 `flash`, Step 2~4는 `flash-lite` 사용.

## 6. Response Schema로 JSON 강제

`lib/gemini.ts`에서 사용한 패턴:

```typescript
config: {
  responseMimeType: "application/json",
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      lyrics: { type: Type.STRING },
      style_tags: { type: Type.STRING },
      mood: { type: Type.STRING },
    },
    required: ["title", "lyrics", "style_tags", "mood"],
  },
}
```

이걸 넣으면 Gemini가 **반드시** JSON만 반환합니다. 정규식 파싱 필요 없음.

## 7. Few-Shot 예시 추가 (품질 2배)

System Prompt 뒤에 실제 좋은 예시 1~2개를 넣으면 품질이 극적으로 향상됩니다:

```typescript
export const FEW_SHOT_EXAMPLE = `
[예시]
입력: 테마="새벽 한강, 이별 후의 담담함", 장르="발라드"
출력:
{
  "title": "한강에서",
  "lyrics": "[Intro]\\n불빛이 흐르는 강물 위\\n\\n[Verse 1]\\n너 없이 걷던 이 길을\\n또 혼자 걸어가네\\n담담한 척 웃어보지만\\n눈물이 흐르네\\n\\n[Chorus]\\n한강에서 너를 보내\\n이제는 안녕이야\\n바람에 실어 보낼게\\n내 마음 한 조각\\n\\n[Verse 2]\\n함께였던 이 다리 위\\n추억만 남았어\\n멀어지는 너의 뒷모습\\n흐려지는 밤하늘\\n\\n[Bridge]\\n괜찮다 괜찮다 되뇌여도\\n빈자리가 크게만 느껴져\\n\\n[Chorus]\\n한강에서 너를 보내\\n이제는 안녕이야\\n바람에 실어 보낼게\\n내 마음 한 조각\\n\\n[Outro]\\n흐르는 강물처럼",
  "style_tags": "korean ballad, piano, emotional, female vocal, slow tempo, melancholic, strings",
  "mood": "담담한 이별의 잔잔한 슬픔"
}
`;
```

## 8. Temperature 설정 가이드

| 용도 | temperature | 이유 |
|---|---|---|
| 가사 (창의성 필요) | **0.9** | 다양성 ↑ |
| 제목 (짧음) | 0.8 | |
| YouTube 메타 | 0.6 | SEO는 안정성 |
| 번역 | 0.3 | 정확도 ↑ |
| 태그 추출 | 0.2 | 결정적 |

## 9. 자주 발생하는 문제 & 해결

### 문제 1: Gemini가 한글 섹션 태그 `[1절]`로 반환
→ System Prompt에 "**반드시 영문**" 명시 + Few-Shot 예시 포함

### 문제 2: 가사에 이모지가 들어감
→ "이모지 사용 금지" 명시 (Suno는 이모지를 발음하려 시도함)

### 문제 3: 같은 테마로 계속 비슷한 가사
→ temperature 0.9 + `topP: 0.95` 추가 + "이전과 다른 관점" 프롬프트

### 문제 4: style_tags가 한국어로 나옴
→ System Prompt: "`style_tags` 필드는 **반드시 영문 소문자**, 쉼표로 구분"

### 문제 5: 가사가 너무 짧음/길음
→ "총 글자수 400~600자" 같은 수치 제약 추가

## 10. A/B 테스트 추천 순서

실제 사용자에게 내보내기 전 **최소 10번** 생성해보고:

1. 섹션 태그가 영문으로 나오는가? (parsing 실패 체크)
2. style_tags가 영문 5~8개인가? (Suno 인식 체크)
3. 한 줄 길이가 균일한가? (리듬 체크)
4. 후렴이 중독적인가? (핵심 품질)
5. 토큰 사용량이 예상 범위인가? (비용 체크)

10번 중 8번 이상 통과할 때까지 **System Prompt를 계속 수정**하세요.

## 11. 다국어 확장 (해외 진출)

영어/일본어/중국어 가사로 확장하려면:

```typescript
export function buildLyricsPrompt(theme: string, genre: string, lang: "ko"|"en"|"ja"|"zh") {
  const langInstructions = {
    ko: "한국어로만 작성",
    en: "Write in English only. American pop idioms.",
    ja: "日本語のみで作詞。J-POPの語彙。",
    zh: "只用中文作词。C-POP风格。",
  };
  return `[장르] ${genre}\n[테마] ${theme}\n[언어] ${langInstructions[lang]}`;
}
```

Suno는 언어별로 발음 엔진이 다르므로 **가사 언어 = 보컬 언어** 일치시키는 것이 중요.

---

## 마지막 조언

프롬프트는 **일회성**이 아닙니다. 사용자 피드백 데이터를 모아 **2주에 한 번씩 튜닝**하세요.
가장 효과적인 개선:
- ❌ System Prompt 전체 재작성
- ✅ **Few-shot 예시 추가** (가장 빠른 품질 향상)
- ✅ 실패 케이스를 negative example로 System Prompt에 포함
