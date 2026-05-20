// src/chatbot/reporter-chatbot.service.ts
//
// 기자용 레퍼런스 큐레이터 챗봇
// ─ 방법 1: 네이버 뉴스 API description 활용 (토큰 절약)
// ─ 방법 2: 레퍼런스 큐레이터 역할 (링크 추천)
// ─ 방법 3: 자체 DB 뉴스 검색 (완벽한 본문 분석)

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { News } from '../news/news.entity';
import OpenAI from 'openai';

// ── 타입 ──────────────────────────────────────
interface NaverNewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  originallink: string;
}

interface NaverNewsResult {
  items: NaverNewsItem[];
}

interface OwnNewsResult {
  id: string;
  title: string;
  content: string;
  aiSummary: string | null;
  category: string;
  publishedAt: Date;
}

// ─────────────────────────────────────────────
@Injectable()
export class ReporterChatbotService {
  private readonly logger = new Logger(ReporterChatbotService.name);
  private openai: OpenAI;

  // 네이버 뉴스 캐시 (검색어별, 3분 TTL)
  private naverCache = new Map<string, { data: NaverNewsItem[]; cachedAt: number }>();
  private readonly CACHE_TTL = 3 * 60 * 1000;

  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
    private dataSource: DataSource,
  ) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // ─────────────────────────────────────────────
  // Public: 기자용 챗봇 메인 진입점
  // ─────────────────────────────────────────────
  async getReporterAnswer(
    userMessage: string,
    articleDraft?: string, // 기자가 작성 중인 기사 초안 (선택)
  ): Promise<string> {
    try {
      // 메시지에서 검색 키워드 추출
      const searchKeyword = this.extractKeyword(userMessage);

      // 세 가지 데이터 소스를 병렬로 수집
      const [naverNews, ownNews] = await Promise.all([
        this.searchNaverNews(searchKeyword),
        this.searchOwnNews(searchKeyword),
      ]);

      const systemPrompt = this.buildReporterPrompt(
        naverNews,
        ownNews,
        articleDraft,
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2, // 낮은 temperature — 팩트 중심 답변
      });

      return (
        response.choices[0].message.content ??
        '답변을 생성하지 못했습니다.'
      );
    } catch (error) {
      this.logger.error('기자용 챗봇 에러', error);
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
  }

// ─────────────────────────────────────────────
  // 수정된 검색 메서드
  // ─────────────────────────────────────────────
  private async searchNaverNews(keyword: string): Promise<NaverNewsItem[]> {
    // 1. 키워드가 없거나 공백이면 호출하지 않음 (400 에러 방지)
    if (!keyword || keyword.trim().length === 0) {
      this.logger.warn('검색어가 비어있어 네이버 API를 호출하지 않습니다.');
      return [];
    }

    // 캐시 확인
    const cached = this.naverCache.get(keyword);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      return cached.data;
    }

    const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
    const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      this.logger.warn('네이버 API 키 미설정');
      return [];
    }

    try {
      const url = new URL('https://openapi.naver.com/v1/search/news.json');
      url.searchParams.set('query', keyword);
      url.searchParams.set('display', '10');
      url.searchParams.set('sort', 'date');

      // 2. 어떤 검색어를 보내는지 터미널에서 확인
      this.logger.log(`네이버 검색 요청: ${keyword}`);

      const res = await fetch(url.toString(), {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });

      if (!res.ok) {
        // 서버 응답 에러 상세 확인
        const errorData = await res.json().catch(() => ({}));
        this.logger.error(`네이버 API 응답 에러: ${res.status}`, JSON.stringify(errorData));
        throw new Error(`네이버 API 호출 실패`);
      }

      const data: NaverNewsResult = await res.json();
      const items = data.items ?? [];

      const cleaned = items.map((item) => ({
        ...item,
        title: this.stripHtml(item.title),
        description: this.stripHtml(item.description),
      }));

      this.naverCache.set(keyword, { data: cleaned, cachedAt: Date.now() });
      return cleaned;
    } catch (err) {
      this.logger.error('네이버 뉴스 검색 실패', err);
      return [];
    }
  }

