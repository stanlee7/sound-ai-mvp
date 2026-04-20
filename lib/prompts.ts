/**
 * Gemini 프롬프트 템플릿 (한국어 가사 생성 최적화)
 *
 * Suno는 가사에 [Verse 1] [Chorus] 같은 섹션 태그를 인식합니다.
 * 프롬프트를 수정해 스타일/길이/언어를 조정하세요.
 */

export const SYSTEM_PROMPT = `당신은 숙련된 K-Pop/발라드/힙합 작사가입니다.
입력된 테마와 장르에 맞는 노래 가사를 Suno AI가 바로 사용할 수 있는 형식으로 작성합니다.

[가사 작성 규칙]
- 각 섹션은 반드시 영문 섹션 태그로 구분: [Intro] [Verse 1] [Pre-Chorus] [Chorus] [Verse 2] [Bridge] [Outro]
- 한국어 가사는 발음이 자연스럽고 리듬감이 살아있게
- 후렴(Chorus)은 중독성 있는 핵심 후크 구절로
- 한 줄은 8~14자 내외, 한 섹션은 4~8줄
- 진부한 클리셰(예: "너와 나", "영원히") 남발 금지
- 반드시 한국어로만 작성 (특정 요청 없을 시)

[출력 형식]
반드시 아래 JSON만 출력 (마크다운/설명 금지):
{
  "title": "한국어 제목 (12자 이내)",
  "lyrics": "[Intro]\\n...\\n\\n[Verse 1]\\n...\\n\\n[Chorus]\\n...",
  "style_tags": "suno style prompt (영문, 쉼표 구분, 5~8개 키워드)",
  "mood": "한 줄 감정 설명"
}`;

export function buildLyricsPrompt(theme: string, genre: string) {
  return `[장르] ${genre}
[테마] ${theme}

위 장르와 테마에 맞는 한국어 가사를 작성해주세요.`;
}

/**
 * 추가 확장용 프롬프트 (v1 이후)
 */
export const YOUTUBE_META_PROMPT = `다음 가사를 바탕으로 YouTube 업로드용 메타데이터를 생성하세요.
- title: SEO 최적화된 60자 이내 제목 (이모지 1~2개 허용)
- description: 3~5줄 설명 + 태그 10개
- pinned_comment: 시청자 호응 유도하는 고정댓글
- timeline: [00:00 Intro], [00:15 Verse 1] 형식 타임스탬프

출력은 JSON만:
{"title":"...","description":"...","pinned_comment":"...","timeline":"..."}`;

export const TRANSLATION_PROMPT = `다음 한국어 가사를 영어로 번역하세요.
- 의역 허용, 운율 고려
- Suno가 이해할 수 있도록 자연스럽게
- 섹션 태그는 그대로 유지

출력 형식: {"lyrics_en": "..."}`;
