// src/chatbot/chatbot.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { News } from '../news/news.entity';
import OpenAI from 'openai';
import { SearchService } from '../search/search.service';

interface ExternalTrend {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private openai: OpenAI;

  private trendCache: { data: ExternalTrend[]; cachedAt: number } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
    private dataSource: DataSource,
    private readonly searchService: SearchService, // ✅ 주입
  ) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // ─────────────────────────────────────────────
  // Public: 챗봇 답변 생성
  // userId가 있으면 개인화, 없으면 일반 브리핑
  // ─────────────────────────────────────────────
  async getAnswer(userMessage: string, userId?: string): Promise<string> {
    try {
      // 1. [검색 로직] 인사말인지 판단하여 검색할지 결정
      const isGreeting = ['안녕', '반가워', 'hi', 'hello', 'ㅎㅇ'].some(g => userMessage.toLowerCase().includes(g));
      let ownNewsContext: string;

      if (isGreeting) {
        ownNewsContext = "사용자가 인사를 건넸습니다.";
      } else {
        // ✅ 1. 검색 결과 확인 (로그를 찍어보세요!)
const searchResults = await this.searchService.search(userMessage);
console.log('DEBUG: searchResults =', searchResults);

// ✅ 2. 안전하게 처리 (타입 에러 방지)
// any로 형변환을 하여 .data나 .items 같은 속성에 접근할 때 컴파일 에러가 나지 않게 합니다.
const resultObj = searchResults as any; 

const newsList: any[] = Array.isArray(searchResults) 
  ? searchResults 
  : (resultObj?.data || resultObj?.items || []); 

// ✅ 3. 이후 로직
if (newsList.length > 0) {
  ownNewsContext = newsList.map(news => 
    `[${news.category?.name ?? '기타'}] ${news.title}\n` +
    `요약: ${news.aiSummary ?? '요약 없음'}\n` +
    `태그: ${news.tags?.map((t) => `#${t.name}`).join(' ') ?? '없음'}`
  ).join('\n\n');
} else {
  ownNewsContext = await this.getOwnNews();
}
      }

      // 2. 외부 트렌드 및 개인화 데이터 병렬 수집
      const tasks: any[] = [this.getExternalTrends()];
      if (userId) {
        tasks.push(this.buildPersonalContext(userId).catch(() => null));
      }

      const [externalTrends, personalContext] = await Promise.all(tasks);

      // 3. 프롬프트 조합 후 OpenAI 호출
      const systemPrompt = this.buildSystemPrompt(
        ownNewsContext,
        externalTrends,
        personalContext,
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
      });

      return (
        response.choices[0].message.content ??
        '죄송해요, 대답을 생성하지 못했어요.'
      );
    } catch (error) {
      this.logger.error('챗봇 응답 에러:', error);
      return '서버와 연결이 불안정하여 답변을 드릴 수 없습니다 😢';
    }
  }
  // ─────────────────────────────────────────────
  // 자체 DB 뉴스 수집
  // ─────────────────────────────────────────────
  private async getOwnNews(): Promise<string> {
    const recentNews = await this.newsRepository.find({
      // where: { status: 'published' },  <-- 이 줄 삭제!
      order: { createdAt: 'DESC' },     // <-- publishedAt 대신 예전의 createdAt으로 복구!
      take: 8,
      relations: ['category', 'tags'],
    });

    if (!recentNews.length) return '현재 등록된 뉴스가 없습니다.';

    return recentNews
      .map((news) =>
        `[${news.category?.name ?? '기타'}] ${news.title}\n` +
        `요약: ${news.aiSummary ?? '요약 없음'}\n` +
        `태그: ${news.tags?.map((t) => `#${t.name}`).join(' ') ?? '없음'}`,
      )
      .join('\n\n');
  }

  // ─────────────────────────────────────────────
  // NewsAPI 실시간 트렌드 (5분 캐시)
  // ─────────────────────────────────────────────
  private async getExternalTrends(): Promise<ExternalTrend[]> {
    if (
      this.trendCache &&
      Date.now() - this.trendCache.cachedAt < this.CACHE_TTL_MS
    ) {
      return this.trendCache.data;
    }

    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) return [];

    try {
      const fetchTrends = async (lang: string) => {
        const url = new URL('https://newsapi.org/v2/top-headlines');
        url.searchParams.set('category', 'technology');
        url.searchParams.set('language', lang);
        url.searchParams.set('pageSize', '8');
        url.searchParams.set('apiKey', apiKey);
        const res = await fetch(url.toString());
        return res.json();
      };

      let data = await fetchTrends('ko');
      if (!data.articles?.length) data = await fetchTrends('en');

      const trends: ExternalTrend[] = (data.articles ?? [])
        .filter((a: any) => a.title && a.title !== '[Removed]')
        .slice(0, 8)
        .map((a: any) => ({
          title: a.title,
          description: a.description ?? '',
          source: a.source.name,
          publishedAt: a.publishedAt,
        }));

      this.trendCache = { data: trends, cachedAt: Date.now() };
      return trends;
    } catch (err) {
      this.logger.warn('NewsAPI 호출 실패 — 자체 뉴스만 사용', err);
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // 사용자 개인화 데이터 수집
  // ─────────────────────────────────────────────
  private async buildPersonalContext(userId: string): Promise<string> {
    const [topCategories, recentlyRead, bookmarkedTags, monthlyStatsResult] =
      await Promise.all([
        this.dataSource.query(
          `SELECT c.name, ucs.score, ucs.view_count, ucs.like_count, ucs.bookmark_count
           FROM user_category_scores ucs
           JOIN categories c ON c.id = ucs.category_id
           WHERE ucs.user_id = $1
           ORDER BY ucs.score DESC
           LIMIT 3`,
          [userId],
        ),
        this.dataSource.query(
          `SELECT DISTINCT n.title, c.name AS category
           FROM interactions i
           JOIN news n ON n.id = i.news_id
           JOIN categories c ON c.id = n.category_id
           WHERE i.user_id = $1 AND i.type = 'view'
           ORDER BY i.created_at DESC
           LIMIT 3`,
          [userId],
        ),
        this.dataSource.query(
          `SELECT DISTINCT t.name
           FROM interactions i
           JOIN news_tags nt ON nt.news_id = i.news_id
           JOIN tags t ON t.id = nt.tag_id
           WHERE i.user_id = $1 AND i.type = 'bookmark'
           ORDER BY i.created_at DESC
           LIMIT 8`,
          [userId],
        ),
        this.dataSource.query(
          `SELECT COUNT(DISTINCT news_id) AS read_count
           FROM interactions
           WHERE user_id = $1 AND type = 'view'
              AND created_at >= date_trunc('month', CURRENT_DATE)`,
          [userId],
        ),
      ]);

    const monthlyStats = monthlyStatsResult[0];
    const lines: string[] = [];

    if (topCategories.length > 0) {
      lines.push(
        `[관심 카테고리 TOP ${topCategories.length}]\n` +
          topCategories
            .map(
              (c: any, i: number) =>
                `  ${i + 1}위. ${c.name} (조회 ${c.view_count}회, 좋아요 ${c.like_count}회, 북마크 ${c.bookmark_count}회)`,
            )
            .join('\n'),
      );
    }

    if (recentlyRead.length > 0) {
      lines.push(
        `[최근 읽은 뉴스]\n` +
          recentlyRead.map((n: any) => `  - [${n.category}] ${n.title}`).join('\n'),
      );
    }

    if (bookmarkedTags.length > 0) {
      lines.push(
        `[북마크 기반 관심 키워드]\n  ` +
          bookmarkedTags.map((t: any) => `#${t.name}`).join(' '),
      );
    }

    if (monthlyStats?.read_count) {
      lines.push(`[이번 달 읽은 뉴스]\n  총 ${monthlyStats.read_count}개`);
    }

    return lines.length > 0 ? lines.join('\n\n') : '';
  }

  // ─────────────────────────────────────────────
  // 시스템 프롬프트 생성
  // ─────────────────────────────────────────────
  private buildSystemPrompt(
    ownNewsContext: string,
    externalTrends: ExternalTrend[],
    personalContext: string | null,
  ): string {
    const isPersonalized = !!personalContext?.length;

    const trendBlock = externalTrends.length > 0
      ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[지금 테크 업계 실시간 트렌드] ← 맥락 파악용
${externalTrends
  .map(
    (t, i) =>
      `${i + 1}. ${t.title}\n   출처: ${t.source} / ${new Date(t.publishedAt).toLocaleDateString('ko-KR')}`,
  )
  .join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      : '';

    const trendRule = externalTrends.length > 0
      ? `
[외부 트렌드 활용 규칙]
- [지금 테크 업계 실시간 트렌드]는 "지금 업계 분위기" 맥락으로만 써.
- 언급 방식: "요즘 업계에서 [키워드] 얘기가 많이 나오고 있어요." → MINIME 자체 뉴스로 자연스럽게 연결.
- 외부 트렌드 URL은 절대 노출 금지. 키워드와 분위기만 활용.
- 자체 뉴스에 관련 기사 없으면: "아직 MINIME에서 다루지 않은 주제예요. 곧 다뤄질 예정이에요! 🙏"`
      : '';

    const personalSection = isPersonalized
      ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[이 사용자의 개인 데이터]
${personalContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[개인화 답변 규칙]
- 위 개인 데이터를 반드시 활용해서 답변을 맞춤화해.
- 사용자가 "뉴스 추천해 줘" 라고 하면 → 관심 카테고리 TOP 순서대로 관련 뉴스를 먼저 추천해.
- 사용자가 "요즘 뭐 많이 봐?" 처럼 자신의 패턴을 물으면 → 관심 카테고리와 읽은 뉴스를 바탕으로 성향을 분석해서 알려줘.
  예: "요즘 AI/ML 관련 뉴스를 가장 많이 읽고 계시네요! 특히 #ChatGPT #LLM 키워드에 관심이 높으신 것 같아요 🤖"
- 사용자의 관심 카테고리에 해당하는 오늘 뉴스가 있으면 그걸 제일 먼저 언급해.
- 관심 카테고리와 무관한 뉴스를 추천할 때는 "평소 관심사와 조금 다른 분야지만..." 같은 브릿지 문구를 써.
- 이름 대신 "님"으로 통일해서 부를 것.`
      : `
[일반 브리핑 규칙]
- 로그인하지 않은 사용자에게는 전체 뉴스 중 가장 주목할 만한 것을 균형 있게 소개해.
- 브리핑 말미에 "로그인하시면 관심 분야에 맞는 맞춤 추천을 받을 수 있어요! 😊" 를 자연스럽게 안내해.`;

    return `너는 IT 테크 뉴스 플랫폼 'MINIME'의 AI 뉴스 비서야.
${isPersonalized ? '이 사용자의 읽기 패턴과 관심사 데이터가 있으니, 철저히 개인화된 답변을 제공해.' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[메시지 유형 분류 — 가장 먼저 판단해]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 가벼운 인삿말 (안녕, ㅎㅇ, 안녕하세요, 반가워, hi, hello, ㅎㅇㅎㅇ 등)
   → 짧고 친근하게 답하고 끝내. 뉴스 브리핑·추천 자동 시작 금지.
   답변 예시: "안녕하세요! 😊 오늘 어떤 IT 소식이 궁금하세요? 뉴스 추천이나 브리핑을 도와드릴게요!"

2. IT·테크·뉴스와 완전히 무관한 질문 (날씨, 맛집, 연애, 번역, 단순 잡담 등)
   → 아래 문구로만 가볍게 거절. 추가 설명 금지.
   답변 예시: "저는 MINIME 뉴스 비서라서 IT 소식만 알려드릴 수 있어요! 다른 건 몰라요 😅"

3. IT·테크 뉴스 검색, 핫한 이슈 파악, 브리핑 및 추천 요청 (예: "오늘 핫한 뉴스 알려줘", "요즘 트렌드가 뭐야?")
   → 질문이 조금 포괄적이더라도 뉴스 브리핑 요청으로 간주하고 무조건 3번으로 분류해.
   → 아래 [너의 역할]과 규칙에 따라 풀 리스폰스 제공.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[너의 역할] — 유형 3에만 적용
- 뉴스 브리핑·요약·추천을 담당하는 친절한 AI 비서
- 사용자가 오늘 어떤 뉴스를 읽어야 할지 빠르게 파악하도록 도와주는 역할
- 딱딱하지 않고 친근하되, 정보는 정확하고 간결하게

[절대 규칙] — 유형 3에만 적용
1. 반드시 아래 [MINIME 자체 뉴스]를 기반으로만 답변해. 없는 뉴스를 지어내지 마.
2. [MINIME 자체 뉴스]가 비어 있다면 → "아직 오늘 새로운 테크 기사가 없어요 😅 조금 뒤에 다시 확인해 주세요!"
3. 답변은 이모지(🚀 💡 🔥 🤖 ☁️ 🔐 등)를 적절히 섞어 가독성 있게.
4. 한 번에 너무 많은 뉴스를 나열하지 말고, 핵심 2~4개만 골라서 깊이 있게 소개해.
5. 뉴스 제목을 그대로 읽지 말고, 핵심 내용을 쉽게 풀어서 설명해.
${trendRule}
${personalSection}

[답변 형식 가이드] — 유형 3에만 적용
- 뉴스 브리핑 요청 시: 카테고리 이모지 + 한 줄 핵심 요약 형태로
- 특정 주제 질문 시: 관련 뉴스 먼저 → 간단한 배경 설명 → 한 줄 코멘트
- 패턴/성향 질문 시: 데이터 기반 분석 → 따뜻한 코멘트

${trendBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[MINIME 자체 뉴스]
${ownNewsContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}
