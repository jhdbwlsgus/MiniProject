'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import api, { getImageUrl } from '@/lib/api';
import ProfileAvatar from '@/components/common/ProfileAvatar';
// 실제 파일 경로에 맞게 필요시 수정하세요
import { useUserReport } from '@/hooks/useUserReport';

interface User {
  id: number;
  email: string;
  nickname: string;
  role: string;
  profileImage?: string | null;
  socialProvider?: string;
}

interface ReporterProfile {
  id: number;
  realName: string;
  organization: string;
  bio: string;
  portfolioUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectedReason?: string | null;
}

type SubscriptionStatus = 'NONE' | 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAYMENT_FAILED';

interface Subscription {
  status: SubscriptionStatus;
  planType: 'daily' | 'weekly' | 'all' | 'premium' | null;
  startDate: string | null;
  endDate: string | null;
  nextPaymentDate: string | null;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  dailyActive?: boolean;
  weeklyActive?: boolean;
}

interface Bookmark {
  id: number;
  createdAt: string;
  news: { id: number; title: string; thumbnailUrl: string };
}

const CATEGORY_EMOJI: Record<string, string> = {
  'ai-ml': '🤖', 'web-dev': '🌐', cloud: '☁️',
  'open-source': '📦', security: '🔐', startup: '🚀', trend: '📈',
};

