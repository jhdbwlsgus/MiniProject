'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationPreferences {
  marketingAgreed: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  kakaoEnabled: boolean;
  inAppEnabled: boolean;
  newsletterEnabled: boolean;
  reporterNewsEnabled: boolean;
  activityEnabled: boolean;
  subscriptionEnabled: boolean;
  recommendationEnabled: boolean;
}

const preferenceItems: Array<[keyof NotificationPreferences, string, string]> = [
  ['inAppEnabled', '앱 내부 알림', '서비스 안에서 알림을 받고 확인합니다.'],
  ['newsletterEnabled', '뉴스레터 알림', '새 뉴스레터와 브리핑 발행 알림을 받습니다.'],
  ['reporterNewsEnabled', '구독 기자 새 기사', '구독 중인 기자가 새 기사를 발행하면 알림을 받습니다.'],
  ['activityEnabled', '댓글/좋아요 알림', '내 기사와 활동에 대한 반응 알림을 받습니다.'],
  ['subscriptionEnabled', '결제 및 구독 알림', '결제 예정일과 구독 만료 안내를 받습니다.'],
  ['recommendationEnabled', '맞춤 콘텐츠 추천', '관심 카테고리 기반 추천 알림을 받습니다.'],
  ['emailEnabled', '이메일 수신', '동의한 알림을 이메일로도 받을 수 있습니다.'],
  ['smsEnabled', '문자 SMS 수신', '중요 안내를 문자로 받을 수 있습니다.'],
  ['kakaoEnabled', '카카오 알림톡 수신', '중요 안내를 카카오 알림톡으로 받을 수 있습니다.'],
  ['marketingAgreed', '마케팅 알림', '이벤트와 프로모션 소식을 받습니다.'],
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notificationRes, preferenceRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/notifications/preferences'),
        ]);
        setNotifications(notificationRes.data || []);
        setPreferences(preferenceRes.data);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const togglePreference = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    const nextValue = !preferences[key];
    setPreferences((prev) => prev ? { ...prev, [key]: nextValue } : prev);
    try {
      await api.patch('/notifications/preferences', { [key]: nextValue });
    } catch {
      setPreferences((prev) => prev ? { ...prev, [key]: !nextValue } : prev);
      alert('알림 설정 저장에 실패했습니다.');
    }
  };

  const markRead = async (item: NotificationItem) => {
    if (item.readAt) return;
    await api.patch(`/notifications/${item.id}/read`).catch(() => undefined);
    setNotifications((prev) => prev.map((current) => (
      current.id === item.id ? { ...current, readAt: new Date().toISOString() } : current
    )));
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  };

  if (loading || !preferences) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0b0b0b]">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-[#2A2A2A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32 transition-colors duration-200 dark:bg-[#0b0b0b]">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4 dark:border-[#2e2e2e] dark:bg-[#0b0b0b]">
        <button onClick={() => router.back()} className="-ml-2 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-white">알림 설정</h1>
        <button onClick={markAllRead} className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400">
          모두 읽음
        </button>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-[#2f2f2f] dark:bg-[#171717]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">최근 알림</h2>
          <div className="mt-4 flex flex-col gap-3">
            {notifications.length ? notifications.map((item) => {
              const body = (
                <article className={`rounded-xl border p-4 transition ${
                  item.readAt
                    ? 'border-gray-100 bg-white dark:border-[#2f2f2f] dark:bg-[#1E1E1E]'
                    : 'border-blue-100 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{item.message}</p>
                    </div>
                    {!item.readAt && <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />}
                  </div>
                  <p className="mt-3 text-[11px] text-gray-400">{new Date(item.createdAt).toLocaleString('ko-KR')}</p>
                </article>
              );
              return item.linkUrl ? (
                <Link key={item.id} href={item.linkUrl} onClick={() => markRead(item)}>
                  {body}
                </Link>
              ) : (
                <button key={item.id} onClick={() => markRead(item)} className="text-left">
                  {body}
                </button>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 dark:border-[#3A3A3A] dark:bg-[#1E1E1E] dark:text-gray-400">
                아직 받은 알림이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-[#2f2f2f] dark:bg-[#171717]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">수신 설정</h2>
          <div className="mt-4 divide-y divide-gray-100 dark:divide-[#2E2E2E]">
            {preferenceItems.map(([key, title, desc]) => (
              <div key={key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
                <button
                  onClick={() => togglePreference(key)}
                  className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${preferences[key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${preferences[key] ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
