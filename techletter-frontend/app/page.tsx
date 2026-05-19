'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api, { getImageUrl } from '@/lib/api';
import ProfileAvatar from '@/components/common/ProfileAvatar';
import SearchPreviewInput from '@/components/common/SearchPreviewInput';

interface Category {
  id: number;
  name: string;
  slug?: string;
}

interface Tag {
  id: number;
  name: string;
  slug?: string;
}

interface News {
  id: number;
  title: string;
  content?: string;
  lead?: string;
  aiSummary?: string;
  thumbnailUrl?: string | null;
  viewCount?: number;
  likeCount?: number;
  createdAt: string;
  publishedAt?: string | null;
  lastViewedAt?: string;
  author?: { nickname: string };
  category?: Category | null;
  tags?: Tag[];
}

interface HomeFeed {
  mainNews: News[];
  urgentNews: News[];
  recommendedNews: News[];
  weeklyPopular: News[];
  newsletterPreview: News[];
}

interface User {
  nickname: string;
  role?: string;
}

interface Subscription {
  status: 'NONE' | 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAYMENT_FAILED';
  planType: 'daily' | 'weekly' | 'all' | 'premium' | null;
}

interface UserReport {
  topCategories: Array<{ category: Category }>;
}

interface Bookmark {
  news?: News | null;
}