// 통계 카드 한 개
function StatCard({
  value, label, pct,
}: { value: number; label: string; pct: number }) {
  return (
    // 배경을 부드러운 다크그레이(#1E1E1E)로 변경
    <div className="flex flex-col gap-2 bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 border border-gray-100 dark:border-[#2E2E2E]">
      <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white leading-none">
        {value.toLocaleString()}
      </span>
      <span className="text-[11px] text-gray-400 dark:text-gray-400">{label}</span>
      {/* 미니 진행 바 */}
      <div className="h-[3px] rounded-full bg-gray-100 dark:bg-[#2A2A2A] overflow-hidden">
        <div
          className="h-full rounded-full bg-gray-900 dark:bg-white transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// 토글 스위치 (버튼 튀어 나가는 현상 완벽 수정)
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        on ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-[#333333]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-[#121212] transition duration-200 ease-in-out shadow-sm ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

const planLabel: Record<string, string> = {
  daily: '데일리 플랜',
  weekly: '위클리 플랜',
  all: '올인원 플랜',
  premium: '프리미엄 플랜',
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

function AdminShortcutIcon({ type }: { type: 'write' | 'manage' | 'stats' | 'subscribers' }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (type === 'write') {
    return (
      <svg {...commonProps}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  if (type === 'manage') {
    return (
      <svg {...commonProps}>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </svg>
    );
  }

  if (type === 'subscribers') {
    return (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M3 3v18h18" />
      <path d="M7 16v-5" />
      <path d="M12 16V7" />
      <path d="M17 16v-8" />
    </svg>
  );
}

function SubscriptionSection({
  subscription,
  onUnsubscribe,
  onResubscribe,
}: {
  subscription: Subscription | null;
  onUnsubscribe: () => void;
  onResubscribe: () => void;
}) {
  const status = subscription?.status ?? 'NONE';

  if (status === 'NONE' || !subscription) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">아직 구독하지 않았어요</p>
        <Link href="/subscriptions/plans">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition">
            뉴스레터 구독하기
          </button>
        </Link>
      </div>
    );
  }

  if (status === 'ACTIVE') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span className="text-sm font-medium text-emerald-400">구독 중</span>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">플랜</span>
            <span className="text-sm font-medium text-white">
              {planLabel[subscription.planType ?? ''] ?? '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">이용 기간</span>
            <span className="text-sm text-gray-300">
              {formatDate(subscription.startDate)} ~ {formatDate(subscription.endDate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">다음 결제일</span>
            <span className="text-sm text-gray-300">{formatDate(subscription.nextPaymentDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">결제 수단</span>
            <span className="text-sm text-gray-300">
              {subscription.paymentMethodBrand} ****{subscription.paymentMethodLast4}
            </span>
          </div>
        </div>
        <Link href="/mypage/payments" className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-400">결제 내역 보기</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        <button onClick={onUnsubscribe} className="text-sm text-red-400 hover:text-red-300 transition text-left">
          구독 해지
        </button>
      </div>
    );
  }

  if (status === 'CANCELED') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          <span className="text-sm font-medium text-yellow-400">해지 예약됨</span>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-sm text-yellow-300 font-medium mb-1">구독 해지됨</p>
          <p className="text-xs text-yellow-200/70">
            {formatDate(subscription.endDate)}까지 이용 가능해요.
            이후에는 자동으로 서비스가 종료됩니다.
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">플랜</span>
            <span className="text-sm text-gray-300">{planLabel[subscription.planType ?? ''] ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">이용 종료일</span>
            <span className="text-sm text-gray-300">{formatDate(subscription.endDate)}</span>
          </div>
        </div>
        <Link href="/mypage/payments" className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-400">결제 내역 보기</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        <button onClick={onResubscribe}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition">
          자동결제 재활성화
        </button>
      </div>
    );
  }

  if (status === 'EXPIRED') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
          <span className="text-sm font-medium text-gray-400">구독 만료</span>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-sm text-gray-300 font-medium mb-1">이용 기간이 종료되었어요</p>
          <p className="text-xs text-gray-500">
            {formatDate(subscription.endDate)}에 구독이 만료되었습니다.
            다시 구독하시면 바로 이용 가능해요.
          </p>
        </div>
        <Link href="/subscriptions/plans">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition">
            다시 구독하기
          </button>
        </Link>
      </div>
    );
  }

  if (status === 'PAYMENT_FAILED') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span className="text-sm font-medium text-red-400">결제 실패</span>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-red-300 font-medium mb-1">자동결제에 실패했어요</p>
          <p className="text-xs text-red-200/70">
            등록된 카드({subscription.paymentMethodBrand} ****{subscription.paymentMethodLast4})로
            결제에 실패했습니다. 결제 수단을 변경하거나 카드 정보를 확인해주세요.
          </p>
        </div>
        <Link href="/subscriptions/payment-method">
          <button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm font-medium transition">
            결제 수단 변경하기
          </button>
        </Link>
        <Link href="/mypage/payments" className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-400">결제 내역 보기</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    );
  }

  return null;
}

export default function MyPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [reporterProfile, setReporterProfile] = useState<ReporterProfile | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [stats, setStats] = useState({ bookmarks: 0, likes: 0, comments: 0 });
  const [loading, setLoading] = useState(true);

  const { report } = useUserReport();

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const [userRes, subRes, bookmarkRes, reporterRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/subscriptions/me').catch(() => ({ data: null })),
          api.get('/users/me/bookmarks').catch(() => ({ data: [] })),
          api.get('/reporters/me').catch(() => ({ data: null })),
        ]);
        setUser(userRes.data);
        setSubscription(subRes.data);
        setReporterProfile(reporterRes.data);
        if (reporterRes.data?.status === 'rejected') {
          setReporterApplyOpen(true);
          setReporterApplyForm({
            realName: reporterRes.data.realName || '',
            organization: reporterRes.data.organization || '',
            bio: reporterRes.data.bio || '',
            portfolioUrl: reporterRes.data.portfolioUrl || '',
          });
        }
        const bookmarkList = bookmarkRes.data || [];
        setBookmarks(bookmarkList.slice(0, 3));
        setStats({
          bookmarks: bookmarkList.length,
          likes: 0,
          comments: 0,
        });
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleSubscribe = () => {
    router.push('/subscriptions/plans');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 삭제됩니다.')) return;
    try {
      await api.delete('/users/me');
      alert('회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
      localStorage.removeItem('accessToken');
      router.push('/login');
    } catch (err: any) {
      alert(err.response?.data?.message || '회원 탈퇴에 실패했습니다.');
    }
  };

  const handleUnsubscribe = async () => {
    if (!confirm('구독을 해지하시겠어요?\n남은 이용 기간 동안은 계속 이용 가능합니다.')) return;
    try {
      await api.delete('/subscriptions');
      setSubscription(prev => prev ? { ...prev, status: 'CANCELED' } : prev);
    } catch (err: any) {
      alert(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleResubscribe = async () => {
    try {
      await api.post('/subscriptions/reactivate');
      const res = await api.get('/subscriptions/me');
      setSubscription(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleToggleSubscription = async (type: 'dailyActive' | 'weeklyActive') => {
    if (!subscription) return;

    // 1. 서버 응답을 기다리지 않고 UI(스위치)를 먼저 즉각적으로 변경
    const prevValue = subscription[type];
    setSubscription({ ...subscription, [type]: !prevValue });

    try {
      // 2. 백엔드 API에 변경된 설정값 전송 (API 엔드포인트는 진현님의 백엔드 설정에 맞게 PATCH나 PUT으로 맞춰주세요)
      await api.put('/subscriptions/me/settings', {
        dailyActive: type === 'dailyActive' ? !prevValue : subscription.dailyActive ?? false,
        weeklyActive: type === 'weeklyActive' ? !prevValue : subscription.weeklyActive ?? false,
      });
    } catch (err: any) {
      // 3. 서버 오류 시 원래 상태로 롤백
      setSubscription({ ...subscription, [type]: prevValue });
      alert(err.response?.data?.message || '설정 변경에 실패했습니다.');
    }
  };

  const isDark = mounted && theme === 'dark';

  const toggleDarkMode = () => setTheme(isDark ? 'light' : 'dark');

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-[#121212]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2A2A2A] animate-pulse" />
          <div className="h-3 w-24 rounded bg-gray-100 dark:bg-[#2A2A2A] animate-pulse" />
        </div>
      </div>
    );
  }

  const readCount = report?.monthlyReadCount ?? 0;
  const bookmarkCount = report?.bookmarkCount ?? 0;
  const likeCount = report?.likeCount ?? 0;
  const maxVal = Math.max(readCount, bookmarkCount, likeCount, 1);
  const isAdmin = user?.role === 'admin';
  const isReporter = user?.role === 'reporter';

  return (
    // 전체 배경을 부드러운 다크그레이(#121212)로 변경
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] transition-colors pb-32">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md border-b border-gray-100 dark:border-[#2E2E2E] transition-colors">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-center">
          <span className="font-semibold text-base text-gray-900 dark:text-white">마이페이지</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 flex flex-col gap-4 pb-32">

        {/* ── 1. 프로필 카드 ── */}
        <section className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2E2E2E] overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <ProfileAvatar nickname={user?.nickname} imageUrl={user?.profileImage} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base text-gray-900 dark:text-white truncate">
                    {user?.nickname}
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-[#2A2A2A]
                                     text-blue-600 dark:text-blue-400 rounded-md font-semibold">
                      ADMIN
                    </span>
                  )}
                  {user?.role === 'reporter' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40
                                     text-emerald-600 dark:text-emerald-300 rounded-md font-semibold">
                      REPORTER
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-400 truncate mt-0.5">{user?.email}</p>
              </div>
              <Link
                href="/mypage/profile"
                className="text-xs text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-[#3A3A3A]
                           rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#2A2A2A] transition flex-shrink-0 whitespace-nowrap"
              >
                {isAdmin ? '관리자 설정' : '프로필 관리'}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 px-5 pb-5">
            <StatCard value={readCount}     label="이번 달 읽은 뉴스" pct={(readCount / maxVal) * 100} />
            <StatCard value={bookmarkCount} label="북마크"            pct={(bookmarkCount / maxVal) * 100} />
            <StatCard value={likeCount}     label="좋아요"            pct={(likeCount / maxVal) * 100} />
            <StatCard value={0}             label="작성 댓글"         pct={0} />
          </div>

          {report && report.topCategories.length > 0 && (
            <div className="px-5 pb-5 border-t border-gray-50 dark:border-[#2E2E2E] pt-4">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">많이 읽는 카테고리</p>
              <div className="flex flex-wrap gap-1.5">
                {report.topCategories.map((item, i) => (
                  <Link
                    key={item.category.id}
                    href={`/category/${item.category.slug}`}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition
                      ${i === 0
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white font-medium'
                        : 'bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#3A3A3A] hover:border-gray-400'
                      }`}
                  >
                    <span>{CATEGORY_EMOJI[item.category.slug] ?? '📰'}</span>
                    {item.category.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── 2. 관리자 퀵메뉴 ── */}
        {isAdmin && (
          <section className="bg-blue-50 dark:bg-[#1E2530] rounded-2xl border border-blue-100
                               dark:border-blue-900/40 p-4">
            <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 mb-3">관리자</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { href: '/admin/news/create', icon: 'write' as const, label: '뉴스 작성' },
                { href: '/admin/news',        icon: 'manage' as const, label: '뉴스 관리' },
                { href: '/admin/users',       icon: 'subscribers' as const, label: '사용자 관리' },
                { href: '/admin/reporters',   icon: 'manage' as const, label: '기자 관리' },
                { href: '/admin/stats',       icon: 'stats' as const, label: '통계 분석' },
                { href: '/admin/subscribers', icon: 'subscribers' as const, label: '구독자 관리' },
              ].map(({ href, icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-[#2A2A2A]
                             rounded-xl text-blue-600 dark:text-blue-300 hover:shadow-sm transition"
                >
                  <span className="flex h-7 w-7 items-center justify-center">
                    <AdminShortcutIcon type={icon} />
                  </span>
                  <span className="text-[11px] font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 2-1. 기자 퀵메뉴 ── */}
        {isReporter && (
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-[#1E2A24]">
            <p className="mb-3 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">기자</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { href: '/admin/news/create', icon: 'write' as const, label: '기사 작성' },
                { href: '/reporter/dashboard', icon: 'manage' as const, label: '내 기사/피드' },
                { href: '/reporter/subscribers', icon: 'subscribers' as const, label: '내 구독자' },
                { href: '/reporter/dashboard', icon: 'stats' as const, label: '내 통계' },
              ].map(({ href, icon, label }) => (
                <Link
                  key={`${href}-${label}`}
                  href={href}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white py-3 text-emerald-700 transition hover:shadow-sm dark:bg-[#2A2A2A] dark:text-emerald-300"
                >
                  <span className="flex h-7 w-7 items-center justify-center">
                    <AdminShortcutIcon type={icon} />
                  </span>
                  <span className="text-[11px] font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 3. 최근 북마크 ── */}
        <section className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2E2E2E] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">최근 저장한 뉴스</h3>
            <Link href="/mypage/bookmarks"
              className="text-xs text-blue-500 hover:text-blue-400 transition">
              전체보기
            </Link>
          </div>

          {bookmarks.length > 0 ? (
            <div className="flex flex-col divide-y divide-gray-50 dark:divide-[#2E2E2E]">
              {bookmarks.map((bm) => (
                <Link key={bm.id} href={`/news/${bm.news?.id}`}
                  className="group flex gap-3 items-center py-3 first:pt-0 last:pb-0">
                  <div className="w-16 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-[#2A2A2A] relative">
                    {getImageUrl(bm.news?.thumbnailUrl)
                      ? <Image src={getImageUrl(bm.news?.thumbnailUrl)} alt=""
                          fill className="object-cover group-hover:scale-105 transition-transform" />
                      : <div className="w-full h-full bg-gray-200 dark:bg-[#3A3A3A]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug
                                  group-hover:text-blue-500 transition-colors">
                      {bm.news?.title}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(bm.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500
                            bg-gray-50 dark:bg-[#121212] rounded-xl border border-dashed
                            border-gray-200 dark:border-[#3A3A3A]">
              아직 저장한 뉴스가 없어요 📌
            </div>
          )}
        </section>

        {/* 구독 설정 */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
          <div className="mb-4 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span className="text-sm font-bold text-gray-900 dark:text-white">구독 상태</span>
          </div>
          <SubscriptionSection
            subscription={subscription}
            onUnsubscribe={handleUnsubscribe}
            onResubscribe={handleResubscribe}
          />
          {subscription?.status === 'ACTIVE' && (
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-[#2E2E2E]">
              <div className="mb-3 text-xs font-semibold text-gray-500">수신 설정</div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900 dark:text-gray-200">데일리 뉴스레터</div>
                    <div className="text-xs text-gray-500">{subscription.dailyActive ? '매일 오전 수신 중' : '수신 중지'}</div>
                  </div>
                  <Toggle on={subscription.dailyActive ?? false} onToggle={() => handleToggleSubscription('dailyActive')} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900 dark:text-gray-200">주간 뉴스레터</div>
                    <div className="text-xs text-gray-500">{subscription.weeklyActive ? '매주 월요일 수신 중' : '수신 중지'}</div>
                  </div>
                  <Toggle on={subscription.weeklyActive ?? false} onToggle={() => handleToggleSubscription('weeklyActive')} />
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="hidden">
          <div className="flex items-center gap-2 mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span className="font-bold text-sm text-gray-900 dark:text-white">구독 설정</span>
          </div>

          {/* 1. 파일 위쪽에 만들어둔 '결제 상세 카드' 불러오기 */}
          <SubscriptionSection
            subscription={subscription}
            onUnsubscribe={handleUnsubscribe}
            onResubscribe={handleResubscribe}
          />

          {/* 2. 구독 중(ACTIVE)일 때만 뉴스레터 알림 토글 스위치 보여주기 */}
          {subscription?.status === 'ACTIVE' && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-[#2A2A2A] flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-900 dark:text-gray-200">데일리 뉴스레터</div>
                  <div className="text-xs text-gray-500">매일 오전 수신 중</div>
                </div>
                <Toggle on={subscription.dailyActive ?? false} onToggle={() => handleToggleSubscription('dailyActive')} />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-900 dark:text-gray-200">주간 뉴스레터</div>
                  <div className="text-xs text-gray-500">매주 월요일 수신 중</div>
                </div>
                <Toggle on={subscription.weeklyActive ?? false} onToggle={() => handleToggleSubscription('weeklyActive')} />
              </div>
            </div>
          )}
        </div>

        {/* 설정 */}
        <div className="flex flex-col pt-4">
          {/* 👇 알림 설정을 <div>에서 <Link>로 변경하여 클릭 이동 가능하게! */}
          <Link href="/mypage/notifications" className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-[#2E2E2E] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] transition -mx-2 px-2 rounded-xl cursor-pointer">
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="text-sm text-gray-900 dark:text-gray-200">알림 설정</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
          
          <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-[#2E2E2E] -mx-2 px-2 rounded-xl">
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
              <span className="text-sm text-gray-900 dark:text-gray-200">다크모드</span>
            </div>
            {/* 👇 다크모드 버튼도 진짜 Toggle 컴포넌트로 교체! */}
            <Toggle on={isDark} onToggle={toggleDarkMode} />
          </div>

          <button onClick={handleLogout} className="flex items-center gap-3 py-4 -mx-2 px-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition rounded-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="text-sm text-red-500 dark:text-red-400 font-medium">로그아웃</span>
          </button>
        </div>

      </main>
    </div>
  );
}