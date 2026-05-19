'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import ProfileAvatar from '@/components/common/ProfileAvatar';

interface Reporter {
  id: number;
  slug: string;
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  specialties: string[];
  subscriberCount: number;
  newsCount: number;
}

export default function ReportersPage() {
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reporters')
      .then((res) => setReporters(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-950 dark:bg-[#121212] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-[#2E2E2E] dark:bg-[#121212]/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div>
            <h1 className="text-base font-bold">기자</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">관심 있는 기자를 구독하고 피드를 모아보세요.</p>
          </div>
          <Link href="/mypage/profile" className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 dark:border-[#3A3A3A] dark:text-gray-300">
            마이페이지
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-[#1E1E1E]" />
            ))}
          </div>
        ) : reporters.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {reporters.map((reporter) => (
              <Link
                key={reporter.id}
                href={`/reporters/${reporter.slug}`}
                className="rounded-2xl border border-gray-100 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm dark:border-[#2E2E2E] dark:bg-[#1E1E1E] dark:hover:border-blue-900"
              >
                <div className="flex items-center gap-4">
                  <ProfileAvatar nickname={reporter.displayName} imageUrl={reporter.profileImage} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold">{reporter.displayName}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                      {reporter.headline || 'TechLetter verified reporter'}
                    </p>
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {reporter.bio || '아직 기자 소개가 작성되지 않았습니다.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {reporter.specialties.slice(0, 3).map((item) => (
                    <span key={item} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>기사 {reporter.newsCount.toLocaleString()}개</span>
                  <span>구독자 {reporter.subscriberCount.toLocaleString()}명</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-[#3A3A3A] dark:bg-[#1E1E1E]">
            <p className="text-sm font-semibold">아직 승인된 기자가 없습니다.</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">첫 기자 프로필이 승인되면 이곳에 표시됩니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}
