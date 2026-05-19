'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProfileAvatar from '@/components/common/ProfileAvatar';

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

interface ReporterFeed {
  id: number;
  type: string;
  title?: string | null;
  content: string;
  createdAt: string;
}

const feedTypes = [
  { value: 'comment', label: 'IT 코멘트' },
  { value: 'briefing', label: '브리핑' },
  { value: 'behind', label: '비하인드' },
  { value: 'analysis', label: '분석' },
  { value: 'link', label: '추천 링크' },
  { value: 'issue', label: '기술 이슈' },
];

export default function ReporterDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<ReporterDashboard | null>(null);
  const [feeds, setFeeds] = useState<ReporterFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFeed, setSavingFeed] = useState(false);
  const [feedForm, setFeedForm] = useState({
    type: 'comment',
    title: '',
    content: '',
    linkUrl: '',
  });

  const fetchDashboard = async () => {
    const [dashboardRes, feedRes] = await Promise.all([
      api.get('/reporters/me/dashboard'),
      api.get('/reporters/me/feed'),
    ]);
    setDashboard(dashboardRes.data);
    setFeeds(feedRes.data || []);
  };

  useEffect(() => {
    fetchDashboard()
      .catch(() => router.push('/mypage/profile'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreateFeed = async () => {
    if (!feedForm.content.trim()) {
      alert('피드 내용을 입력해주세요.');
      return;
    }
    setSavingFeed(true);
    try {
      await api.post('/reporters/me/feed', {
        type: feedForm.type,
        title: feedForm.title.trim(),
        content: feedForm.content.trim(),
        linkUrl: feedForm.linkUrl.trim(),
        published: true,
      });
      setFeedForm({ type: 'comment', title: '', content: '', linkUrl: '' });
      await fetchDashboard();
    } catch {
      alert('피드 작성에 실패했습니다.');
    } finally {
      setSavingFeed(false);
    }
  };

  if (loading || !dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-[#2A2A2A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-950 dark:bg-[#121212] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-[#2E2E2E] dark:bg-[#121212]/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#1E1E1E]" aria-label="뒤로가기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div>
              <h1 className="text-base font-bold">기자 대시보드</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">내 기사, 피드, 구독자 반응을 관리합니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/reporter/subscribers" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-[#3A3A3A] dark:text-gray-300 dark:hover:bg-[#2A2A2A]">
              내 구독자
            </Link>
            <Link href="/admin/news/create" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
              기사 작성
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
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
            <Link href={`/reporters/${dashboard.profile.slug}`} className="mt-4 block rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-[#3A3A3A] dark:text-gray-300 dark:hover:bg-[#2A2A2A]">
              공개 프로필 보기
            </Link>
          </section>

          <section className="grid grid-cols-2 gap-2">
            {[
              ['구독자', dashboard.stats.subscriberCount],
              ['발행 기사', dashboard.stats.publishedCount],
              ['임시저장', dashboard.stats.draftCount],
              ['피드', dashboard.stats.feedCount],
              ['조회수', dashboard.stats.totalViews],
              ['좋아요', dashboard.stats.totalLikes],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
                <p className="text-xl font-bold">{Number(value).toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </section>
        </aside>

        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">기자 피드 작성</h2>
              <span className="text-xs text-gray-500">짧은 코멘트와 브리핑을 남겨보세요.</span>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                <select value={feedForm.type} onChange={(e) => setFeedForm((prev) => ({ ...prev, type: e.target.value }))} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none dark:border-[#3A3A3A] dark:bg-[#121212]">
                  {feedTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <input value={feedForm.title} placeholder="제목 선택 입력" onChange={(e) => setFeedForm((prev) => ({ ...prev, title: e.target.value }))} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none dark:border-[#3A3A3A] dark:bg-[#121212]" />
              </div>
              <textarea value={feedForm.content} rows={5} placeholder="오늘의 기술 이슈, 기사 비하인드, 짧은 분석을 작성하세요." onChange={(e) => setFeedForm((prev) => ({ ...prev, content: e.target.value }))} className="resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none dark:border-[#3A3A3A] dark:bg-[#121212]" />
              <input value={feedForm.linkUrl} placeholder="추천 링크 URL 선택 입력" onChange={(e) => setFeedForm((prev) => ({ ...prev, linkUrl: e.target.value }))} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none dark:border-[#3A3A3A] dark:bg-[#121212]" />
              <button onClick={handleCreateFeed} disabled={savingFeed} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                {savingFeed ? '등록 중...' : '피드 등록'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <h2 className="text-sm font-bold">내 기사</h2>
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
                  {dashboard.news.map((news) => (
                    <tr key={news.id}>
                      <td className="py-3">
                        <Link href={`/admin/news/${news.id}/edit`} className="line-clamp-1 font-medium hover:text-blue-600">{news.title}</Link>
                      </td>
                      <td className="py-3 text-gray-500">{news.status}</td>
                      <td className="py-3">{news.viewCount.toLocaleString()}</td>
                      <td className="py-3">{news.likeCount.toLocaleString()}</td>
                      <td className="py-3 text-gray-500">{new Date(news.createdAt).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <h2 className="text-sm font-bold">최근 피드</h2>
            <div className="mt-4 grid gap-3">
              {feeds.length ? feeds.map((feed) => (
                <article key={feed.id} className="rounded-xl bg-gray-50 p-4 dark:bg-[#121212]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">{feed.type}</span>
                    <span className="text-[11px] text-gray-400">{new Date(feed.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {feed.title && <p className="mt-2 text-sm font-bold">{feed.title}</p>}
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">{feed.content}</p>
                </article>
              )) : (
                <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-[#121212]">아직 작성한 피드가 없습니다.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
