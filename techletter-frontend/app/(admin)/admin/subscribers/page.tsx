'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAYMENT_FAILED';
type PlanType = 'daily' | 'weekly' | 'all' | 'premium';
type QuickFilter = 'ALL' | 'TODAY_NEW' | 'PAYMENT_SOON' | 'EXPIRING_SOON';

interface Subscriber {
  id: number;
  user: {
    id: number;
    email: string;
    nickname: string;
  };
  status: SubscriptionStatus;
  planType: PlanType | null;
  startDate: string | null;
  endDate: string | null;
  nextPaymentDate: string | null;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  dailyActive: boolean;
  weeklyActive: boolean;
  dailySendTime: string | null;
  adminMemo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubscriberEngagement {
  bookmarkCount: number;
  likeCount: number;
  reactionScore: number;
  topCategories: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
  recentActivity: Array<{
    id: number;
    type: 'bookmark' | 'like';
    createdAt: string;
    news: {
      id: number;
      title: string;
      categoryName: string | null;
      thumbnailUrl: string | null;
      publishedAt: string | null;
    } | null;
  }>;
}

const statusConfig: Record<SubscriptionStatus, { label: string; className: string }> = {
  ACTIVE: { label: '활성', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' },
  CANCELED: { label: '해지 예약', className: 'border-amber-500/30 bg-amber-500/10 text-amber-500' },
  EXPIRED: { label: '만료', className: 'border-gray-500/30 bg-gray-500/10 text-gray-500' },
  PAYMENT_FAILED: { label: '결제 실패', className: 'border-red-500/30 bg-red-500/10 text-red-500' },
};

const planLabel: Record<PlanType, string> = {
  daily: '데일리',
  weekly: '위클리',
  all: '전체',
  premium: '프리미엄',
};

const formatDate = (date: string | null) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}`;
};

const isSameDay = (date: string | null, base = new Date()) => {
  if (!date) return false;
  const parsed = new Date(date);
  return (
    parsed.getFullYear() === base.getFullYear() &&
    parsed.getMonth() === base.getMonth() &&
    parsed.getDate() === base.getDate()
  );
};

const diffDays = (date: string | null) => {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Subscriber | null>(null);
  const [engagement, setEngagement] = useState<SubscriberEngagement | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'ALL'>('ALL');
  const [planFilter, setPlanFilter] = useState<PlanType | 'ALL'>('ALL');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL');

  const fetchSubscribers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<Subscriber[]>('/subscriptions/admin/all');
      setSubscribers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '구독자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const updateSubscriber = (updated: Subscriber) => {
    setSubscribers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
  };

  const openDetail = async (subscriber: Subscriber) => {
    setSelected(subscriber);
    setMemoDraft(subscriber.adminMemo ?? '');
    setEngagement(null);
    setEngagementLoading(true);
    try {
      const res = await api.get<SubscriberEngagement>(`/subscriptions/admin/${subscriber.id}/engagement`);
      setEngagement(res.data);
    } catch {
      setEngagement(null);
    } finally {
      setEngagementLoading(false);
    }
  };

  const saveRequest = async (subscriber: Subscriber, request: Promise<{ data: Subscriber }>, fallbackMessage: string) => {
    setSavingId(subscriber.id);
    setError('');
    try {
      const res = await request;
      updateSubscriber({ ...res.data, user: res.data.user ?? subscriber.user });
    } catch (err: any) {
      setError(err.response?.data?.message || fallbackMessage);
    } finally {
      setSavingId(null);
    }
  };

  const updateStatus = (subscriber: Subscriber, status: SubscriptionStatus) => {
    saveRequest(
      subscriber,
      api.put<Subscriber>(`/subscriptions/admin/${subscriber.id}/status`, { status }),
      '구독 상태 변경에 실패했습니다.',
    );
  };

  const updatePlan = (subscriber: Subscriber, planType: PlanType) => {
    saveRequest(
      subscriber,
      api.put<Subscriber>(`/subscriptions/admin/${subscriber.id}/plan`, { planType }),
      '구독 플랜 변경에 실패했습니다.',
    );
  };

  const updateSettings = (subscriber: Subscriber, dailyActive: boolean, weeklyActive: boolean) => {
    saveRequest(
      subscriber,
      api.put<Subscriber>(`/subscriptions/admin/${subscriber.id}/settings`, { dailyActive, weeklyActive }),
      '수신 설정 변경에 실패했습니다.',
    );
  };

  const saveMemo = (subscriber: Subscriber) => {
    saveRequest(
      subscriber,
      api.put<Subscriber>(`/subscriptions/admin/${subscriber.id}/memo`, { adminMemo: memoDraft }),
      '관리자 메모 저장에 실패했습니다.',
    );
  };

  const filteredSubscribers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return subscribers.filter((subscriber) => {
      const matchesSearch =
        !keyword ||
        subscriber.user.email.toLowerCase().includes(keyword) ||
        subscriber.user.nickname.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === 'ALL' || subscriber.status === statusFilter;
      const matchesPlan = planFilter === 'ALL' || subscriber.planType === planFilter;
      const daysToPayment = diffDays(subscriber.nextPaymentDate);
      const daysToExpire = diffDays(subscriber.endDate);
      const matchesQuick =
        quickFilter === 'ALL' ||
        (quickFilter === 'TODAY_NEW' && isSameDay(subscriber.createdAt)) ||
        (quickFilter === 'PAYMENT_SOON' && daysToPayment !== null && daysToPayment >= 0 && daysToPayment <= 7) ||
        (quickFilter === 'EXPIRING_SOON' && daysToExpire !== null && daysToExpire >= 0 && daysToExpire <= 7);

      return matchesSearch && matchesStatus && matchesPlan && matchesQuick;
    });
  }, [planFilter, quickFilter, search, statusFilter, subscribers]);

  const stats = useMemo(() => {
    const todayNew = subscribers.filter((item) => isSameDay(item.createdAt)).length;
    const active = subscribers.filter((item) => item.status === 'ACTIVE').length;
    const canceled = subscribers.filter((item) => item.status === 'CANCELED').length;
    const failed = subscribers.filter((item) => item.status === 'PAYMENT_FAILED').length;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekNew = subscribers.filter((item) => new Date(item.createdAt) >= weekAgo).length;
    const churnRate = subscribers.length ? Math.round((canceled / subscribers.length) * 100) : 0;
    const weekGrowth = subscribers.length ? Math.round((weekNew / subscribers.length) * 100) : 0;

    return { total: subscribers.length, active, todayNew, canceled, failed, churnRate, weekGrowth };
  }, [subscribers]);

  const isSavingSelected = selected ? savingId === selected.id : false;

  return (
    <div className="min-h-screen bg-white pb-28 text-gray-950 dark:bg-gray-950 dark:text-white">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/mypage" className="text-gray-400 transition hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <span className="font-bold text-base text-white">구독자 관리</span>
          </div>
          <button
            onClick={fetchSubscribers}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:border-gray-500 hover:text-white"
          >
            새로고침
          </button>
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: '전체 구독자', value: `${stats.total}명`, tone: 'text-gray-950 dark:text-white' },
            { label: '활성 구독자', value: `${stats.active}명`, tone: 'text-emerald-500' },
            { label: '오늘 신규', value: `${stats.todayNew}명`, tone: 'text-blue-500' },
            { label: '해지율', value: `${stats.churnRate}%`, tone: 'text-amber-500' },
            { label: '결제 실패', value: `${stats.failed}명`, tone: 'text-red-500' },
            { label: '이번 주 증가율', value: `${stats.weekGrowth}%`, tone: 'text-violet-500' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className={`text-2xl font-bold ${item.tone}`}>{item.value}</div>
              <div className="mt-1 text-xs text-gray-500">{item.label}</div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 lg:grid-cols-[1fr_170px_170px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="닉네임 또는 이메일 검색"
              className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as SubscriptionStatus | 'ALL')}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="CANCELED">해지 예약</option>
              <option value="EXPIRED">만료</option>
              <option value="PAYMENT_FAILED">결제 실패</option>
            </select>
            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value as PlanType | 'ALL')}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="ALL">전체 플랜</option>
              <option value="daily">데일리</option>
              <option value="weekly">위클리</option>
              <option value="all">전체</option>
              <option value="premium">프리미엄</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: '전체' },
              { key: 'TODAY_NEW', label: '오늘 신규' },
              { key: 'PAYMENT_SOON', label: '7일 내 결제' },
              { key: 'EXPIRING_SOON', label: '7일 내 만료' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setQuickFilter(item.key as QuickFilter)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  quickFilter === item.key
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="grid grid-cols-[1.3fr_1fr_110px_120px_150px_140px_120px] gap-4 border-b border-gray-200 px-4 py-3 text-xs font-semibold text-gray-500 dark:border-gray-800 max-xl:hidden">
            <span>이메일</span>
            <span>닉네임</span>
            <span>상태</span>
            <span>플랜</span>
            <span>가입일</span>
            <span>다음 결제일</span>
            <span>수신</span>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">구독자 목록을 불러오는 중입니다.</div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">조건에 맞는 구독자가 없습니다.</div>
          ) : (
            filteredSubscribers.map((subscriber) => (
              <button
                key={subscriber.id}
                onClick={() => openDetail(subscriber)}
                className="grid w-full grid-cols-[1.3fr_1fr_110px_120px_150px_140px_120px] gap-4 border-b border-gray-100 px-4 py-4 text-left transition last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60 max-xl:grid-cols-1"
              >
                <span className="min-w-0 truncate text-sm font-medium">{subscriber.user.email}</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{subscriber.user.nickname || '이름 없음'}</span>
                <span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig[subscriber.status].className}`}>
                    {statusConfig[subscriber.status].label}
                  </span>
                </span>
                <span className="text-sm font-semibold">{subscriber.planType ? planLabel[subscriber.planType] : '-'}</span>
                <span className="text-sm text-gray-500">{formatDate(subscriber.createdAt)}</span>
                <span className="text-sm text-gray-500">{formatDate(subscriber.nextPaymentDate)}</span>
                <span className="flex gap-1.5">
                  <span className={`rounded-full px-2 py-1 text-xs ${subscriber.dailyActive ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'}`}>
                    D
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs ${subscriber.weeklyActive ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'}`}>
                    W
                  </span>
                </span>
              </button>
            ))
          )}
        </section>

        <p className="text-center text-xs text-gray-500">총 {filteredSubscribers.length}명 표시 중</p>
      </main>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 px-4 py-6 backdrop-blur-sm sm:items-center">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white text-gray-950 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:text-white">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-950">
              <div>
                <h2 className="text-lg font-bold">{selected.user.nickname || '이름 없음'}</h2>
                <p className="text-sm text-gray-500">{selected.user.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-5 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-500">상태</div>
                  <div className="mt-1 font-semibold">{statusConfig[selected.status].label}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-500">플랜</div>
                  <div className="mt-1 font-semibold">{selected.planType ? planLabel[selected.planType] : '-'}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                  <div className="text-xs text-gray-500">다음 결제</div>
                  <div className="mt-1 font-semibold">{formatDate(selected.nextPaymentDate)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">구독자 반응 분석</div>
                  <span className="text-xs text-gray-500">북마크/좋아요 기준</span>
                </div>

                {engagementLoading ? (
                  <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-900">
                    반응 데이터를 불러오는 중입니다.
                  </div>
                ) : engagement ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                        <div className="text-xs text-gray-500">반응 점수</div>
                        <div className="mt-1 text-lg font-bold text-blue-500">{engagement.reactionScore}</div>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                        <div className="text-xs text-gray-500">북마크</div>
                        <div className="mt-1 text-lg font-bold">{engagement.bookmarkCount}</div>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                        <div className="text-xs text-gray-500">좋아요</div>
                        <div className="mt-1 text-lg font-bold">{engagement.likeCount}</div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="mb-2 text-xs font-semibold text-gray-500">관심 카테고리</div>
                        <div className="flex flex-wrap gap-2">
                          {engagement.topCategories.length > 0 ? (
                            engagement.topCategories.map((category) => (
                              <span key={category.name} className="rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-500">
                                {category.name} {category.count}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">아직 데이터가 없습니다.</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-xs font-semibold text-gray-500">관심 태그</div>
                        <div className="flex flex-wrap gap-2">
                          {engagement.topTags.length > 0 ? (
                            engagement.topTags.map((tag) => (
                              <span key={tag.name} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                #{tag.name} {tag.count}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">아직 데이터가 없습니다.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold text-gray-500">최근 반응 기사</div>
                      {engagement.recentActivity.length > 0 ? (
                        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                          {engagement.recentActivity.map((activity) => (
                            <Link
                              key={`${activity.type}-${activity.id}`}
                              href={activity.news ? `/news/${activity.news.id}` : '#'}
                              className="flex items-center justify-between gap-3 px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-900"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {activity.news?.title ?? '삭제된 기사'}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {activity.news?.categoryName ?? '카테고리 없음'} · {formatDate(activity.createdAt)}
                                </div>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                activity.type === 'bookmark'
                                  ? 'bg-blue-500/10 text-blue-500'
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}>
                                {activity.type === 'bookmark' ? '저장' : '좋아요'}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-gray-900">
                          아직 저장하거나 좋아요를 누른 기사가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-900">
                    반응 데이터를 불러오지 못했습니다.
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  구독 상태
                  <select
                    value={selected.status}
                    disabled={isSavingSelected}
                    onChange={(event) => updateStatus(selected, event.target.value as SubscriptionStatus)}
                    className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="ACTIVE">활성</option>
                    <option value="CANCELED">해지 예약</option>
                    <option value="EXPIRED">만료</option>
                    <option value="PAYMENT_FAILED">결제 실패</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  플랜 변경
                  <select
                    value={selected.planType ?? 'daily'}
                    disabled={isSavingSelected}
                    onChange={(event) => updatePlan(selected, event.target.value as PlanType)}
                    className="mt-2 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="daily">데일리</option>
                    <option value="weekly">위클리</option>
                    <option value="all">전체</option>
                    <option value="premium">프리미엄</option>
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-3 text-sm font-semibold">알림 설정</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    disabled={isSavingSelected}
                    onClick={() => updateSettings(selected, !selected.dailyActive, selected.weeklyActive)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                      selected.dailyActive
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-500'
                        : 'border-gray-300 text-gray-500 dark:border-gray-700'
                    }`}
                  >
                    데일리 수신 {selected.dailyActive ? 'ON' : 'OFF'}
                  </button>
                  <button
                    disabled={isSavingSelected}
                    onClick={() => updateSettings(selected, selected.dailyActive, !selected.weeklyActive)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                      selected.weeklyActive
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-500'
                        : 'border-gray-300 text-gray-500 dark:border-gray-700'
                    }`}
                  >
                    위클리 수신 {selected.weeklyActive ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
                  <span className="text-gray-500">가입일</span>
                  <span>{formatDate(selected.createdAt)}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
                  <span className="text-gray-500">이용 기간</span>
                  <span>{formatDate(selected.startDate)} - {formatDate(selected.endDate)}</span>
                </div>
                <div className="flex justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
                  <span className="text-gray-500">결제수단</span>
                  <span>
                    {selected.paymentMethodBrand && selected.paymentMethodLast4
                      ? `${selected.paymentMethodBrand} ****${selected.paymentMethodLast4}`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
                  <span className="text-gray-500">최근 수정</span>
                  <span>{formatDate(selected.updatedAt)}</span>
                </div>
              </div>

              <label className="text-sm font-semibold">
                관리자 메모
                <textarea
                  value={memoDraft}
                  onChange={(event) => setMemoDraft(event.target.value)}
                  placeholder="이벤트 참여자, 환불 요청 이력, 별도 응대 내용 등을 적어두세요."
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>

              <button
                disabled={isSavingSelected}
                onClick={() => saveMemo(selected)}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-500"
              >
                메모 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
