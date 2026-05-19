'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { getImageUrl } from '@/lib/api';

interface News {
  id: number;
  title: string;
  content: string;
  isPremium?: boolean;
  contentLocked?: boolean;
  hasPremiumAccess?: boolean;
  requiredPlan?: string | null;
  premiumContent?: {
    keyPoints?: string[];
    editorComment?: string;
    relatedLinks?: Array<{ title?: string; url?: string }>;
  } | null;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: string;
  author: { id: number; nickname: string; profileImage?: string | null };
}

interface ReporterProfile {
  id: number;
  slug: string;
  displayName: string;
  headline?: string | null;
  profileImage?: string | null;
}

interface Comment {
  id: number;
  content: string;
  likeCount: number;
  isBest: boolean;
  createdAt: string;
  user: { nickname: string };
}

const formatNumber = (value: number | undefined) => (value ?? 0).toLocaleString();

function AuthorProfileLink({
  news,
  reporterProfile,
}: {
  news: News;
  reporterProfile: ReporterProfile | null;
}) {
  const displayName = reporterProfile?.displayName || news.author?.nickname || '작성자';
  const imageUrl = getImageUrl(reporterProfile?.profileImage || news.author?.profileImage);
  const content = (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/70 p-3 transition hover:border-blue-800 hover:bg-blue-950/30">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {displayName[0]}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-white">{displayName}</p>
          {reporterProfile && (
            <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
              기자
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-gray-400">
          {reporterProfile?.headline || (reporterProfile ? '기자의 피드와 작성 기사를 확인해보세요.' : '작성자 프로필')}
        </p>
      </div>
      {reporterProfile && <span className="text-xs font-semibold text-blue-300">프로필</span>}
    </div>
  );

  if (!reporterProfile) return content;
  return <Link href={`/reporters/${reporterProfile.slug}`}>{content}</Link>;
}

export default function NewsDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [news, setNews] = useState<News | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reporterProfile, setReporterProfile] = useState<ReporterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const viewedKey = `viewed_news_${id}`;
        const alreadyViewed = localStorage.getItem(viewedKey);

        const [newsRes, commentsRes] = await Promise.all([
          api.get(`/news/${id}`, {
            headers: alreadyViewed ? {} : { 'x-view-token': 'true' },
          }),
          api.get(`/news/${id}/comments`),
        ]);

        if (!alreadyViewed) localStorage.setItem(viewedKey, 'true');
        if (localStorage.getItem('accessToken')) {
          api.post(`/news/${id}/view-history`).catch(() => undefined);
        }

        setNews(newsRes.data);
        setComments(commentsRes.data);
        if (newsRes.data.author?.id) {
          api.get(`/reporters/user/${newsRes.data.author.id}`)
            .then((res) => setReporterProfile(res.data))
            .catch(() => setReporterProfile(null));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleLike = async () => {
    try {
      const res = await api.post(`/news/${id}/likes`);
      setLiked(res.data.liked);
      setNews((prev) => prev ? { ...prev, likeCount: res.data.likeCount ?? prev.likeCount } : prev);
    } catch {
      router.push('/login');
    }
  };

  const handleBookmark = async () => {
    try {
      const res = await api.post(`/news/${id}/bookmarks`);
      setBookmarked(res.data.bookmarked);
    } catch {
      router.push('/login');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: news?.title, url: window.location.href });
      } else {
        await navigator.clipboard?.writeText(window.location.href);
        alert('링크가 복사되었습니다.');
      }
      const res = await api.post(`/news/${id}/share`);
      setNews((prev) => prev ? { ...prev, shareCount: res.data.shareCount ?? prev.shareCount } : prev);
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') console.error(error);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await api.post(`/news/${id}/comments`, { content: commentText });
      setComments((prev) => [...prev, res.data]);
      setCommentText('');
    } catch {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center transition-colors duration-200">
        <div className="text-gray-500 dark:text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="flex min-h-screen items-center justify-center transition-colors duration-200">
        <div className="text-gray-500 dark:text-gray-400">뉴스를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 transition-colors duration-200">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <button onClick={() => router.back()} className="text-gray-400 transition hover:text-white" aria-label="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="flex-1 truncate text-sm font-medium">뉴스 상세</span>
          <button onClick={handleShare} aria-label="공유" className="text-gray-400 transition hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
        <div>
          <h1 className="mb-3 text-xl font-bold leading-tight">{news.title}</h1>
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>조회 {formatNumber(news.viewCount)}</span>
            <span>좋아요 {formatNumber(news.likeCount)}</span>
            <span>댓글 {formatNumber(comments.length)}</span>
            <span>공유 {formatNumber(news.shareCount)}</span>
            <span>{new Date(news.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>
          <AuthorProfileLink news={news} reporterProfile={reporterProfile} />
        </div>

        {false && reporterProfile && (
          <Link href={`/reporters/${reporterProfile?.slug}`} className="flex items-center gap-3 rounded-2xl border border-blue-900/40 bg-blue-950/30 p-4 transition hover:border-blue-700">
            {getImageUrl(reporterProfile?.profileImage) ? (
              <img src={getImageUrl(reporterProfile?.profileImage)} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {reporterProfile?.displayName?.[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{reporterProfile?.displayName}</p>
              <p className="mt-1 line-clamp-1 text-xs text-blue-100/80">
                {reporterProfile?.headline || '기자의 피드와 작성 기사를 확인해보세요.'}
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-300">프로필</span>
          </Link>
        )}

        {getImageUrl(news.thumbnailUrl) ? (
          <img src={getImageUrl(news.thumbnailUrl)} alt={news.title} className="h-48 w-full rounded-xl object-cover" />
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-sm text-gray-500">
            대표 이미지 없음
          </div>
        )}

        <div
          className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-300"
          dangerouslySetInnerHTML={{ __html: news.content }}
        />

        {news.contentLocked ? (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
            <div className="mb-2 inline-flex rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-bold text-yellow-300">
              프리미엄 전용
            </div>
            <h2 className="text-base font-bold text-white">전체 기사는 프리미엄 구독자에게 공개됩니다.</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              프리미엄 플랜을 구독하면 전체 본문, 기자 리포트, 구독자 전용 핵심 포인트를 바로 확인할 수 있습니다.
            </p>
            <Link href="/subscriptions/plans" className="mt-4 inline-flex rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-yellow-400">
              프리미엄 구독 보기
            </Link>
          </div>
        ) : news.premiumContent && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5">
            <div className="mb-3 text-xs font-bold text-yellow-300">프리미엄 리포트</div>
            {!!news.premiumContent.keyPoints?.length && (
              <div className="space-y-2">
                {news.premiumContent.keyPoints.map((point, index) => (
                  <div key={`${point}-${index}`} className="flex gap-2 text-sm text-gray-200">
                    <span className="font-bold text-yellow-300">{index + 1}.</span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            )}
            {news.premiumContent.editorComment && (
              <p className="mt-4 border-l-2 border-yellow-400 pl-3 text-sm italic text-gray-300">{news.premiumContent.editorComment}</p>
            )}
            {!!news.premiumContent.relatedLinks?.length && (
              <div className="mt-4 flex flex-col gap-2">
                {news.premiumContent.relatedLinks.map((link, index) => (
                  <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-yellow-300 hover:text-yellow-200">
                    {link.title || link.url}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-y border-gray-800 py-3">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm transition ${liked ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? '#f87171' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              좋아요 {formatNumber(news.likeCount)}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              댓글 {formatNumber(comments.length)}
            </span>
            <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-gray-400 transition hover:text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              공유 {formatNumber(news.shareCount)}
            </button>
          </div>
          <button onClick={handleBookmark} className={`transition ${bookmarked ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`} aria-label="북마크">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarked ? '#60a5fa' : 'none'} stroke="currentColor" strokeWidth="2"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>

        <section>
          <h3 className="mb-4 text-sm font-bold">댓글 {formatNumber(comments.length)}개</h3>
          <div className="flex flex-col gap-0">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`border-b border-gray-800 py-4 ${comment.isBest ? 'mb-2 rounded-xl border-blue-800 bg-blue-950 px-3' : ''}`}
              >
                {comment.isBest && <div className="mb-2 text-xs font-medium text-blue-400">베스트 댓글</div>}
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900 text-xs font-medium text-blue-300">
                    {comment.user?.nickname?.[0]}
                  </div>
                  <span className="text-xs font-medium text-gray-300">{comment.user?.nickname}</span>
                  <span className="text-xs text-gray-600">{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-300">{comment.content}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {formatNumber(comment.likeCount)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 남겨보세요..."
              className="flex-1 rounded-full bg-gray-800 px-4 py-2.5 text-sm text-gray-200 outline-none placeholder:text-gray-500 focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            />
            <button onClick={handleComment} className="shrink-0 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
              등록
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
