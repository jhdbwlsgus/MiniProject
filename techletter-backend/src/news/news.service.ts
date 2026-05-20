import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { News, NewsStatus } from './news.entity';
import { NewsView } from './news-view.entity';
import { Tag } from '../tags/tag.entity';
import { Like } from '../interactions/entities/like.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Inject } from '@nestjs/common'; 
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import OpenAI from 'openai'; // ✅ OpenAI 임포트 추가
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Subscription } from '../subscriptions/subscription.entity';
import { ReporterProfile, ReporterStatus } from '../reporters/reporter-profile.entity';

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverNewsResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
}

export interface AnalyzeNewsDto {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface AiAnalyzeResult {
  seoScore: number;
  seoItems: { label: string; ok: boolean; suggestion: string }[];
  keywords: string[];
  titleSuggestions: string[];
  metaSuggestion: string;
  lead: string;
  tags: string[];
  keyPoints: string[];
  newsletterSummary: string;
  styleNote: string;
  readabilityNote: string;
}

export interface SpellcheckTextDto {
  text?: string;
}

export interface SpellcheckIssue {
  original: string;
  replacement: string;
  message: string;
  context: string;
}

export interface SpellcheckResult {
  issues: SpellcheckIssue[];
}

export interface RewriteSelectionDto {
  text?: string;
  mode?: string;
  references?: Array<{
    title?: string;
    url?: string;
    source?: string;
    memo?: string;
    type?: string;
  }>;
}

export interface RewriteSelectionResult {
  rewritten: string;
  note: string;
}

export interface TranslateSelectionDto {
  text?: string;
  targetLanguage?: string;
}

export interface TranslateSelectionResult {
  translated: string;
  sourceLanguage: string;
  targetLanguage: string;
}

@Injectable()
export class NewsService {
  private openai: OpenAI; // ✅ OpenAI 인스턴스 변수 선언

  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
    @InjectRepository(NewsView)
    private newsViewRepository: Repository<NewsView>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(ReporterProfile)
    private reporterProfileRepository: Repository<ReporterProfile>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService, // ✅ 이 부분이 추가되었습니다!
    @Inject(CACHE_MANAGER) private cacheManager: any, 
    @InjectQueue('ai-summary') private readonly aiSummaryQueue: Queue,
  ) {
    
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY') || 'missing',
    });
  }

  // ✅ AI 3줄 요약 프라이빗 메서드 추가
  private async generateAiSummary(content: string): Promise<string> {
    if (!content) return ''; // 본문이 없으면 빈 문자열 반환

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `너는 IT 전문 기자이자 요약의 달인이야. 주어진 뉴스 본문을 핵심만 뽑아 정확히 3줄로 요약해야 해. 
            [규칙]
            1. 반드시 각 줄은 "- " 기호로 시작할 것.
            2. 일반인도 이해하기 쉬운 친절한 말투를 사용할 것.
            3. 3줄을 초과하거나 미달하지 말 것.`,
          },
          {
            role: 'user',
            content: content,
          },
        ],
        temperature: 0.3,
      });

      return response.choices[0].message.content || '요약을 생성할 수 없습니다.';
    } catch (error) {
      console.error('AI 요약 생성 중 에러 발생:', error);
      return 'AI 요약 생성에 실패했습니다.';
    }
  }

  async analyzeNews(dto: AnalyzeNewsDto): Promise<AiAnalyzeResult> {
    if (!this.configService.get<string>('OPENAI_API_KEY')) {
      throw new BadRequestException('OPENAI_API_KEY를 .env에 설정해주세요.');
    }

    const title = dto.title?.trim() || '(미입력)';
    const contentText = (dto.content ?? '').replace(/<[^>]*>/g, '').slice(0, 2000) || '(미입력)';
    const currentTags = dto.tags?.length ? dto.tags.join(', ') : '(없음)';

    if (title === '(미입력)' && contentText === '(미입력)') {
      throw new BadRequestException('제목 또는 본문을 입력해주세요.');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a Korean IT news editor. Return only valid JSON matching the requested schema.',
        },
        {
          role: 'user',
          content: `다음 뉴스 기사를 분석해서 JSON으로만 응답해주세요.

제목: ${title}
본문: ${contentText}
현재 태그: ${currentTags}

JSON 스키마:
{
  "seoScore": 75,
  "seoItems": [
    {"label": "제목이 검색 친화적입니다", "ok": true, "suggestion": ""},
    {"label": "키워드가 본문에 적절히 분포되어 있습니다", "ok": true, "suggestion": ""},
    {"label": "소제목 추가를 권장합니다", "ok": false, "suggestion": "H2 태그로 소제목을 2~3개 추가하면 가독성과 SEO가 향상됩니다"}
  ],
  "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"],
  "titleSuggestions": ["추천제목1", "추천제목2", "추천제목3"],
  "metaSuggestion": "SEO에 최적화된 메타 설명 50~160자",
  "lead": "2문장 이내의 리드문",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "keyPoints": ["핵심포인트1", "핵심포인트2", "핵심포인트3"],
  "newsletterSummary": "뉴스레터용 2~3문장 요약",
  "styleNote": "문체 및 가독성 분석 결과 한 문장",
  "readabilityNote": "본문 구조 개선 제안 한 문장"
}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    try {
      const parsed = JSON.parse(content);
      return {
        seoScore: Number(parsed.seoScore) || 0,
        seoItems: Array.isArray(parsed.seoItems) ? parsed.seoItems : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        titleSuggestions: Array.isArray(parsed.titleSuggestions) ? parsed.titleSuggestions : [],
        metaSuggestion: parsed.metaSuggestion ?? '',
        lead: parsed.lead ?? '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        newsletterSummary: parsed.newsletterSummary ?? '',
        styleNote: parsed.styleNote ?? '',
        readabilityNote: parsed.readabilityNote ?? '',
      };
    } catch {
      throw new BadGatewayException('AI 분석 결과를 해석하지 못했습니다.');
    }
  }

  async spellcheckText(dto: SpellcheckTextDto): Promise<SpellcheckResult> {
    if (!this.configService.get<string>('OPENAI_API_KEY')) {
      throw new BadRequestException('OPENAI_API_KEY를 .env에 설정해주세요.');
    }

    const text = (dto.text ?? '').trim().slice(0, 6000);
    if (!text) {
      return { issues: [] };
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a Korean spelling, spacing, and copy-editing checker. Return only valid JSON. Do not rewrite the whole text.',
        },
        {
          role: 'user',
          content: `다음 한국어 기사 본문에서 맞춤법, 띄어쓰기, 문장부호, 어색한 표현을 검사해주세요.

규칙:
- 반드시 JSON만 반환하세요.
- 원문 전체를 다시 쓰지 마세요.
- 사용자가 클릭 적용할 수 있도록 고쳐야 할 짧은 원문 조각과 수정안을 주세요.
- 확실하지 않은 문체 취향은 제외하고, 맞춤법/띄어쓰기/명확한 표현 개선 위주로 주세요.
- 같은 오류가 반복되면 대표 항목만 20개 이하로 주세요.

JSON 형식:
{
  "issues": [
    {
      "original": "원문에서 발견한 짧은 조각",
      "replacement": "추천 수정 조각",
      "message": "왜 고치는지 짧은 설명",
      "context": "앞뒤 문맥을 포함한 짧은 미리보기"
    }
  ]
}

본문:
${text}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{"issues":[]}';
    try {
      const parsed = JSON.parse(content);
      const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
      return {
        issues: issues
          .filter((issue: Partial<SpellcheckIssue>) => issue.original && issue.replacement)
          .slice(0, 20)
          .map((issue: Partial<SpellcheckIssue>) => ({
            original: String(issue.original ?? ''),
            replacement: String(issue.replacement ?? ''),
            message: String(issue.message ?? '맞춤법 또는 띄어쓰기 확인이 필요합니다.'),
            context: String(issue.context ?? issue.original ?? ''),
          })),
      };
    } catch {
      throw new BadGatewayException('맞춤법 검사 결과를 해석하지 못했습니다.');
    }
  }

  async rewriteSelection(dto: RewriteSelectionDto): Promise<RewriteSelectionResult> {
    if (!this.configService.get<string>('OPENAI_API_KEY')) {
      throw new BadRequestException('OPENAI_API_KEY를 .env에 설정해주세요.');
    }

    const text = (dto.text ?? '').trim();
    if (!text) {
      throw new BadRequestException('다듬을 문장을 선택해주세요.');
    }

    const mode = dto.mode === 'easy'
      ? '쉽고 명확하게'
      : dto.mode === 'professional'
        ? '전문적인 기사 문체로'
        : '간결하게';
    const references = (dto.references ?? [])
      .filter((reference) => reference.title || reference.url || reference.memo)
      .slice(0, 8)
      .map((reference, index) => `${index + 1}. ${reference.title || '제목 없음'} / ${reference.source || ''} / ${reference.url || ''} / ${reference.memo || ''}`)
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an editor for technology news. Rewrite only the selected Korean text. Preserve factual meaning and do not add unsupported claims. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `선택된 문장을 ${mode} 다듬어주세요.

규칙:
- 선택된 문장의 사실관계를 유지하세요.
- 참고자료에 없는 수치, 회사명, 제품명, 주장 등을 새로 만들지 마세요.
- 기사 문체로 자연스럽게 다듬되 과장하지 마세요.
- JSON만 반환하세요.

참고자료:
${references || '참고자료 없음'}

JSON 형식:
{
  "rewritten": "수정된 문장",
  "note": "수정 방향 한 문장"
}

선택 문장:
${text}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    try {
      const parsed = JSON.parse(content);
      return {
        rewritten: String(parsed.rewritten ?? text),
        note: String(parsed.note ?? ''),
      };
    } catch {
      throw new BadGatewayException('문장 다듬기 결과를 해석하지 못했습니다.');
    }
  }

  async translateSelection(dto: TranslateSelectionDto): Promise<TranslateSelectionResult> {
    const text = (dto.text ?? '').trim();
    if (!text) {
      throw new BadRequestException('번역할 문장을 선택해주세요.');
    }

    const provider = (this.configService.get<string>('TRANSLATION_PROVIDER') || 'openai').toLowerCase();
    if (provider === 'deepl') {
      return this.translateWithDeepL(text, dto.targetLanguage);
    }

    return this.translateWithOpenAi(text, dto.targetLanguage);
  }

  private async translateWithDeepL(text: string, targetLanguageCode = 'en'): Promise<TranslateSelectionResult> {
    const authKey = this.configService.get<string>('DEEPL_API_KEY');
    if (!authKey) {
      throw new BadRequestException('DEEPL_API_KEY를 .env에 설정해주세요.');
    }

    const targetMap: Record<string, string> = {
      ko: 'KO',
      en: 'EN-US',
      ja: 'JA',
      zh: 'ZH',
    };
    const targetLanguage = targetMap[targetLanguageCode] ?? 'EN-US';
    const configuredUrl = this.configService.get<string>('DEEPL_API_URL');
    const baseUrl = configuredUrl || (authKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com');

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v2/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${authKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [text],
          target_lang: targetLanguage,
          preserve_formatting: true,
        }),
      });
    } catch {
      throw new BadGatewayException('DeepL 번역 API에 연결하지 못했습니다.');
    }

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new BadGatewayException(`DeepL 번역에 실패했습니다. ${message}`.trim());
    }

    const data = await response.json() as {
      translations?: Array<{
        detected_source_language?: string;
        text?: string;
      }>;
    };
    const translation = data.translations?.[0];
    return {
      translated: translation?.text ?? '',
      sourceLanguage: translation?.detected_source_language ?? 'unknown',
      targetLanguage,
    };
  }

  private async translateWithOpenAi(text: string, targetLanguageCode = 'en'): Promise<TranslateSelectionResult> {
    if (!this.configService.get<string>('OPENAI_API_KEY')) {
      throw new BadRequestException('OPENAI_API_KEY를 .env에 설정해주세요.');
    }

    const languageMap: Record<string, string> = {
      ko: 'Korean',
      en: 'English',
      ja: 'Japanese',
      zh: 'Simplified Chinese',
    };
    const targetLanguage = languageMap[targetLanguageCode] ?? 'English';

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a professional news translator. Preserve facts, names, numbers, links, and technical terms. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `Translate the selected news text into ${targetLanguage}.

Rules:
- Preserve factual meaning exactly.
- Keep company names, product names, numbers, URLs, and technical terms accurate.
- Use natural journalistic wording in the target language.
- Return JSON only.

JSON schema:
{
  "translated": "translated text",
  "sourceLanguage": "detected source language",
  "targetLanguage": "${targetLanguage}"
}

Selected text:
${text}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    try {
      const parsed = JSON.parse(content);
      return {
        translated: String(parsed.translated ?? ''),
        sourceLanguage: String(parsed.sourceLanguage ?? 'unknown'),
        targetLanguage: String(parsed.targetLanguage ?? targetLanguage),
      };
    } catch {
      throw new BadGatewayException('번역 결과를 해석하지 못했습니다.');
    }
  }

  async findAll(page = 1, limit = 10, categoryId?: number, status?: string, search?: string, tag?: string) {
    const query = this.newsRepository.createQueryBuilder('news')
      .leftJoinAndSelect('news.author', 'author')
      .leftJoinAndSelect('news.category', 'category')
      .leftJoinAndSelect('news.tags', 'tags')
      .distinct(true)
      .orderBy('news.homeUrgent', 'DESC')
      .addOrderBy('news.homeMain', 'DESC')
      .addOrderBy('news.homeRecommended', 'DESC')
      .addOrderBy('news.homeOrder', 'DESC')
      .addOrderBy('news.publishedAt', 'DESC')
      .addOrderBy('news.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (categoryId) query.andWhere('news.categoryId = :categoryId', { categoryId });
    if (status) query.andWhere('news.status = :status', { status });
    else query.andWhere('news.status = :status', { status: NewsStatus.PUBLISHED });
    if (search?.trim()) {
      const keyword = `%${search.trim().replace(/^#/, '')}%`;
      query.andWhere(
        '(news.title LIKE :keyword OR news.content LIKE :keyword OR news.lead LIKE :keyword OR news.metaKeywords LIKE :keyword OR tags.name LIKE :keyword OR tags.slug LIKE :keyword)',
        { keyword },
      );
    }
    if (tag?.trim()) {
      const tagName = tag.trim().replace(/^#/, '');
      query.andWhere('(tags.name = :tagName OR tags.slug = :tagName)', { tagName });
    }

    const [news, total] = await query.getManyAndCount();
    return { news, total, page, limit };
  }

  async getHomeFeed() {
    const base = () => this.newsRepository.createQueryBuilder('news')
      .leftJoinAndSelect('news.author', 'author')
      .leftJoinAndSelect('news.category', 'category')
      .leftJoinAndSelect('news.tags', 'tags')
      .where('news.status = :status', { status: NewsStatus.PUBLISHED });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [mainNews, urgentNews, recommendedNews, weeklyPopular, newsletterPreview] = await Promise.all([
      base()
        .andWhere('(news.homeMain = :enabled OR news.homeUrgent = :enabled)', { enabled: true })
        .orderBy('news.homeUrgent', 'DESC')
        .addOrderBy('news.homeOrder', 'DESC')
        .addOrderBy('news.publishedAt', 'DESC')
        .take(6)
        .getMany(),
      base()
        .andWhere('news.homeUrgent = :enabled', { enabled: true })
        .orderBy('news.homeOrder', 'DESC')
        .addOrderBy('news.publishedAt', 'DESC')
        .take(4)
        .getMany(),
      base()
        .andWhere('news.homeRecommended = :enabled', { enabled: true })
        .orderBy('news.homeOrder', 'DESC')
        .addOrderBy('news.viewCount', 'DESC')
        .addOrderBy('news.publishedAt', 'DESC')
        .take(8)
        .getMany(),
      base()
        .andWhere('(news.publishedAt IS NULL OR news.publishedAt >= :oneWeekAgo)', { oneWeekAgo })
        .orderBy('news.viewCount', 'DESC')
        .addOrderBy('news.likeCount', 'DESC')
        .addOrderBy('news.publishedAt', 'DESC')
        .take(8)
        .getMany(),
      base()
        .orderBy('news.publishedAt', 'DESC')
        .addOrderBy('news.viewCount', 'DESC')
        .take(6)
        .getMany(),
    ]);

    const fallbackTop = await base()
      .orderBy('news.viewCount', 'DESC')
      .addOrderBy('news.likeCount', 'DESC')
      .addOrderBy('news.publishedAt', 'DESC')
      .take(8)
      .getMany();

    return {
      mainNews: mainNews.length ? mainNews : fallbackTop.slice(0, 4),
      urgentNews,
      recommendedNews,
      weeklyPopular: weeklyPopular.length ? weeklyPopular : fallbackTop,
      newsletterPreview,
    };
  }

  async recordViewHistory(userId: number, newsId: number) {
    const news = await this.newsRepository.findOne({ where: { id: newsId } });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');

    const recentLimit = new Date();
    recentLimit.setMinutes(recentLimit.getMinutes() - 30);

    const recent = await this.newsViewRepository
      .createQueryBuilder('view')
      .where('view.userId = :userId', { userId })
      .andWhere('view.newsId = :newsId', { newsId })
      .andWhere('view.createdAt >= :recentLimit', { recentLimit })
      .getOne();

    if (recent) return { recorded: false };

    await this.newsViewRepository.save(this.newsViewRepository.create({ userId, newsId }));
    return { recorded: true };
  }

  async getMyViewHistory(userId: number) {
    const views = await this.newsViewRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 30,
      relations: ['news', 'news.author', 'news.category', 'news.tags'],
    });

    const seen = new Set<number>();
    return views
      .filter((view) => {
        if (!view.news || view.news.status !== NewsStatus.PUBLISHED || seen.has(view.news.id)) return false;
        seen.add(view.news.id);
        return true;
      })
      .slice(0, 8)
      .map((view) => ({ ...view.news, lastViewedAt: view.createdAt }));
  }

  async findAllAdmin(page = 1, limit = 20, status?: string, authorId?: number) {
    const where: FindOptionsWhere<News> = {};
    if (status) where.status = status as NewsStatus;
    if (authorId) where.authorId = authorId;

    const [news, total] = await this.newsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author', 'category', 'tags'],
    });
    return { news, total, page, limit };
  }

  async findOne(id: number, viewer?: { id: number; role: string } | null) {
    const news = await this.newsRepository.findOne({
      where: { id },
      relations: ['author', 'category', 'tags'],
    });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    const likeCount = await this.likeRepository.count({ where: { newsId: id } });
    if (news.likeCount !== likeCount) {
      news.likeCount = likeCount;
      await this.newsRepository.save(news);
    }
    return this.applyPremiumAccess(news, viewer);
  }

  async findBySlug(slug: string, viewer?: { id: number; role: string } | null) {
    const news = await this.newsRepository.findOne({
      where: { slug },
      relations: ['author', 'category', 'tags'],
    });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    return this.applyPremiumAccess(news, viewer);
  }
  async updateAiSummary(newsId: number, summary: string) {
    await this.newsRepository.update(newsId, { aiSummary: summary });
  }

  async create(dto: CreateNewsDto, requester: { id: number; role: string }) {
    await this.ensureCanCreateNews(requester);
    const cleanDto = this.sanitizeNewsDtoForRole(dto, requester.role) as CreateNewsDto;
    const slug = cleanDto.slug || this.generateSlug(cleanDto.title);
    let tags: Tag[] = [];

    if (cleanDto.tags && cleanDto.tags.length > 0) {
      tags = await Promise.all(
        cleanDto.tags.map(async (tagName) => {
          let tag = await this.tagRepository.findOne({ where: { name: tagName } });
          if (!tag) {
            tag = this.tagRepository.create({ name: tagName, slug: this.generateSlug(tagName) });
            tag = await this.tagRepository.save(tag);
          }
          return tag;
        })
      );
    }

    // ✅ [변경] 기존의 await this.generateAiSummary() 호출 제거! (서버 응답 속도 향상)
    const status = (cleanDto.status as NewsStatus) || NewsStatus.DRAFT;

    const news = this.newsRepository.create({
      ...cleanDto,
      slug,
      authorId: requester.id,
      tags,
      isPremium: Boolean(cleanDto.isPremium),
      premiumExcerpt: cleanDto.premiumExcerpt?.trim() || null,
      premiumContent: this.normalizePremiumContent(cleanDto.premiumContent),
      // ✅ [변경] aiSummary 필드 제거 (나중에 워커가 업데이트함)
      status,
      scheduledAt: cleanDto.scheduledAt ? this.normalizeOptionalDate(cleanDto.scheduledAt) : undefined,
      publishedAt: cleanDto.status === NewsStatus.PUBLISHED ? new Date() : undefined,
    });

    const saved = await this.newsRepository.save(news);

    // ✅ [변경] 여기서 큐에 작업 던지기 (비동기 처리)
    if (saved.status === NewsStatus.PUBLISHED && saved.content) {
      await this.aiSummaryQueue.add('summarize', { 
        newsId: saved.id, 
        content: saved.content 
      });
      console.log(`🚀 [Queue] 뉴스 ${saved.id} 요약 작업을 큐에 담았습니다.`);
    }

    if (saved.status === NewsStatus.PUBLISHED) {
      await this.notificationsService.notifyReporterArticle(saved);
    }
    return saved;
  }

  async update(id: number, dto: UpdateNewsDto, requester?: { id: number; role: string }) {
    const news = await this.getNewsEntity(id);
    await this.ensureCanManageNews(news, requester);
    const cleanDto = this.sanitizeNewsDtoForRole(dto, requester?.role) as UpdateNewsDto;

    if (cleanDto.tags) {
      news.tags = await Promise.all(
        cleanDto.tags.map(async (tagName) => {
          let tag = await this.tagRepository.findOne({ where: { name: tagName } });
          if (!tag) {
            tag = this.tagRepository.create({ name: tagName, slug: this.generateSlug(tagName) });
            tag = await this.tagRepository.save(tag);
          }
          return tag;
        })
      );
    }

    const wasPublished = news.status === NewsStatus.PUBLISHED;
    if (cleanDto.status === NewsStatus.PUBLISHED && !news.publishedAt) {
      news.publishedAt = new Date();
    }

    // (선택 사항) 만약 뉴스 내용(content)이 수정될 때마다 요약본도 갱신하고 싶다면
    // update 메서드 안에도 const aiSummary = await this.generateAiSummary(dto.content); 를 추가할 수 있습니다.
    
    Object.assign(news, { ...cleanDto, tags: news.tags });
    if (cleanDto.scheduledAt !== undefined) {
      news.scheduledAt = (cleanDto.scheduledAt ? this.normalizeOptionalDate(cleanDto.scheduledAt) : null) as Date;
    }
    if (cleanDto.isPremium !== undefined) news.isPremium = Boolean(cleanDto.isPremium);
    if (cleanDto.premiumExcerpt !== undefined) news.premiumExcerpt = cleanDto.premiumExcerpt?.trim() || null;
    if (cleanDto.premiumContent !== undefined) news.premiumContent = this.normalizePremiumContent(cleanDto.premiumContent);
    const saved = await this.newsRepository.save(news);
    if (!wasPublished && saved.status === NewsStatus.PUBLISHED) {
      await this.notificationsService.notifyReporterArticle(saved);
    }
    return saved;
  }

  async remove(id: number, requester?: { id: number; role: string }) {
    const news = await this.getNewsEntity(id);
    await this.ensureCanManageNews(news, requester);
    return this.newsRepository.remove(news);
  }

  private async getNewsEntity(id: number) {
    const news = await this.newsRepository.findOne({
      where: { id },
      relations: ['author', 'category', 'tags'],
    });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    return news;
  }

  private async ensureCanManageNews(news: News, requester?: { id: number; role: string }) {
    if (!requester) return;
    if (requester.role === 'admin') return;
    if (news.authorId === requester.id) {
      await this.ensureApprovedReporter(requester);
      return;
    }
    throw new ForbiddenException('You can only manage your own news.');
  }

  private async ensureCanCreateNews(requester?: { id: number; role: string }) {
    if (!requester) {
      throw new ForbiddenException('Approved reporter or admin permission is required.');
    }
    if (requester.role === 'admin') return;
    await this.ensureApprovedReporter(requester);
  }

  private async ensureApprovedReporter(requester: { id: number; role: string }) {
    if (requester.role !== 'reporter') {
      throw new ForbiddenException('Approved reporter permission is required.');
    }

    const profile = await this.reporterProfileRepository.findOne({ where: { userId: requester.id } });

    if (!profile) {
      return;
    }

    if (profile.status !== ReporterStatus.APPROVED) {
      profile.status = ReporterStatus.APPROVED;
      profile.approvedAt = profile.approvedAt || new Date();
      await this.reporterProfileRepository.save(profile);
    }
  }

  private sanitizeNewsDtoForRole<T extends CreateNewsDto | UpdateNewsDto>(dto: T, role?: string): T {
    if (role === 'admin') return dto;
    const clean = { ...dto };
    delete clean.homeMain;
    delete clean.homeRecommended;
    delete clean.homeUrgent;
    delete clean.homeOrder;
    return clean;
  }

  private normalizeOptionalDate(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid scheduledAt value.');
    }
    return date;
  }

  private async applyPremiumAccess(news: News, viewer?: { id: number; role: string } | null) {
    if (!news.isPremium) {
      return { ...news, contentLocked: false, hasPremiumAccess: true, requiredPlan: null };
    }

    const hasAccess = await this.hasPremiumAccess(news, viewer);
    if (hasAccess) {
      return { ...news, contentLocked: false, hasPremiumAccess: true, requiredPlan: 'premium' };
    }

    return {
      ...news,
      content: news.premiumExcerpt || news.lead || this.createExcerpt(news.content),
      premiumContent: null,
      contentLocked: true,
      hasPremiumAccess: false,
      requiredPlan: 'premium',
    };
  }

  private async hasPremiumAccess(news: News, viewer?: { id: number; role: string } | null) {
    if (!viewer) return false;
    if (viewer.role === 'admin') return true;
    if (news.authorId === viewer.id) return true;

    const subscription = await this.subscriptionRepository.findOne({ where: { userId: viewer.id } });
    if (!subscription || subscription.planType !== 'premium') return false;
    if (subscription.status === 'ACTIVE') return true;
    if (subscription.status !== 'CANCELED') return false;
    if (!subscription.endDate) return false;
    return new Date(subscription.endDate) >= new Date();
  }

  private createExcerpt(content: string) {
    return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 420);
  }

  private normalizePremiumContent(content: CreateNewsDto['premiumContent'] | UpdateNewsDto['premiumContent']) {
    if (!content) return null;
    const keyPoints = (content.keyPoints || []).map((item) => item.trim()).filter(Boolean);
    const editorComment = content.editorComment?.trim() || '';
    const relatedLinks = (content.relatedLinks || [])
      .map((link) => ({ title: link.title?.trim() || '', url: link.url?.trim() || '' }))
      .filter((link) => link.title || link.url);
    if (!keyPoints.length && !editorComment && !relatedLinks.length) return null;
    return { keyPoints, editorComment, relatedLinks };
  }

  // ─────────────────────────────────────────────
  // 1. 조회수 증가 (본인 조회 무시 + 전역 락 해결)
  // ─────────────────────────────────────────────
  async incrementViewCount(id: number, ip: string = 'unknown_ip', userId?: number) {
    // 1️⃣ 기사 정보 가져오기 (작성자 확인용)
    const news = await this.newsRepository.findOne({ 
      where: { id }, 
      select: ['id', 'authorId'] // 성능을 위해 필요한 필드만 가져옴
    });
    
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');

    // 2️⃣ 본인이 작성한 기사라면 조회수를 올리지 않고 즉시 종료!
    if (userId && news.authorId === userId) {
      return; 
    }

    // 3️⃣ 캐시 키 생성 (로그인 유저는 userId로, 비회원은 IP로 구분해서 겹치지 않게!)
    const cacheKey = userId 
      ? `viewed_news_${id}_user_${userId}` 
      : `viewed_news_${id}_ip_${ip}`;

    // 서비스 파일의 incrementViewCount 내부 (캐시 확인 직후)
    const isViewed = await this.cacheManager.get(cacheKey);

    // 4️⃣ 24시간 내에 이미 본 유저/IP면 종료
    if (isViewed) return;

    // 5️⃣ 처음 조회라면 조회수 +1 하고 포스트잇 기록 (24시간 = 86400000ms)
    await this.newsRepository.increment({ id }, 'viewCount', 1);
    await this.cacheManager.set(cacheKey, true, 86400000); 
  }

  // ─────────────────────────────────────────────
  // 2. 공유수 증가 (무한 클릭 도배 방지 - 1분 쿨타임)
  // ─────────────────────────────────────────────
  async incrementShareCount(id: number, ip: string = 'unknown_ip', userId?: number) {
    // 유저 식별 키 생성
    const cacheKey = userId 
      ? `shared_news_${id}_user_${userId}` 
      : `shared_news_${id}_ip_${ip}`;

    // 1️⃣ Redis 확인: 롤(LoL)에서 스킬 쿨타임 돌듯이, 아직 쿨타임 중인지 체크
    const isSharedRecently = await this.cacheManager.get(cacheKey);
    
    if (isSharedRecently) {
      // 쿨타임 중이면 DB를 안 올리고 기존 카운트만 프론트로 반환 (조용히 무시)
      const news = await this.newsRepository.findOne({ where: { id }, select: ['shareCount'] });
      return { shareCount: news?.shareCount || 0 };
    }

    // 2️⃣ 쿨타임이 끝났거나 처음 공유하는 거라면 포스트잇(1분 = 60000ms) 붙이기
    await this.cacheManager.set(cacheKey, true, 60000);
    
    // 3️⃣ DB 공유수 1 증가
    await this.newsRepository.increment({ id }, 'shareCount', 1);
    
    const updatedNews = await this.newsRepository.findOne({ where: { id }, select: ['shareCount'] });
    return { shareCount: updatedNews?.shareCount || 0 };
  }

  async searchNaverNews(query: string, display = 10, start = 1, sort: 'sim' | 'date' = 'date') {
    const keyword = query?.trim();
    if (!keyword) {
      throw new BadRequestException('검색어를 입력해주세요.');
    }

    const clientId =
      this.configService.get<string>('NAVER_SEARCH_CLIENT_ID') ||
      this.configService.get<string>('NAVER_CLIENT_ID');
    const clientSecret =
      this.configService.get<string>('NAVER_SEARCH_CLIENT_SECRET') ||
      this.configService.get<string>('NAVER_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'NAVER_SEARCH_CLIENT_ID와 NAVER_SEARCH_CLIENT_SECRET을 설정해주세요.',
      );
    }

    const params = new URLSearchParams({
      query: keyword,
      display: String(Math.min(Math.max(display, 1), 100)),
      start: String(Math.min(Math.max(start, 1), 1000)),
      sort,
    });

    let response: Response;
    try {
      response = await fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });
    } catch {
      throw new BadGatewayException('네이버 뉴스 검색 API에 연결하지 못했습니다.');
    }

    if (!response.ok) {
      throw new BadGatewayException('네이버 뉴스 검색 API 호출에 실패했습니다. Client ID와 Secret을 확인해주세요.');
    }

    const data = (await response.json()) as NaverNewsResponse;
    return {
      total: data.total,
      start: data.start,
      display: data.display,
      items: data.items.map((item) => ({
        title: this.cleanNaverText(item.title),
        description: this.cleanNaverText(item.description),
        link: item.link,
        originalLink: item.originallink,
        pubDate: item.pubDate,
      })),
    };
  }

  async publishScheduled() {
    const now = new Date();
    const scheduledNews = await this.newsRepository.find({
      where: { status: NewsStatus.SCHEDULED },
    });
    for (const news of scheduledNews) {
      if (news.scheduledAt && news.scheduledAt <= now) {
        news.status = NewsStatus.PUBLISHED;
        news.publishedAt = now;
        await this.newsRepository.save(news);
      }
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100) + '-' + Date.now();
  }

  private cleanNaverText(value: string): string {
    return value
      .replace(/<[^>]+>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
}
