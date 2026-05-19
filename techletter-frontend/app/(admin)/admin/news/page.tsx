'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

interface News {
  id: number;
  title: string;
  status: string;
  viewCount: number;
  homeMain: boolean;
  homeRecommended: boolean;
  homeUrgent: boolean;
  homeOrder: number;
  createdAt: string;
  author: { nickname: string };
  category?: { name: string };
}

const statusLabel: Record<string, { label: string; color: string }> = {
  draft: { label: '임시저장', color: 'text-gray-400' },
  review: { label: '검토중', color: 'text-yellow-400' },
  approved: { label: '승인됨', color: 'text-green-400' },
  published: { label: '게시됨', color: 'text-blue-400' },
  scheduled: { label: '예약됨', color: 'text-purple-400' },
};

export default function AdminNewsPage() {
  const router = useRouter();
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
  }, [page]);

  const fetchNews = async () => {
    try {
      const [meRes, newsRes] = await Promise.all([
        api.get('/users/me'),
        api.get(`/news/admin?page=${page}&limit=20`),
      ]);
      setRole(meRes.data?.role || null);
      setNewsList(newsRes.data.news);
      setTotal(newsRes.data.total);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    try {
      await api.delete(`/news/${id}`);
      fetchNews();
    } catch {
      alert('삭제 실패');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.put(`/news/${id}`, { status });
      setNewsList((prev) => prev.map((news) => (news.id === id ? { ...news, status } : news)));
    } catch {
      alert('상태 변경 실패');
    }
  };

  const handleHomeFlagChange = async (id: number, key: 'homeMain' | 'homeRecommended' | 'homeUrgent', value: boolean) => {
    try {
      await api.put(`/news/${id}`, { [key]: value });
      setNewsList((prev) => prev.map((news) => (news.id === id ? { ...news, [key]: value } : news)));
    } catch {
      alert('홈 노출 설정 변경 실패');
    }
  };

  const handleHomeOrderChange = async (id: number, value: number) => {
    try {
      await api.put(`/news/${id}`, { homeOrder: value });
      setNewsList((prev) => prev.map((news) => (news.id === id ? { ...news, homeOrder: value } : news)));
    } catch {
      alert('홈 노출 순서 변경 실패');
    }
  };

  const isReporter = role === 'reporter';

  return (
    <div className="min-h-screen pb-28 transition-colors duration-200">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/mypage')} className="text-gray-400 transition hover:text-white" aria-label="뒤로가기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-base font-bold">{isReporter ? '내 기사 관리' : '뉴스 관리'}</span>
            <span className="text-xs text-gray-500">총 {total}개</span>
          </div>
          <Link href="/admin/news/create" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700">
            + 새 뉴스
          </Link>
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-800" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="px-3 py-3 text-left">제목</th>
                    <th className="w-24 px-3 py-3 text-left">카테고리</th>
                    <th className="w-24 px-3 py-3 text-left">상태</th>
                    <th className="w-20 px-3 py-3 text-left">조회</th>
                    {!isReporter && <th className="w-56 px-3 py-3 text-left">홈 노출</th>}
                    <th className="w-28 px-3 py-3 text-left">작성일</th>
                    <th className="w-28 px-3 py-3 text-left">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {newsList.map((news) => (
                    <tr key={news.id} className="border-b border-gray-800 transition last:border-b-0 hover:bg-gray-900">
                      <td className="px-3 py-3">
                        <Link href={`/news/${news.id}`} className="line-clamp-1 transition hover:text-blue-400">
                          {news.title}
                        </Link>
                        <div className="mt-0.5 text-xs text-gray-500">{news.author?.nickname}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">{news.category?.name || '-'}</td>
                      <td className="px-3 py-3">
                        {isReporter ? (
                          <span className={`text-xs ${statusLabel[news.status]?.color || 'text-gray-400'}`}>
                            {statusLabel[news.status]?.label || news.status}
                          </span>
                        ) : (
                          <select
                            value={news.status}
                            onChange={(e) => handleStatusChange(news.id, e.target.value)}
                            className={`cursor-pointer bg-transparent text-xs outline-none ${statusLabel[news.status]?.color || 'text-gray-400'}`}
                          >
                            {Object.entries(statusLabel).map(([value, { label }]) => (
                              <option key={value} value={value} className="bg-gray-800 text-white">{label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">{news.viewCount.toLocaleString()}</td>
                      {!isReporter && (
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {[
                              ['homeMain', '메인'],
                              ['homeRecommended', '추천'],
                              ['homeUrgent', '긴급'],
                            ].map(([key, label]) => {
                              const typedKey = key as 'homeMain' | 'homeRecommended' | 'homeUrgent';
                              const active = Boolean(news[typedKey]);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => handleHomeFlagChange(news.id, typedKey, !active)}
                                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
                                    active
                                      ? 'border-blue-500 bg-blue-600 text-white'
                                      : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                            <input
                              type="number"
                              value={news.homeOrder ?? 0}
                              onChange={(e) => handleHomeOrderChange(news.id, Number(e.target.value) || 0)}
                              className="h-7 w-14 rounded-full border border-gray-700 bg-transparent px-2 text-center text-[11px] text-gray-300 outline-none focus:border-blue-500"
                              aria-label="홈 노출 순서"
                            />
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-3 text-xs text-gray-500">{new Date(news.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/news/${news.id}/edit`} className="text-xs text-blue-400 transition hover:text-blue-300">
                            수정
                          </Link>
                          <button onClick={() => handleDelete(news.id)} className="text-xs text-red-400 transition hover:text-red-300">
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-gray-700 disabled:opacity-30"
              >
                이전
              </button>
              <span className="text-xs text-gray-500">{page} / {Math.max(1, Math.ceil(total / 20))}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-gray-700 disabled:opacity-30"
              >
                다음
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