private async searchOwnNews(keyword: string): Promise<OwnNewsResult[]> {
    try {
      // 💡 PostgreSQL은 대문자가 섞인 컬럼명을 사용할 때 반드시 쌍따옴표로 감싸야 합니다.
      const query = `
        SELECT
          n.id, n.title, n.content, n."aiSummary", n."publishedAt",
          c.name AS category
        FROM news n
        LEFT JOIN categories c ON c.id = n."categoryId"
        WHERE n.status = 'published'
          AND (
            n.title ILIKE $1 
            OR n.content ILIKE $1
          )
        ORDER BY n."publishedAt" DESC
        LIMIT 5
      `;

      const rows = await this.dataSource.query(query, [`%${keyword}%`]);

      return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        content: r.content?.slice(0, 500) ?? '',
        // 💡 쿼리에서 별칭(as)을 쓰지 않은 경우, 결과값도 따옴표 이름을 그대로 가져옵니다.
        aiSummary: r.aiSummary, 
        category: r.category ?? '기타',
        publishedAt: r.publishedAt,
      }));
    } catch (err) {
      this.logger.error('자체 DB 검색 실패', err);
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // 시스템 프롬프트 — 기자용
  // ─────────────────────────────────────────────
  private buildReporterPrompt(
    naverNews: NaverNewsItem[],
    ownNews: OwnNewsResult[],
    articleDraft?: string,
  ): string {
    const hasNaver   = naverNews.length > 0;
    const hasOwn     = ownNews.length > 0;
    const hasDraft   = !!articleDraft?.trim();

    // ── 네이버 뉴스 블록 (제목 + 요약만, 본문 X → 토큰 절약) ──
    const naverBlock = hasNaver
      ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[네이버 최신 뉴스 — 제목 + 요약]
${naverNews
  .map(
    (item, i) =>
      `${i + 1}. ${item.title}\n   요약: ${item.description}\n   링크: ${item.originallink || item.link}\n   날짜: ${new Date(item.pubDate).toLocaleDateString('ko-KR')}`,
  )
  .join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      : '(네이버 뉴스 검색 결과 없음)';

    // ── 자체 DB 블록 (본문 일부 포함 → 논조 분석 가능) ──
    const ownBlock = hasOwn
      ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[테크레터 자체 DB 관련 기사]
${ownNews
  .map(
    (n, i) =>
      `${i + 1}. [${n.category}] ${n.title}\n` +
      `   요약: ${n.aiSummary ?? '(요약 없음)'}\n` +
      `   본문 일부: ${n.content}...\n` +
      `   발행일: ${new Date(n.publishedAt).toLocaleDateString('ko-KR')}`,
  )
  .join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      : '(자체 DB에 관련 기사 없음)';

    // ── 기사 초안 블록 (선택) ──
    const draftBlock = hasDraft
      ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[기자가 작성 중인 기사 초안]
${articleDraft}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      : '';

return `너는 IT 테크 뉴스 플랫폼 'MINIME'의 기자 전용 취재 보조 AI야.
일반 독자용 챗봇이 아니라, 기자가 기사를 더 빠르고 정확하게 쓸 수 있도록 돕는 "레퍼런스 큐레이터"야.
 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[메시지 유형 분류 — 가장 먼저 판단해]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 
1. 가벼운 인삿말 (안녕, ㅎㅇ, 안녕하세요, 반가워, hi, hello 등)
   → 아래 형식으로만 짧게 답하고 끝내. 레퍼런스 탐색 금지.
   답변 예시: "안녕하세요! 취재 보조 AI입니다. 다루실 주제나 키워드를 말씀해 주시면 관련 자료를 정리해 드릴게요."
 
2. IT·테크·뉴스와 완전히 무관한 질문 (날씨, 맛집, 연애, 코딩, 번역, 단순 잡담 등)
   → 아래 문구로만 정중히 거절. 추가 설명이나 대안 제시 금지.
   답변 예시: "저는 취재 보조 전용 AI라 IT 뉴스·기사 관련 질문만 도와드릴 수 있어요."
 
3. IT·테크 뉴스 검색, 핫한 이슈 파악, 취재 아이디어 및 레퍼런스 요청
   → 사용자가 "오늘 핫한 뉴스", "최신 트렌드" 등을 물어보는 것도 기사를 쓰기 위한 '사전 아이디어 발굴'로 간주하고 무조건 3번으로 분류해.
   → 아래 [너의 역할]과 [답변 형식]에 따라 풀 리스폰스 제공.
 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 
[너의 역할] — 유형 3에만 적용
1. 기자가 다루려는 주제나 최근 이슈 트렌드를 핵심 3가지로 정리.
2. 취재에 참고할 만한 기사 링크를 "왜 참고할 만한지" 이유와 함께 추천.
3. 자체 DB에 관련 기사가 있으면 "예전에 이런 논조로 다뤘습니다"라고 안내.
4. 기사 초안이 있으면 "이 주장을 뒷받침할 수 있는 자료"를 구체적으로 짚어줘.
 
[답변 원칙] — 유형 3에만 적용
- 팩트와 출처 중심으로 간결하게. 감성적 표현 금지.
- 링크는 반드시 실제 URL 그대로 노출. 절대 지어내지 마.
- 네이버 뉴스는 제목+요약만 있으므로 본문 내용을 추측하거나 단정짓지 마.
  반드시 "제목과 요약 기준으로" 또는 "본문 확인 필요" 단서를 달 것.
- 자체 DB 기사는 본문 일부가 있으니 좀 더 구체적인 분석 가능.
- 응답 형식: 마크다운 없이 번호 리스트로 깔끔하게.
 
[답변 형식] — 유형 3에만 적용
📌 현재 이슈 트렌드 (3가지)
1. ...
2. ...
3. ...
 
📎 취재 참고 링크
1. [기사 제목] — [왜 참고할 만한지 한 줄]
   링크: https://...
 
📂 MINIME 관련 기사
- [제목] (YYYY.MM.DD) — [논조 한 줄 요약]

${draftBlock ? '✏️ 초안 관련 보완 자료\n...' : ''}

${naverBlock}

${ownBlock}

${draftBlock}`;
  }

 private extractKeyword(message: string): string {
  // 1. 따옴표 안의 키워드 우선 추출
  const quoted = message.match(/["'](.+?)["']/);
  if (quoted) return quoted[1];

  // 2. 너무 많은 단어를 삭제하지 않도록 패턴 완화
  // "기사", "뉴스" 등을 삭제하면 검색할 단어가 없어집니다. 핵심어만 남깁니다.
  let keyword = message
    .replace(/(찾아줘|알려줘|써줘|취재)/g, '') // 꼭 필요한 단어만 삭제
    .replace(/[^\w\sㄱ-힣]/g, '')
    .trim();

  // 만약 삭제 후 남은 게 없다면, 원래 메시지의 앞부분이라도 사용
  return keyword.length > 0 ? keyword : message.trim().slice(0, 30);
}

  // HTML 태그 제거
  private stripHtml(str: string): string {
    return str.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }
}