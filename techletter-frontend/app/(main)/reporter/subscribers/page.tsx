'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProfileAvatar from '@/components/common/ProfileAvatar';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

interface ReporterSubscriber {
  id: number;
  createdAt: string;
  user: {
    id: number;
    email: string;
    nickname: string;
    profileImage?: string | null;
    createdAt: string;
  } | null;
}

export default function ReporterSubscribersPage() {
  const router = useRouter();
  const [subscribers, setSubscribers] = useState<ReporterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ReporterSubscriber[]>('/reporters/me/subscribers')
      .then((res) => setSubscribers(res.data || []))
      .catch(() => router.push('/mypage/profile'))
      .finally(() => setLoading(false));
  }, [router]);

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
              <h1 className="text-base font-bold">구독자</h1>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">내 기자 프로필을 구독한 사용자를 확인합니다.</p>
            </div>
          </div>
          <Link href="/reporter/dashboard" className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-[#3A3A3A] dark:text-gray-300 dark:hover:bg-[#1E1E1E]">
            기자센터
          </Link>
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">구독자 {subscribers.length.toLocaleString()}명</h2>
              <p className="mt-1 text-xs text-gray-500">기자 계정 기준으로 연결된 구독자 목록입니다.</p>
            </div>
            <Link href="/reporter/feed" className="text-xs font-semibold text-blue-600 dark:text-blue-300">
              피드 작성
            </Link>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">불러오는 중...</div>
          ) : subscribers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center text-sm text-gray-500 dark:border-[#3A3A3A] dark:bg-[#121212]">
              아직 내 기자 프로필을 구독한 사용자가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {subscribers.map((subscriber) => (
                <article key={subscriber.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-[#2E2E2E] dark:bg-[#121212]">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar nickname={subscriber.user?.nickname} imageUrl={subscriber.user?.profileImage} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{subscriber.user?.nickname || '탈퇴한 사용자'}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{subscriber.user?.email || '-'}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-gray-500">구독일 {new Date(subscriber.createdAt).toLocaleDateString('ko-KR')}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
