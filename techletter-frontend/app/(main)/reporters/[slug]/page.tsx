'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api, { getImageUrl } from '@/lib/api';
import ProfileAvatar from '@/components/common/ProfileAvatar';

interface ReporterFeed {
  id: number;
  type: string;
  title?: string | null;
  content: string;
  linkUrl?: string | null;
  createdAt: string;
}

interface ReporterNews {
  id: number;
  title: string;
  lead?: string | null;
  thumbnailUrl?: string | null;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  category?: { name: string };
}

interface ReporterProfile {
  id: number;
  slug: string;
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  subscriptionPitch?: string | null;
  portfolioUrl?: string | null;
  blogUrl?: string | null;
  githubUrl?: string | null;
  specialties: string[];
  subscriberCount: number;
  conversionRate?: number;
  newsCount: number;
  featuredNews?: ReporterNews[];
  news: ReporterNews[];
  feeds: ReporterFeed[];
}

const feedTypeLabel: Record<string, string> = {
  comment: '코멘트',
  briefing: '브리핑',
  behind: '비하인드',
  analysis: '분석',
  link: '추천 링크',
  issue: '기술 이슈',
};

export default function ReporterProfilePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ReporterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    api.get(`/reporters/${params.slug}`)
      .then((res) => setProfile(res.data))
      .catch(() => router.push('/reporters'))
      .finally(() => setLoading(false));
  }, [params.slug, router]);

  const handleSubscribe = async () => {
    if (!profile) return;
    setSubscribing(true);
    try {
      await api.post(`/reporters/${profile.id}/subscribe`);
      setProfile((prev) => prev ? { ...prev, subscriberCount: prev.subscriberCount + 1 } : prev);
      alert('기자를 구독했습니다.');
    } catch {
      alert('로그인 후 기자를 구독할 수 있습니다.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-[#2A2A2A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-950 dark:bg-[#121212] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-[#2E2E2E] dark:bg-[#121212]/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <button onClick={() => router.back()} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#1E1E1E]" aria-label="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold">{profile.displayName}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">기자 프로필</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
          <div className="h-36 bg-gray-900 dark:bg-[#0B0B0B]">
            {getImageUrl(profile.coverImage) && (
              <img src={getImageUrl(profile.coverImage)} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="p-5 pt-0">
            <div className="-mt-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <ProfileAvatar nickname={profile.displayName} imageUrl={profile.profileImage} size="lg" />
                <div className="pb-1">
                  <p className="text-xl font-bold">{profile.displayName}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{profile.headline || 'TechLetter verified reporter'}</p>
                </div>
              </div>
              <button onClick={handleSubscribe} disabled={subscribing} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                {subscribing ? '구독 중...' : '기자 구독'}
              </button>
            </div>

            {profile.subscriptionPitch && (
              <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
                {profile.subscriptionPitch}
              </div>
            )}

            <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {profile.bio || '아직 기자 소개가 작성되지 않았습니다.'}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {profile.specialties.map((item) => (
                <span key={item} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {profile.portfolioUrl && <ExternalLink href={profile.portfolioUrl} label="Portfolio" />}
              {profile.blogUrl && <ExternalLink href={profile.blogUrl} label="Blog/SNS" />}
              {profile.githubUrl && <ExternalLink href={profile.githubUrl} label="GitHub" />}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Metric label="기사" value={profile.newsCount} />
              <Metric label="피드" value={profile.feeds.length} />
              <Metric label="구독자" value={profile.subscriberCount} />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            {!!profile.featuredNews?.length && (
              <div className="mb-6">
                <h2 className="text-sm font-bold">대표 기사</h2>
                <div className="mt-4 grid gap-3">
                  {profile.featuredNews.map((news) => (
                    <NewsCard key={news.id} news={news} featured />
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-sm font-bold">작성 기사</h2>
            <div className="mt-4 grid gap-3">
              {profile.news.length ? profile.news.map((news) => (
                <NewsCard key={news.id} news={news} />
              )) : (
                <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-[#121212]">아직 공개된 기사가 없습니다.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <h2 className="text-sm font-bold">기자 피드</h2>
            <div className="mt-4 flex flex-col gap-3">
              {profile.feeds.length ? profile.feeds.map((feed) => (
                <article key={feed.id} className="rounded-xl bg-gray-50 p-4 dark:bg-[#121212]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-blue-600 dark:bg-[#1E1E1E] dark:text-blue-300">
                      {feedTypeLabel[feed.type] || '피드'}
                    </span>
                    <span className="text-[11px] text-gray-400">{new Date(feed.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {feed.title && <p className="mt-3 text-sm font-bold">{feed.title}</p>}
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">{feed.content}</p>
                  {feed.linkUrl && (
                    <a href={feed.linkUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-blue-600 dark:text-blue-300">
                      링크 열기
                    </a>
                  )}
                </article>
              )) : (
                <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-[#121212]">아직 작성된 피드가 없습니다.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#121212]">
      <p className="text-lg font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-[#3A3A3A] dark:text-gray-300 dark:hover:border-blue-800 dark:hover:text-blue-300">
      {label}
    </a>
  );
}

function NewsCard({ news, featured = false }: { news: ReporterNews; featured?: boolean }) {
  return (
    <Link key={news.id} href={`/news/${news.id}`} className={`flex gap-3 rounded-xl border p-3 transition hover:border-blue-200 dark:hover:border-blue-900 ${featured ? 'border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20' : 'border-gray-100 dark:border-[#2E2E2E]'}`}>
      <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-[#2A2A2A]">
        {getImageUrl(news.thumbnailUrl) ? (
          <img src={getImageUrl(news.thumbnailUrl)} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {featured && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">대표</span>}
          <p className="line-clamp-2 text-sm font-semibold">{news.title}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{news.lead || news.category?.name || 'TechLetter'}</p>
        <p className="mt-2 text-[11px] text-gray-400">조회 {news.viewCount.toLocaleString()} · 좋아요 {news.likeCount.toLocaleString()}</p>
      </div>
    </Link>
  );
}