const emptyFeed: HomeFeed = {
  mainNews: [],
  urgentNews: [],
  recommendedNews: [],
  weeklyPopular: [],
  newsletterPreview: [],
};

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const formatDate = (date: string | null | undefined) => {
  if (!date) return '';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

const planLabel: Record<string, string> = {
  daily: '데일리',
  weekly: '위클리',
  all: '전체',
  premium: '프리미엄',
};

function uniqueNews(list: News[]) {
  const seen = new Set<number>();
  return list.filter((news) => {
    if (seen.has(news.id)) return false;
    seen.add(news.id);
    return true;
  });
}

function NewsThumb({ news, className }: { news: News; className: string }) {
  const image = getImageUrl(news.thumbnailUrl);
  if (!image) {
    return <div className={`${className} flex items-center justify-center bg-gray-100 text-xs text-gray-400 dark:bg-gray-800`}>이미지 없음</div>;
  }
  return <img src={image} alt={news.title} className={`${className} object-cover`} />;
}

function NewsListRow({ news }: { news: News }) {
  return (
    <Link href={`/news/${news.id}`} className="group flex gap-3 rounded-xl border-b border-gray-100 px-2 py-4 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60">
      <NewsThumb news={news} className="h-16 w-20 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
          <span>{news.category?.name ?? '뉴스'}</span>
          <span>{formatDate(news.publishedAt ?? news.createdAt)}</span>
        </div>
        <p className="line-clamp-2 text-sm font-semibold text-gray-900 transition group-hover:text-blue-600 dark:text-gray-100">
          {news.title}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-gray-500">{news.lead || news.aiSummary || stripHtml(news.content)}</p>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [latestNews, setLatestNews] = useState<News[]>([]);
  const [homeFeed, setHomeFeed] = useState<HomeFeed>(emptyFeed);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [report, setReport] = useState<UserReport | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const isLoggedIn = !!user;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    const fetchHome = async () => {
      setLoading(true);
      try {
        const baseRequests = [
          api.get('/news/home'),
          api.get('/news', { params: { limit: 12 } }),
          api.get('/categories'),
        ];

        const authRequests = token
          ? [
              api.get('/users/me').catch(() => ({ data: null })),
              api.get('/subscriptions/me').catch(() => ({ data: null })),
              api.get('/users/me/report').catch(() => ({ data: null })),
              api.get('/users/me/bookmarks').catch(() => ({ data: [] })),
            ]
          : [];

        const [homeRes, newsRes, categoryRes, userRes, subscriptionRes, reportRes, bookmarkRes] = await Promise.all([
          ...baseRequests,
          ...authRequests,
        ]);

        const homeData = typeof homeRes.data === 'object' && homeRes.data !== null ? homeRes.data : {};
        setHomeFeed({
          mainNews: asArray<News>((homeData as Partial<HomeFeed>).mainNews),
          urgentNews: asArray<News>((homeData as Partial<HomeFeed>).urgentNews),
          recommendedNews: asArray<News>((homeData as Partial<HomeFeed>).recommendedNews),
          weeklyPopular: asArray<News>((homeData as Partial<HomeFeed>).weeklyPopular),
          newsletterPreview: asArray<News>((homeData as Partial<HomeFeed>).newsletterPreview),
        });
        setLatestNews(asArray<News>(newsRes.data?.news));
        setTotal(Number(newsRes.data?.total) || 0);
        setCategories(asArray<Category>(categoryRes.data));
        if (userRes) setUser(userRes.data);
        if (subscriptionRes) setSubscription(subscriptionRes.data);
        if (reportRes) setReport(reportRes.data);
        if (bookmarkRes) setBookmarks(asArray<Bookmark>(bookmarkRes.data));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, []);

  useEffect(() => {
    if (loading) return;
    const fetchByCategory = async () => {
      setNewsLoading(true);
      setPage(1);
      try {
        const params: Record<string, number> = { limit: 12 };
        if (activeCategoryId !== null) params.categoryId = activeCategoryId;
        const res = await api.get('/news', { params });
        setLatestNews(asArray<News>(res.data?.news));
        setTotal(Number(res.data?.total) || 0);
      } catch (error) {
        console.error(error);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchByCategory();
  }, [activeCategoryId, loading]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setNewsLoading(true);
    try {
      const params: Record<string, number> = { page: nextPage, limit: 12 };
      if (activeCategoryId !== null) params.categoryId = activeCategoryId;
      const res = await api.get('/news', { params });
      setLatestNews((prev) => [...prev, ...asArray<News>(res.data?.news)]);
      setPage(nextPage);
      setTotal(Number(res.data?.total) || total);
    } finally {
      setNewsLoading(false);
    }
  };

  const featuredNews = homeFeed.urgentNews[0] || homeFeed.mainNews[0] || homeFeed.weeklyPopular[0] || latestNews[0];
  const editorPickedNews = homeFeed.recommendedNews.filter((news) => news.id !== featuredNews?.id).slice(0, 4);
  const weeklyPopular = uniqueNews(homeFeed.weeklyPopular.length ? homeFeed.weeklyPopular : latestNews).slice(0, 5);
  const newsletterPreview = uniqueNews(homeFeed.newsletterPreview.length ? homeFeed.newsletterPreview : weeklyPopular).slice(0, 4);
  const likedNews = useMemo(
    () => [...latestNews].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0)).slice(0, 4),
    [latestNews],
  );
  const keywordChips = useMemo(() => {
    const tagMap = new Map<string, number>();
    uniqueNews([...latestNews, ...homeFeed.weeklyPopular, ...homeFeed.recommendedNews]).forEach((news) => {
      news.tags?.forEach((tag) => tagMap.set(tag.name, (tagMap.get(tag.name) ?? 0) + 1));
    });
    return [...tagMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name);
  }, [homeFeed.recommendedNews, homeFeed.weeklyPopular, latestNews]);

  const personalizedNews = useMemo(() => {
    const categoryIds = new Set(report?.topCategories?.map((item) => item.category.id) || []);
    const savedIds = new Set(asArray<Bookmark>(bookmarks).map((bookmark) => bookmark.news?.id).filter(Boolean));
    const candidates = uniqueNews([...homeFeed.recommendedNews, ...latestNews, ...weeklyPopular]);
    return candidates
      .map((news) => {
        let score = 0;
        if (news.category?.id && categoryIds.has(news.category.id)) score += 4;
        if (savedIds.has(news.id)) score += 3;
        score += Math.min(news.likeCount ?? 0, 20) / 10;
        score += Math.min(news.viewCount ?? 0, 100) / 50;
        return { news, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.news)
      .slice(0, 4);
  }, [bookmarks, homeFeed.recommendedNews, latestNews, report, weeklyPopular]);

  const hasMore = latestNews.length < total;
  const isActiveSubscriber = subscription?.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-white text-gray-950 transition-colors dark:bg-[#0b0b0b] dark:text-white">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-[#0b0b0b]/95">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">MINIME</Link>
          <SearchPreviewInput className="flex-1" placeholder="뉴스, 기자, 아이디 검색" />
          {isLoggedIn ? (
            <Link href="/mypage" aria-label="마이페이지">
              <ProfileAvatar nickname={user?.nickname} size="md" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm text-gray-500 transition hover:text-gray-900 dark:hover:text-white">로그인</Link>
              <Link href="/signup" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700">가입</Link>
            </div>
          )}
        </div>

        <div className="mx-auto max-w-5xl overflow-x-auto px-4 pb-4 pt-1">
          <div className="flex min-w-max gap-1.5">
            <button
              onClick={() => setActiveCategoryId(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                activeCategoryId === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              전체
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategoryId(category.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeCategoryId === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-5 pb-28">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          </div>
        ) : featuredNews ? (
          <section className={`grid gap-4 ${editorPickedNews.length > 0 ? 'lg:grid-cols-[1.4fr_0.8fr]' : ''}`}>
            <Link href={`/news/${featuredNews.id}`} className="group overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 transition hover:border-blue-400 dark:border-gray-800 dark:bg-gray-900">
              <div className="relative h-[22rem] max-h-[58vh] min-h-72">
                <NewsThumb news={featuredNews} className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 p-5">
                  <div className="mb-3 inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">오늘의 주요 뉴스</div>
                  <h1 className="line-clamp-2 text-2xl font-bold leading-tight text-white">{featuredNews.title}</h1>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-200">{featuredNews.lead || featuredNews.aiSummary || stripHtml(featuredNews.content)}</p>
                </div>
              </div>
            </Link>

            {editorPickedNews.length > 0 && (
              <aside className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-3 text-sm font-bold">관리자가 고른 뉴스</h2>
                <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                  {editorPickedNews.map((news, index) => (
                    <Link key={news.id} href={`/news/${news.id}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold">{news.title}</p>
                        <p className="mt-1 text-xs text-gray-500">조회 {(news.viewCount ?? 0).toLocaleString()}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </aside>
            )}
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold">뉴스레터로 흐름을 놓치지 마세요</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {isActiveSubscriber
                    ? `${planLabel[subscription?.planType ?? 'all']} 플랜을 구독 중입니다. 마이페이지에서 수신 설정을 관리할 수 있어요.`
                    : '데일리와 위클리 뉴스레터로 중요한 기술 뉴스를 정리해서 받아보세요.'}
                </p>
              </div>
              <Link
                href={isActiveSubscriber ? '/mypage' : '/subscriptions/plans'}
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                {isActiveSubscriber ? '설정 보기' : '구독하기'}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-bold">이번 주 뉴스레터 미리보기</h2>
            <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
              {newsletterPreview.slice(0, 3).map((news) => (
                <Link key={news.id} href={`/news/${news.id}`} className="line-clamp-1 hover:text-blue-500">
                  {news.title}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {isLoggedIn && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">내 관심 기반 추천</h2>
              <Link href="/mypage/bookmarks" className="text-sm text-blue-500">저장한 뉴스</Link>
            </div>
            {personalizedNews.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {personalizedNews.map((news) => (
                  <Link key={news.id} href={`/news/${news.id}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:border-blue-400 dark:border-gray-800 dark:bg-gray-900">
                    <NewsThumb news={news} className="h-28 w-full" />
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-semibold">{news.title}</p>
                      <p className="mt-2 text-xs text-gray-500">{news.category?.name ?? '추천'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700">
                뉴스를 저장하거나 좋아요를 누르면 관심 기반 추천이 좋아집니다.
              </div>
            )}
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">최신 뉴스</h2>
            <span className="text-xs text-gray-500">{total.toLocaleString()}개</span>
          </div>
          {newsLoading && latestNews.length === 0 ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
            </div>
          ) : latestNews.length > 0 ? (
            <div className="flex flex-col">
              {latestNews.map((news) => <NewsListRow key={news.id} news={news} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700">
              표시할 뉴스가 없습니다.
            </div>
          )}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={newsLoading}
              className="mt-4 w-full rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-600 transition hover:border-gray-500 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              {newsLoading ? '불러오는 중...' : '더보기'}
            </button>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-base font-bold">이번 주 인기 뉴스 TOP 5</h2>
            <div className="flex flex-col gap-2">
              {weeklyPopular.map((news, index) => (
                <Link key={news.id} href={`/news/${news.id}`} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 transition hover:border-blue-400 dark:border-gray-800 dark:bg-gray-900">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {index + 1}
                  </span>
                  <p className="line-clamp-1 flex-1 text-sm font-semibold">{news.title}</p>
                  <span className="text-xs text-gray-500">{(news.viewCount ?? 0).toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-base font-bold">저장/좋아요 많은 뉴스</h2>
            <div className="grid gap-2">
              {likedNews.map((news) => (
                <Link key={news.id} href={`/news/${news.id}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3 transition hover:border-blue-400 dark:border-gray-800 dark:bg-gray-900">
                  <p className="line-clamp-1 text-sm font-semibold">{news.title}</p>
                  <div className="mt-2 flex gap-3 text-xs text-gray-500">
                    <span>좋아요 {(news.likeCount ?? 0).toLocaleString()}</span>
                    <span>조회 {(news.viewCount ?? 0).toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {keywordChips.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-bold">지금 많이 보는 키워드</h2>
            <div className="flex flex-wrap gap-2">
              {keywordChips.map((keyword) => (
                <Link key={keyword} href={`/search?tag=${encodeURIComponent(keyword)}`} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-blue-600 hover:text-white dark:bg-gray-800 dark:text-gray-300">
                  #{keyword}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
