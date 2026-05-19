'use client';

import { ReactNode, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api, { getImageUrl } from '@/lib/api';
import SearchPreviewInput from '@/components/common/SearchPreviewInput';

interface News {
  id: number;
  title: string;
  content?: string;
  lead?: string;
  thumbnailUrl: string | null;
  viewCount: number;
  category?: { name: string };
}

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

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#121212]" />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTag = searchParams.get('tag') || '';
  const [query, setQuery] = useState(initialQuery || (initialTag ? `#${initialTag}` : ''));
  const [resultLabel, setResultLabel] = useState('');
  const [newsList, setNewsList] = useState<News[]>([]);
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async (value: string, mode: 'search' | 'tag' = 'search') => {
    const cleanValue = value.trim().replace(/^#/, '');
    if (!cleanValue) return;

    setLoading(true);
    setResultLabel(mode === 'tag' ? `#${cleanValue}` : cleanValue);
    try {
      const params = mode === 'tag' ? { tag: cleanValue, limit: 30 } : { search: cleanValue, limit: 30 };
      const [newsRes, reporterRes] = await Promise.all([
        api.get('/news', { params }),
        mode === 'tag' ? Promise.resolve({ data: [] }) : api.get('/reporters').catch(() => ({ data: [] })),
      ]);
      const normalized = cleanValue.toLowerCase();
      setNewsList(newsRes.data.news || newsRes.data || []);
      setReporters((reporterRes.data || []).filter((reporter: Reporter) => {
        const haystack = [
          reporter.displayName,
          reporter.headline,
          reporter.bio,
          ...(reporter.specialties || []),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalized);
      }));
    } catch (err) {
      console.error('검색 오류:', err);
      setNewsList([]);
      setReporters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTag) {
      setQuery(`#${initialTag}`);
      runSearch(initialTag, 'tag');
      return;
    }
    if (initialQuery) {
      setQuery(initialQuery);
      runSearch(initialQuery);
    }
  }, [initialQuery, initialTag]);

  const handleSearch = async (value = query) => {
    const mode = value.trim().startsWith('#') ? 'tag' : 'search';
    await runSearch(value, mode);
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-colors dark:bg-[#121212]">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-[#2E2E2E] dark:bg-[#121212]/80">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-center px-4">
          <SearchPreviewInput
            value={query}
            onValueChange={setQuery}
            onSearch={handleSearch}
            placeholder="뉴스, 태그, 기자, 아이디 검색"
            className="w-full"
          />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6 pb-32">
        {resultLabel && <p className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">검색 결과: {resultLabel}</p>}
        <LocalResults loading={loading} newsList={newsList} reporters={reporters} hasQuery={!!resultLabel} />
      </main>
    </div>
  );
}

function LocalResults({
  loading,
  newsList,
  reporters,
  hasQuery,
}: {
  loading: boolean;
  newsList: News[];
  reporters: Reporter[];
  hasQuery: boolean;
}) {
  if (loading) return <LoadingList />;

  if (!hasQuery) {
    return (
      <EmptyState>
        기사 제목, 본문, 카테고리, 태그, 기자 이름을 검색할 수 있습니다. 태그는 #AI처럼 입력해도 됩니다.
      </EmptyState>
    );
  }

  if (newsList.length === 0 && reporters.length === 0) {
    return <EmptyState>검색 결과가 없습니다.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-5">
      {reporters.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">기자</h2>
          <div className="flex flex-col gap-3">
            {reporters.map((reporter) => (
              <Link key={reporter.id} href={`/reporters/${reporter.slug}`}>
                <article className="rounded-2xl border border-blue-100 bg-white p-4 transition hover:border-blue-300 dark:border-blue-900/40 dark:bg-[#1E1E1E]">
                  <div className="flex items-center gap-3">
                    {getImageUrl(reporter.profileImage) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getImageUrl(reporter.profileImage)} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {reporter.displayName[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{reporter.displayName}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                        {reporter.headline || 'TechLetter verified reporter'}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                      기자
                    </span>
                  </div>
                  <div className="mt-3 flex gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                    <span>기사 {reporter.newsCount}</span>
                    <span>구독자 {reporter.subscriberCount}</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      {newsList.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">기사</h2>
          <div className="flex flex-col">
            {newsList.map((news) => (
              <Link key={news.id} href={`/news/${news.id}`}>
                <article className="mb-3 flex gap-3 rounded-2xl border-b border-gray-100 bg-white px-3 py-4 transition hover:bg-gray-50 dark:border-[#2E2E2E] dark:bg-[#1E1E1E] dark:hover:bg-[#2A2A2A]">
                  {getImageUrl(news.thumbnailUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getImageUrl(news.thumbnailUrl)}
                      alt={news.title}
                      className="h-16 w-20 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 dark:bg-[#2A2A2A] dark:text-gray-500">
                      이미지 없음
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {news.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                      {news.lead || news.content?.replace(/<[^>]*>/g, '')}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                      <span>{news.category?.name || '뉴스'}</span>
                      <span>조회 {news.viewCount}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-[#1E1E1E]" />
      ))}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-12 text-center text-sm text-gray-500 dark:border-[#2E2E2E] dark:bg-[#1E1E1E] dark:text-gray-400">
      {children}
    </div>
  );
}
