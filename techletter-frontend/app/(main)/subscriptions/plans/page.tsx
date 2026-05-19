'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

type PlanId = 'daily' | 'weekly' | 'all' | 'premium';

interface Subscription {
  status: 'NONE' | 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAYMENT_FAILED';
  planType: PlanId | null;
}

const plans: Array<{
  id: PlanId;
  name: string;
  price: number;
  badge?: string;
  description: string;
  features: string[];
  accent: string;
}> = [
  {
    id: 'daily',
    name: '데일리 플랜',
    price: 2900,
    description: '매일 아침 핵심 기술 뉴스를 빠르게 받아봅니다.',
    features: ['데일리 뉴스레터', '관심 카테고리 추천', '읽은 기사 기반 알림'],
    accent: 'blue',
  },
  {
    id: 'weekly',
    name: '위클리 플랜',
    price: 1900,
    description: '한 주의 기술 흐름을 요약 리포트로 확인합니다.',
    features: ['주간 트렌드 요약', '인기 기사 모음', '아카이브 열람'],
    accent: 'violet',
  },
  {
    id: 'all',
    name: '올인원 플랜',
    price: 3900,
    badge: '추천',
    description: '데일리와 위클리 뉴스레터를 모두 이용합니다.',
    features: ['데일리 + 위클리', '광고 없는 뉴스 열람', '구독 설정 통합 관리'],
    accent: 'emerald',
  },
  {
    id: 'premium',
    name: '프리미엄 플랜',
    price: 9900,
    badge: 'PRO',
    description: '프리미엄 기사, 기자 리포트, 구독자 전용 콘텐츠까지 확장되는 플랜입니다.',
    features: ['프리미엄 콘텐츠 열람', '기자 전용 리포트 우선 접근', '향후 유료 기자 구독 연동'],
    accent: 'amber',
  },
];

const accentClass: Record<string, string> = {
  blue: 'border-blue-500 bg-blue-500/10 text-blue-500',
  violet: 'border-violet-500 bg-violet-500/10 text-violet-500',
  emerald: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
  amber: 'border-amber-500 bg-amber-500/10 text-amber-500',
};

export default function PlansPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanId>('premium');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const selectedPlan = plans.find((plan) => plan.id === selected) ?? plans[0];
  const isActiveSubscriber = subscription?.status === 'ACTIVE';
  const currentPlan = isActiveSubscriber ? subscription?.planType : null;

  useEffect(() => {
    api.get('/subscriptions/me')
      .then((res) => setSubscription(res.data))
      .catch(() => setSubscription(null));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 pb-[calc(160px+env(safe-area-inset-bottom))] text-white">
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/mypage" className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-900 hover:text-white" aria-label="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-bold">구독 플랜 선택</h1>
            <p className="text-xs text-gray-500">뉴스레터부터 프리미엄 콘텐츠까지 필요한 범위만 선택하세요.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 grid grid-cols-3 gap-2 text-xs">
          {['플랜 선택', '결제 정보', '완료'].map((step, index) => (
            <div key={step} className={`rounded-xl border px-3 py-2 ${index === 0 ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-gray-800 text-gray-500'}`}>
              {index + 1}. {step}
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((plan) => {
            const active = selected === plan.id;
            const isCurrent = currentPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  active ? accentClass[plan.accent] : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-white">{plan.name}</h2>
                      {plan.badge && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white">{plan.badge}</span>}
                      {isCurrent && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">구독중</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
                  </div>
                  <span className={`mt-1 h-5 w-5 rounded-full border ${active ? 'border-current bg-current' : 'border-gray-600'}`} />
                </div>
                <div className="mb-4 flex items-end gap-1">
                  <span className="text-2xl font-bold text-white">{plan.price.toLocaleString()}원</span>
                  <span className="pb-1 text-xs text-gray-500">/ 월</span>
                </div>
                <div className="space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m20 6-11 11-5-5" />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-gray-800 bg-gray-950 px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => {
              if (currentPlan === selectedPlan.id) router.push('/mypage');
              else router.push(`/subscriptions/checkout?plan=${selectedPlan.id}&price=${selectedPlan.price}`);
            }}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            {currentPlan === selectedPlan.id ? '마이페이지에서 구독 관리' : `${selectedPlan.name}으로 결제 진행`}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">결제 후 마이페이지에서 자동 갱신과 뉴스레터 수신 설정을 관리할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
