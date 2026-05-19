'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const planNames: Record<string, string> = {
  daily: '데일리 플랜',
  weekly: '위클리 플랜',
  all: '올인원 플랜',
};

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'daily';
  const price = Number(searchParams.get('price')) || 2900;

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/subscriptions/me')
      .then((res) => {
        if (res.data?.status === 'ACTIVE' && res.data?.planType === plan) {
          router.replace('/mypage');
        }
      })
      .catch(() => undefined);
  }, [plan, router]);

  const handleCardNumber = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  const handleExpiry = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) setExpiry(raw.slice(0, 2) + '/' + raw.slice(2));
    else setExpiry(raw);
  };

  const isFormValid =
    cardNumber.replace(/\s/g, '').length === 16 &&
    expiry.length === 5 &&
    cvc.length >= 3 &&
    cardHolder.trim().length > 0 &&
    agree;

  const handleSubmit = async () => {
    if (!isFormValid || loading) return;
    setLoading(true);
    try {
      // ✅ 실제 결제 연동 시 여기에 PG사 결제 요청 코드 추가
      // const paymentResult = await requestPayment({ amount: price, ... });
      // if (!paymentResult.success) throw new Error('결제 실패');

      // 카드 브랜드 감지
      const raw = cardNumber.replace(/\s/g, '');
      const brand = raw.startsWith('4') ? 'VISA'
        : raw.startsWith('5') ? 'MASTER'
        : raw.startsWith('3') ? 'AMEX'
        : '일반카드';
      const last4 = raw.slice(-4);

      // 구독 생성 API 호출
      await api.post('/subscriptions', {
        planType: plan,
        paymentMethodBrand: brand,
        paymentMethodLast4: last4,
      });

      router.push(`/subscriptions/complete?plan=${plan}&price=${price}`);
    } catch (err: any) {
      alert(err.response?.data?.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getCardBrand = () => {
    const raw = cardNumber.replace(/\s/g, '');
    if (raw.startsWith('4')) return 'VISA';
    if (raw.startsWith('5')) return 'MASTER';
    if (raw.startsWith('3')) return 'AMEX';
    return null;
  };

  const cardBrand = getCardBrand();

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-[calc(240px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/subscriptions/plans">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="font-bold text-base">결제 정보 입력</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
        {/* 진행 단계 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-600 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-sm text-gray-500">플랜 선택</span>
          </div>
          <div className="flex-1 h-px bg-blue-600/50" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-sm text-blue-400 font-medium">결제 정보</span>
          </div>
          <div className="flex-1 h-px bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">3</div>
            <span className="text-sm text-gray-500">완료</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 flex flex-col gap-6">
        {/* 선택한 플랜 요약 */}
        <div className="bg-blue-600/10 border border-blue-600/30 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <div className="text-sm text-blue-400 font-medium">{planNames[plan] || '프리미엄 플랜'}</div>
            <div className="text-xs text-gray-400 mt-0.5">첫 달 무료 체험 후 자동 결제</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{price.toLocaleString()}원</div>
            <div className="text-xs text-gray-400">/ 월</div>
          </div>
        </div>

        {/* 카드 미리보기 */}
        <div className="relative h-44 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-10" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div className="w-10 h-7 bg-yellow-400/80 rounded-md" />
              {cardBrand && <span className="text-xs font-bold text-white/70 bg-white/10 px-2 py-1 rounded">{cardBrand}</span>}
            </div>
            <div>
              <div className="font-mono text-lg tracking-widest text-white/80 mb-3">
                {cardNumber || '0000 0000 0000 0000'}
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-white/40 mb-0.5">카드 소유자</div>
                  <div className="text-sm text-white/70 font-medium uppercase">{cardHolder || 'YOUR NAME'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/40 mb-0.5">유효기간</div>
                  <div className="text-sm text-white/70 font-mono">{expiry || 'MM/YY'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 카드 입력 폼 */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">카드 번호</label>
            <input type="text" inputMode="numeric" value={cardNumber}
              onChange={(e) => handleCardNumber(e.target.value)}
              placeholder="0000 0000 0000 0000"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">유효기간</label>
              <input type="text" inputMode="numeric" value={expiry}
                onChange={(e) => handleExpiry(e.target.value)}
                placeholder="MM/YY"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">CVC</label>
              <input type="text" inputMode="numeric" value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="000"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">카드 소유자명</label>
            <input type="text" value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="홍길동"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
        </div>

        {/* 결제 안내 */}
        <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">첫 결제일</span>
            <span className="text-white">30일 후 자동 결제</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">결제 금액</span>
            <span className="text-white">{price.toLocaleString()}원 / 월</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">해지</span>
            <span className="text-white">언제든지 가능</span>
          </div>
          <div className="h-px bg-gray-800 my-1" />
          <div className="flex justify-between text-sm font-bold">
            <span className="text-gray-300">오늘 결제 금액</span>
            <span className="text-emerald-400">0원 (첫 달 무료)</span>
          </div>
        </div>

        {/* 동의 */}
        <button onClick={() => setAgree(!agree)} className="flex items-start gap-3 text-left">
          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
            agree ? 'bg-blue-600' : 'bg-gray-700 border border-gray-600'
          }`}>
            {agree && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className="text-xs text-gray-400 leading-relaxed">
            구독 서비스 이용약관 및 개인정보 처리방침에 동의하며, 30일 무료 체험 종료 후 매월 {price.toLocaleString()}원이 자동 결제됨에 동의합니다.
          </span>
        </button>
      </div>

      {/* 하단 결제 버튼 */}
      <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-0 right-0 z-40 bg-gray-950 border-t border-gray-800 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={handleSubmit} disabled={!isFormValid || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl py-3.5 text-sm font-bold transition flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                처리 중...
              </>
            ) : '무료 체험 시작하기'}
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">🔒 카드 정보는 암호화되어 안전하게 처리됩니다</p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-gray-500">로딩 중...</div></div>}>
      <CheckoutForm />
    </Suspense>
  );
}
