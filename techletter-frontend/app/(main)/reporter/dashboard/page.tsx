'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProfileAvatar from '@/components/common/ProfileAvatar';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

interface ReporterDashboard {
  profile: {
    id: number;
    slug: string;
    displayName: string;
    headline?: string | null;
    profileImage?: string | null;
  };
  stats: {
    subscriberCount: number;
    feedCount: number;
    publishedCount: number;
    draftCount: number;
    totalViews: number;
    totalLikes: number;
    profileViewCount?: number;
    conversionRate?: number;
  };
  news: Array<{
    id: number;
    title: string;
    status: string;
    viewCount: number;
    likeCount: number;
    createdAt: string;
    category?: { name: string };
  }>;
}

const statusLabel: Record<string, string> = {
  draft: '임시저장',
  review: '검토중',
  approved: '승인',
  published: '발행',
  scheduled: '예약',
};

export default function ReporterDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<ReporterDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reporters/me/dashboard')
      .then((res) => setDashboard(res.data))
      .catch(() => router.push('/mypage/profile'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-[#2A2A2A]" />
      </div>
    );
  }

  const recentNews = dashboard.news.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-950 dark:bg-[#121212] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-[#2E2E2E] dark:bg-[#121212]/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.push('/mypage')}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#1E1E1E]"
              aria-label="마이페이지로 돌아가기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold">기자센터</h1>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">기사, 피드, 구독자, 프로필을 한 곳에서 관리합니다.</p>
            </div>
          </div>
          <Link href="/admin/news/create" className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            기사 작성
          </Link>
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <div className="flex items-center gap-4">
              <ProfileAvatar nickname={dashboard.profile.displayName} imageUrl={dashboard.profile.profileImage} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{dashboard.profile.displayName}</p>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                  {dashboard.profile.headline || 'TechLetter verified reporter'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/reporters/${dashboard.profile.slug}`} className="rounded-xl border border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-[#3A3A3A] dark:text-gray-300 dark:hover:bg-[#2A2A2A]">
                공개 보기
              </Link>
              <Link href="/reporter/profile/edit" className="rounded-xl bg-blue-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-blue-700">
                프로필 편집
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2">
            <Metric label="구독자" value={dashboard.stats.subscriberCount} />
            <Metric label="발행 기사" value={dashboard.stats.publishedCount} />
            <Metric label="임시저장" value={dashboard.stats.draftCount} />
            <Metric label="피드" value={dashboard.stats.feedCount} />
            <Metric label="총 조회" value={dashboard.stats.totalViews} />
            <Metric label="좋아요" value={dashboard.stats.totalLikes} />
            <Metric label="프로필 방문" value={dashboard.stats.profileViewCount || 0} />
            <Metric label="구독 전환" value={`${dashboard.stats.conversionRate || 0}%`} />
          </section>
        </aside>

        <section className="flex flex-col gap-5">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <h2 className="text-sm font-bold">빠른 작업</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <QuickLink href="/admin/news/create" title="기사 작성" desc="새 기사, 예약 발행, 구독자 전용 콘텐츠를 작성합니다." />
              <QuickLink href="/admin/news" title="내 기사" desc="내가 작성한 기사와 임시저장 글만 관리합니다." />
              <QuickLink href="/reporter/feed" title="피드" desc="짧은 코멘트, 링크, 기사 예고를 작성합니다." />
              <QuickLink href="/reporter/subscribers" title="구독자" desc="나를 구독한 사용자와 반응을 확인합니다." />
              <QuickLink href="/reporter/profile/edit" title="프로필 편집" desc="커버 이미지, 링크, 대표 기사, 구독 문구를 편집합니다." />
              <QuickLink href={`/reporters/${dashboard.profile.slug}`} title="공개 프로필" desc="사용자에게 보이는 기자 프로필을 확인합니다." />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">최근 기사</h2>
              <Link href="/admin/news" className="text-xs font-semibold text-blue-600 dark:text-blue-300">전체 관리</Link>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="py-2">제목</th>
                    <th className="py-2">상태</th>
                    <th className="py-2">조회</th>
                    <th className="py-2">좋아요</th>
                    <th className="py-2">작성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2E2E2E]">
                  {recentNews.length ? recentNews.map((news) => (
                    <tr key={news.id}>
                      <td className="py-3">
                        <Link href={`/admin/news/${news.id}/edit`} className="line-clamp-1 font-medium hover:text-blue-600">{news.title}</Link>
                      </td>
                      <td className="py-3 text-gray-500">{statusLabel[news.status] || news.status}</td>
                      <td className="py-3">{news.viewCount.toLocaleString()}</td>
                      <td className="py-3">{news.likeCount.toLocaleString()}</td>
                      <td className="py-3 text-gray-500">{new Date(news.createdAt).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-500">아직 작성한 기사가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
      <p className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-blue-200 hover:bg-blue-50 dark:border-[#2E2E2E] dark:bg-[#121212] dark:hover:border-blue-900 dark:hover:bg-blue-950/20">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{desc}</p>
    </Link>
  );
}
