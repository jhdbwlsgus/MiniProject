'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import api, { getImageUrl } from '@/lib/api';
import ProfileAvatar from './ProfileAvatar';

interface PreviewNews {
  id: number;
  title: string;
  lead?: string | null;
  thumbnailUrl?: string | null;
  category?: { name: string } | null;
  author?: { nickname: string; profileImage?: string | null } | null;
}

interface PreviewReporter {
  id: number;
  userId: number;
  slug: string;
  displayName: string;
  headline?: string | null;
  profileImage?: string | null;
}

interface PreviewResponse {
  news: PreviewNews[];
  reporters: PreviewReporter[];
}

interface SearchPreviewInputProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchPreviewInput({
  value,
  onValueChange,
  onSearch,
  placeholder = '뉴스, 기자, 아이디 검색',
  className = '',
}: SearchPreviewInputProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(value || '');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse>({ news: [], reporters: [] });

  const query = value ?? internalValue;
  const hasPreview = focused && query.trim().length > 0 && (loading || preview.news.length > 0 || preview.reporters.length > 0);

  useEffect(() => {
    if (value !== undefined) setInternalValue(value);
  }, [value]);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setPreview({ news: [], reporters: [] });
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<PreviewResponse>('/search/preview', { params: { q: cleanQuery, limit: 5 } });
        setPreview({ news: res.data.news || [], reporters: res.data.reporters || [] });
      } catch {
        setPreview({ news: [], reporters: [] });
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const setQuery = (nextValue: string) => {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    setFocused(false);
    if (onSearch) onSearch(cleanQuery);
    else router.push(`/search?q=${encodeURIComponent(cleanQuery)}`);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={submit} className="relative">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className="h-11 w-full rounded-full border border-transparent bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800 dark:text-white dark:focus:border-blue-900"
        />
        <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </form>

      {hasPreview && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-900/10 dark:border-gray-800 dark:bg-[#171717]">
          {loading ? (
            <div className="px-4 py-5 text-center text-xs text-gray-500">검색 중...</div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto p-2">
              {preview.reporters.length > 0 && (
                <PreviewSection title="기자">
                  {preview.reporters.map((reporter) => (
                    <PreviewLink key={`reporter-${reporter.id}`} href={`/reporters/${reporter.slug}`} onClick={() => setFocused(false)}>
                      <ProfileAvatar nickname={reporter.displayName} imageUrl={getImageUrl(reporter.profileImage)} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{reporter.displayName}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          @{reporter.slug} · ID {reporter.userId}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">기자</span>
                    </PreviewLink>
                  ))}
                </PreviewSection>
              )}

              {preview.news.length > 0 && (
                <PreviewSection title="기사">
                  {preview.news.map((news) => (
                    <PreviewLink key={`news-${news.id}`} href={`/news/${news.id}`} onClick={() => setFocused(false)}>
                      {getImageUrl(news.thumbnailUrl) ? (
                        <img src={getImageUrl(news.thumbnailUrl)} alt="" className="h-10 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400 dark:bg-gray-800">뉴스</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">{news.title}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          ID {news.id} · {news.category?.name || '뉴스'} · {news.author?.nickname || '작성자'}
                        </p>
                      </div>
                    </PreviewLink>
                  ))}
                </PreviewSection>
              )}

              {preview.news.length === 0 && preview.reporters.length === 0 && (
                <div className="px-4 py-5 text-center text-xs text-gray-500">미리보기 결과가 없습니다.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-1">
      <p className="px-3 pb-1 text-[11px] font-bold text-gray-400">{title}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function PreviewLink({ href, onClick, children }: { href: string; onClick: () => void; children: ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800/70">
      {children}
    </Link>
  );
}
