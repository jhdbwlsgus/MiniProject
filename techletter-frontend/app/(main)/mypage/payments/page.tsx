'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

type PaymentStatus = 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PENDING';

interface Payment {
  id: number;
  paidAt: string;
  amount: number;
  status: PaymentStatus;
  periodStart: string;
  periodEnd: string;
  paymentMethodBrand: string;
  paymentMethodLast4: string;
  planType: 'daily' | 'weekly' | 'all' | 'premium';
}

const planLabel: Record<string, string> = {
  daily: '데일리 플랜',
  weekly: '위클리 플랜',
  all: '올인원 플랜',
  premium: '프리미엄 플랜',
};

const statusConfig: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  SUCCESS:  { label: '결제 완료', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  FAILED:   { label: '결제 실패', color: 'text-red-400',     bg: 'bg-red-500/10' },
  REFUNDED: { label: '환불 완료', color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  PENDING:  { label: '처리 중',   color: 'text-blue-400',    bg: 'bg-blue-500/10' },
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateKo = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        // ✅ 실제 API 연동
        const res = await api.get('/subscriptions/payments');
        setPayments(res.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          router.push('/login');
        } else {
          setError('결제 내역을 불러오는데 실패했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500">로딩 중...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/mypage">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="font-bold text-base">결제 내역</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 mb-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <p className="text-gray-500 text-sm">결제 내역이 없어요</p>
            <Link href="/subscriptions/plans">
              <button className="text-sm text-blue-400 hover:text-blue-300 transition">
                구독 시작하기
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* 총 결제 요약 */}
            <div className="bg-gray-900 rounded-2xl p-4 mb-2 flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">총 결제 금액</div>
                <div className="text-xl font-bold">
                  {payments
                    .filter(p => p.status === 'SUCCESS')
                    .reduce((acc, p) => acc + p.amount, 0)
                    .toLocaleString()}원
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">결제 횟수</div>
                <div className="text-xl font-bold">
                  {payments.filter(p => p.status === 'SUCCESS').length}회
                </div>
              </div>
            </div>

            {/* 결제 목록 */}
            {payments.map((payment) => {
              const config = statusConfig[payment.status];
              const isExpanded = expandedId === payment.id;

              return (
                <button
                  key={payment.id}
                  onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                  className="w-full text-left bg-gray-900 rounded-2xl p-4 transition hover:bg-gray-800"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {formatDate(payment.paidAt)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color} ${config.bg}`}>
                          {config.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {planLabel[payment.planType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold ${payment.status === 'FAILED' ? 'text-red-400' : 'text-white'}`}>
                        {payment.status === 'FAILED' ? '-' : ''}{payment.amount.toLocaleString()}원
                      </span>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#6b7280" strokeWidth="2.5"
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col gap-2.5">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">이용 기간</span>
                        <span className="text-xs text-gray-300">
                          {formatDateKo(payment.periodStart)} ~ {formatDateKo(payment.periodEnd)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">결제 수단</span>
                        <span className="text-xs text-gray-300">
                          {payment.paymentMethodBrand} ****{payment.paymentMethodLast4}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">결제 상태</span>
                        <span className={`text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      {payment.status === 'FAILED' && (
                        <div className="mt-2">
                          <Link href="/subscriptions/payment-method"
                            onClick={(e) => e.stopPropagation()}>
                            <button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-medium transition">
                              결제 수단 변경하기
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
