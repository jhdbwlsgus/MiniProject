'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { getImageUrl } from '@/lib/api';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

interface NewsSummary {
  id: number;
  title: string;
  viewCount: number;
  likeCount: number;
  shareCount?: number;
  thumbnailUrl: string | null;
  createdAt: string;
  publishedAt?: string | null;
  author?: { nickname: string };
  category?: { name: string };
}

interface TrendPoint {
  date: string;
  label: string;
  count: number;
}

interface CategoryPerformance {
  name: string;
  count: number;
  views: number;
  rate: number;
}

interface Stats {
  totalUsers?: number;
  totalSubscribers?: number;
  activeSubscribers?: number;
  canceledSubscribers?: number;
  failedSubscribers?: number;
  monthNewSubscribers?: number;
  monthlyCancelRate?: number;
  subscriberPlans?: {
    daily?: number;
    weekly?: number;
    all?: number;
    premium?: number;
  };
  totalNews?: number;
  draftNews?: number;
  scheduledNews?: number;
  pendingNewsletter?: number;
  todayPublishedNews?: number;
  aiNewsRate?: number;
  totalComments?: number;
  totalLikes?: number;
  totalViews?: number;
  todayViews?: number;
  averageViews?: number;
  likeConversionRate?: number;
  commentParticipationRate?: number;
  newsletterMetrics?: {
    averageOpenRate?: number;
    averageClickRate?: number;
    deliverySuccessRate?: number;
    averageDwellSeconds?: number;
    sentRecipients?: number;
    successCount?: number;
    failCount?: number;
  };
  subscriberTrend?: TrendPoint[];
  categoryPerformance?: CategoryPerformance[];
  topNews?: NewsSummary[];
  recentNews?: NewsSummary[];
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return '-';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('ko-KR');
};

const formatNumber = (value: number | undefined) => (value ?? 0).toLocaleString();
const formatPercent = (value: number | undefined) => `${value ?? 0}%`;

function KpiCard({ label, value, sub, tone = 'text-blue-500' }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-gray-500">{label}</div>
      {sub && <div className="mt-2 text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 text-sm font-bold text-gray-700 dark:text-gray-200">{title}</h2>
      {children}
    </section>
  );
}

