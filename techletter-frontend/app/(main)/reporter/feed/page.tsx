'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

interface ReporterFeed {
  id: number;
  type: string;
  title?: string | null;
  content: string;
  linkUrl?: string | null;
  createdAt: string;
}

const feedTypes = [
  { value: 'comment', label: '코멘트' },
  { value: 'briefing', label: '브리핑' },
  { value: 'behind', label: '비하인드' },
  { value: 'analysis', label: '분석' },
  { value: 'link', label: '추천 링크' },
  { value: 'issue', label: '기술 이슈' },
];

export default function ReporterFeedPage() {
  const router = useRouter();
  const [feeds, setFeeds] = useState<ReporterFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFeed, setSavingFeed] = useState(false);
  const [feedForm, setFeedForm] = useState({
    type: 'comment',
    title: '',
    content: '',
    linkUrl: '',
  });

  const fetchFeeds = async () => {
    const res = await api.get('/reporters/me/feed');
    setFeeds(res.data || []);
  };

  useEffect(() => {
    fetchFeeds()
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
      await fetchFeeds();
    } catch {
      alert('피드 작성에 실패했습니다.');
    } finally {
      setSavingFeed(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-[#2A2A2A]" />
      </div>
    );
  }

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
              <h1 className="text-base font-bold">피드</h1>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">짧은 코멘트, 링크, 기사 예고를 공개 프로필에 올립니다.</p>
            </div>
          </div>
          <Link href="/reporter/dashboard" className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-[#3A3A3A] dark:text-gray-300 dark:hover:bg-[#1E1E1E]">
            기자센터
          </Link>
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold">새 피드 작성</h2>
            <span className="text-xs text-gray-500">공개 기자 프로필에 표시됩니다.</span>
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
            <textarea value={feedForm.content} rows={7} placeholder="오늘의 기술 이슈, 기사 비하인드, 짧은 분석을 작성하세요." onChange={(e) => setFeedForm((prev) => ({ ...prev, content: e.target.value }))} className="resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none dark:border-[#3A3A3A] dark:bg-[#121212]" />
            <input value={feedForm.linkUrl} placeholder="추천 링크 URL 선택 입력" onChange={(e) => setFeedForm((prev) => ({ ...prev, linkUrl: e.target.value }))} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none dark:border-[#3A3A3A] dark:bg-[#121212]" />
            <button onClick={handleCreateFeed} disabled={savingFeed} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
              {savingFeed ? '등록 중...' : '피드 등록'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
          <h2 className="text-sm font-bold">최근 피드</h2>
          <div className="mt-4 grid gap-3">
            {feeds.length ? feeds.map((feed) => (
              <article key={feed.id} className="rounded-xl bg-gray-50 p-4 dark:bg-[#121212]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">{feedTypes.find((type) => type.value === feed.type)?.label || feed.type}</span>
                  <span className="text-[11px] text-gray-400">{new Date(feed.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
                {feed.title && <p className="mt-2 text-sm font-bold">{feed.title}</p>}
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">{feed.content}</p>
                {feed.linkUrl && (
                  <a href={feed.linkUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-blue-600 dark:text-blue-300">
                    링크 열기
                  </a>
                )}
              </article>
            )) : (
              <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-[#121212]">아직 작성한 피드가 없습니다.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
