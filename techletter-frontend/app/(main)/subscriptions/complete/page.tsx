'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const planNames: Record<string, string> = {
  daily: '데일리 플랜',
  weekly: '위클리 플랜',
  all: '올인원 플랜',
  premium: '프리미엄 플랜',
};

const planDescriptions: Record<string, string> = {
  daily: '매일 오전 8시에 오늘의 테크 뉴스를 이메일로 보내드릴게요!',
  weekly: '매주 월요일 아침, 한 주간의 테크 트렌드 요약을 보내드릴게요!',
  all: '매일 + 매주, 가장 알차게 테크 트렌드를 받아보실 수 있어요!',
};

function CompleteContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'daily';
  const price = Number(searchParams.get('price')) || 2900;
  const [subscription, setSubscription] = useState<{ status: string; planType: string | null } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get('/subscriptions/me')
      .then((res) => setSubscription(res.data))
      .catch(() => setSubscription(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-sm text-gray-500">
        구독 상태 확인 중...
      </div>
    );
  }

  if (subscription?.status !== 'ACTIVE') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center text-white">
        <h1 className="mb-2 text-xl font-bold">구독 상태를 확인하지 못했어요</h1>
        <p className="mb-6 text-sm leading-relaxed text-gray-400">
          결제가 완료되지 않았거나 백엔드 연결이 끊긴 상태입니다. 마이페이지에서 현재 구독 상태를 다시 확인해주세요.
        </p>
        <Link href="/mypage" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
          마이페이지로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/30 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full" />
      </div>

      <h1 className="text-2xl font-bold mb-2 text-center">구독 완료! 🎉</h1>
      <p className="text-gray-400 text-sm text-center mb-8 leading-relaxed">
        {planDescriptions[plan] || '프리미엄 콘텐츠와 기자 리포트를 이용할 수 있는 구독이 활성화되었습니다.'}
      </p>

      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
        <div className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wider">구독 정보</div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">플랜</span>
            <span className="text-sm font-medium text-white">{planNames[subscription.planType || plan] || '프리미엄 플랜'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">첫 달</span>
            <span className="text-sm font-medium text-emerald-400">무료 체험</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">이후 결제</span>
            <span className="text-sm font-medium text-white">월 {price.toLocaleString()}원</span>
          </div>
          <div className="h-px bg-gray-800" />
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">상태</span>
            <span className="text-sm font-medium text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
              구독 중
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 mb-8">
        <div className="flex gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-xs text-blue-300 leading-relaxed">
            구독 설정은 마이페이지에서 언제든지 변경하거나 해지할 수 있어요.
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <Link href="/">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-sm font-bold transition">
            홈으로 돌아가기
          </button>
        </Link>
        <Link href="/mypage">
          <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-3.5 text-sm font-medium transition">
            마이페이지에서 구독 관리
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-gray-500">로딩 중...</div></div>}>
      <CompleteContent />
    </Suspense>
  );
}