export default function AdminStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<Stats>('/stats/dashboard');
        setStats(res.data);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-sm text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const safeStats = {
    totalUsers: stats?.totalUsers ?? 0,
    totalSubscribers: stats?.totalSubscribers ?? 0,
    activeSubscribers: stats?.activeSubscribers ?? 0,
    canceledSubscribers: stats?.canceledSubscribers ?? 0,
    failedSubscribers: stats?.failedSubscribers ?? 0,
    monthNewSubscribers: stats?.monthNewSubscribers ?? 0,
    monthlyCancelRate: stats?.monthlyCancelRate ?? 0,
    subscriberPlans: {
      daily: stats?.subscriberPlans?.daily ?? 0,
      weekly: stats?.subscriberPlans?.weekly ?? 0,
      all: stats?.subscriberPlans?.all ?? 0,
      premium: stats?.subscriberPlans?.premium ?? 0,
    },
    totalNews: stats?.totalNews ?? 0,
    draftNews: stats?.draftNews ?? 0,
    scheduledNews: stats?.scheduledNews ?? 0,
    pendingNewsletter: stats?.pendingNewsletter ?? 0,
    todayPublishedNews: stats?.todayPublishedNews ?? 0,
    aiNewsRate: stats?.aiNewsRate ?? 0,
    totalComments: stats?.totalComments ?? 0,
    totalLikes: stats?.totalLikes ?? 0,
    totalViews: stats?.totalViews ?? 0,
    todayViews: stats?.todayViews ?? 0,
    averageViews: stats?.averageViews ?? 0,
    likeConversionRate: stats?.likeConversionRate ?? 0,
    commentParticipationRate: stats?.commentParticipationRate ?? 0,
    newsletterMetrics: {
      averageOpenRate: stats?.newsletterMetrics?.averageOpenRate ?? 0,
      averageClickRate: stats?.newsletterMetrics?.averageClickRate ?? 0,
      deliverySuccessRate: stats?.newsletterMetrics?.deliverySuccessRate ?? 0,
      averageDwellSeconds: stats?.newsletterMetrics?.averageDwellSeconds ?? 0,
      sentRecipients: stats?.newsletterMetrics?.sentRecipients ?? 0,
      successCount: stats?.newsletterMetrics?.successCount ?? 0,
      failCount: stats?.newsletterMetrics?.failCount ?? 0,
    },
    subscriberTrend: stats?.subscriberTrend ?? [],
    categoryPerformance: stats?.categoryPerformance ?? [],
    topNews: stats?.topNews ?? [],
    recentNews: stats?.recentNews ?? [],
  };

  const maxSubscriberTrend = Math.max(...safeStats.subscriberTrend.map((item) => item.count), 1);
  const maxCategoryViews = Math.max(...safeStats.categoryPerformance.map((item) => item.views), 1);

  return (
    <div className="min-h-screen bg-white pb-28 text-gray-950 dark:bg-gray-950 dark:text-white">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <button onClick={() => router.push('/mypage')} className="text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" aria-label="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="flex-1 text-base font-bold">통계 대시보드</span>
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">콘텐츠</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="총 기사 수" value={formatNumber(safeStats.totalNews)} tone="text-blue-500" sub={`임시저장 ${formatNumber(safeStats.draftNews)}개`} />
            <KpiCard label="오늘 발행 기사" value={formatNumber(safeStats.todayPublishedNews)} tone="text-emerald-500" />
            <KpiCard label="예약 발송 대기" value={formatNumber(safeStats.pendingNewsletter + safeStats.scheduledNews)} tone="text-violet-500" sub={`뉴스 ${formatNumber(safeStats.scheduledNews)} · 뉴스레터 ${formatNumber(safeStats.pendingNewsletter)}`} />
            <KpiCard label="AI 작성 기사 비율" value={formatPercent(safeStats.aiNewsRate)} tone="text-cyan-500" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">구독/매출</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="전체 구독자" value={formatNumber(safeStats.totalSubscribers)} tone="text-gray-900 dark:text-white" />
            <KpiCard label="활성 구독자" value={formatNumber(safeStats.activeSubscribers)} tone="text-emerald-500" />
            <KpiCard label="이번 달 신규 구독" value={formatNumber(safeStats.monthNewSubscribers)} tone="text-blue-500" />
            <KpiCard label="이번 달 해지율" value={formatPercent(safeStats.monthlyCancelRate)} tone="text-amber-500" sub={`누적 해지 ${formatNumber(safeStats.canceledSubscribers)}명`} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">뉴스레터 성과</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="평균 오픈율" value={formatPercent(safeStats.newsletterMetrics.averageOpenRate)} tone="text-blue-500" sub="오픈 추적 로그 연결 후 반영" />
            <KpiCard label="평균 클릭률" value={formatPercent(safeStats.newsletterMetrics.averageClickRate)} tone="text-cyan-500" sub="클릭 추적 로그 연결 후 반영" />
            <KpiCard label="발송 성공률" value={formatPercent(safeStats.newsletterMetrics.deliverySuccessRate)} tone="text-emerald-500" sub={`성공 ${formatNumber(safeStats.newsletterMetrics.successCount)} · 실패 ${formatNumber(safeStats.newsletterMetrics.failCount)}`} />
            <KpiCard label="평균 체류시간" value={`${formatNumber(safeStats.newsletterMetrics.averageDwellSeconds)}초`} tone="text-violet-500" sub="읽은 시간 로그 연결 후 반영" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">사용자 반응</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="가장 인기 기사" value={safeStats.topNews[0]?.title ? '1위' : '-'} tone="text-yellow-500" sub={safeStats.topNews[0]?.title ?? '게시된 뉴스 없음'} />
            <KpiCard label="오늘 조회수" value={formatNumber(safeStats.todayViews)} tone="text-blue-500" sub="로그인 사용자 조회 기록 기준" />
            <KpiCard label="좋아요 전환율" value={formatPercent(safeStats.likeConversionRate)} tone="text-rose-500" sub={`좋아요 ${formatNumber(safeStats.totalLikes)}개`} />
            <KpiCard label="댓글 참여율" value={formatPercent(safeStats.commentParticipationRate)} tone="text-amber-500" sub={`댓글 ${formatNumber(safeStats.totalComments)}개`} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="구독자 증가 추이">
            <div className="flex h-44 items-end gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
              {safeStats.subscriberTrend.map((item) => (
                <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end justify-center rounded-t-lg bg-gray-100 dark:bg-gray-800">
                    <div
                      className="w-full rounded-t-lg bg-blue-500 transition-all"
                      style={{ height: `${Math.max(6, Math.round((item.count / maxSubscriberTrend) * 100))}%` }}
                      title={`${item.label}: ${item.count}명`}
                    />
                  </div>
                  <div className="text-[11px] text-gray-500">{item.label}</div>
                  <div className="text-xs font-semibold">{formatNumber(item.count)}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="인기 카테고리">
            <div className="flex flex-col gap-3">
              {safeStats.categoryPerformance.map((category) => (
                <div key={category.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{category.name}</span>
                    <span className="text-gray-500">{formatPercent(category.rate)} · 조회 {formatNumber(category.views)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${Math.max(4, Math.round((category.views / maxCategoryViews) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
              {safeStats.categoryPerformance.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700">
                  카테고리 데이터가 없습니다.
                </div>
              )}
            </div>
          </SectionCard>
        </section>

        <SectionCard title="기사 성과 순위">
          <div className="flex flex-col gap-2">
            {safeStats.topNews.map((news, index) => (
              <Link key={news.id} href={`/news/${news.id}`}>
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-500">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {index + 1}
                  </div>

                  {getImageUrl(news.thumbnailUrl) ? (
                    <img src={getImageUrl(news.thumbnailUrl)} alt={news.title} className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 dark:bg-gray-700">
                      없음
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{news.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span>{news.category?.name ?? '카테고리 없음'}</span>
                      <span>{formatDate(news.publishedAt ?? news.createdAt)}</span>
                    </div>
                  </div>

                  <div className="grid shrink-0 grid-cols-3 gap-3 text-right text-xs text-gray-500">
                    <div>조회 {formatNumber(news.viewCount)}</div>
                    <div>좋아요 {formatNumber(news.likeCount)}</div>
                    <div>공유 {formatNumber(news.shareCount)}</div>
                  </div>
                </div>
              </Link>
            ))}

            {safeStats.topNews.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700">
                아직 게시된 뉴스가 없습니다.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="최근 발행 뉴스">
          <div className="grid gap-2">
            {safeStats.recentNews.map((news) => (
              <Link key={news.id} href={`/news/${news.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-500">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">{news.title}</p>
                  <p className="mt-1 text-xs text-gray-500">{news.author?.nickname ?? '작성자 없음'} · {formatDate(news.publishedAt ?? news.createdAt)}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-gray-500">
                  <div>조회 {formatNumber(news.viewCount)}</div>
                  <div>좋아요 {formatNumber(news.likeCount)}</div>
                </div>
              </Link>
            ))}

            {safeStats.recentNews.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500 dark:border-gray-700">
                최근 발행 뉴스가 없습니다.
              </div>
            )}
          </div>
        </SectionCard>
      </main>
    </div>
  );
}
