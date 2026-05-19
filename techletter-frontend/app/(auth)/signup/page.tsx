'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type AgreementKey =
  | 'serviceTermsAgreed'
  | 'privacyAgreed'
  | 'marketingAgreed'
  | 'emailEnabled'
  | 'smsEnabled'
  | 'kakaoEnabled'
  | 'recommendationEnabled';

type TermsKey = 'service' | 'privacy' | 'marketing' | 'recommendation';

const termsContent: Record<TermsKey, { title: string; body: string[] }> = {
  service: {
    title: '서비스 이용약관',
    body: [
      'TechLetter는 기술 뉴스, 뉴스레터, 기자 피드, 개인화 추천 기능을 제공하는 서비스입니다.',
      '회원은 서비스 이용 과정에서 관련 법령과 운영 정책을 준수해야 합니다.',
      '서비스 품질 개선, 보안, 부정 이용 방지를 위해 필요한 범위에서 이용 기록을 처리할 수 있습니다.',
    ],
  },
  privacy: {
    title: '개인정보 수집 및 이용 동의',
    body: [
      '수집 항목: 이메일, 닉네임, 비밀번호, 프로필 정보, 관심 카테고리, 서비스 이용 기록',
      '이용 목적: 회원 식별, 로그인, 뉴스레터 발송, 알림 제공, 기자 신청 심사, 개인화 추천 제공',
      '보관 기간: 회원 탈퇴 시까지 보관하며, 법령상 보관이 필요한 정보는 해당 기간 동안 보관합니다.',
    ],
  },
  marketing: {
    title: '마케팅 및 광고 정보 수신 동의',
    body: [
      '이벤트, 프로모션, 신규 기능, 추천 콘텐츠 안내를 선택한 채널로 받을 수 있습니다.',
      '마케팅 수신 동의는 선택 사항이며, 동의하지 않아도 기본 서비스 이용에는 제한이 없습니다.',
      '가입 이후 마이페이지 알림 설정에서 언제든지 수신 여부를 변경할 수 있습니다.',
    ],
  },
  recommendation: {
    title: '맞춤형 콘텐츠 추천 동의',
    body: [
      '읽은 기사, 북마크, 좋아요, 관심 카테고리, 구독 기자 정보를 기반으로 맞춤 뉴스와 기자를 추천합니다.',
      '이 동의는 뉴스레터와 개인화 알림 제공을 위한 선택 동의입니다.',
      '마이페이지 알림 설정에서 언제든지 변경할 수 있습니다.',
    ],
  },
};

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }
  return fallback;
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [agreements, setAgreements] = useState<Record<AgreementKey, boolean>>({
    serviceTermsAgreed: false,
    privacyAgreed: false,
    marketingAgreed: false,
    emailEnabled: true,
    smsEnabled: false,
    kakaoEnabled: true,
    recommendationEnabled: true,
  });
  const [openTerms, setOpenTerms] = useState<TermsKey | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const authBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorMessage = params.get('error');
    if (errorMessage) {
      setError(errorMessage);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const allAgreed = useMemo(() => Object.values(agreements).every(Boolean), [agreements]);
  const requiredAgreed = agreements.serviceTermsAgreed && agreements.privacyAgreed;

  const toggleAgreement = (key: AgreementKey) => {
    setAgreements((prev) => {
      if (key === 'marketingAgreed') {
        const next = !prev.marketingAgreed;
        return {
          ...prev,
          marketingAgreed: next,
          emailEnabled: next ? prev.emailEnabled : false,
          smsEnabled: next ? prev.smsEnabled : false,
          kakaoEnabled: next ? prev.kakaoEnabled : false,
        };
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const toggleAll = () => {
    const next = !allAgreed;
    setAgreements({
      serviceTermsAgreed: next,
      privacyAgreed: next,
      marketingAgreed: next,
      emailEnabled: next,
      smsEnabled: next,
      kakaoEnabled: next,
      recommendationEnabled: next,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!requiredAgreed) {
      setError('필수 약관에 동의해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/signup', { ...form, agreements });
      localStorage.setItem('accessToken', res.data.accessToken);
      router.push('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err, '회원가입에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-start justify-center overflow-y-auto bg-gray-50 px-4 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-6 transition-colors duration-200 dark:bg-[#121212] sm:pt-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-[#2E2E2E] dark:bg-[#1E1E1E] sm:p-7">
        <Link href="/">
          <h1 className="mb-2 cursor-pointer text-center text-2xl font-bold text-gray-900 transition hover:opacity-80 dark:text-white">
            TechLetter
          </h1>
        </Link>
        <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
          관심 있는 IT 뉴스를 더 편하게 받아보세요
        </p>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <TextField label="닉네임" value={form.nickname} placeholder="닉네임" onChange={(value) => setForm({ ...form, nickname: value })} required />
          <TextField label="이메일" type="email" value={form.email} placeholder="이메일 주소" onChange={(value) => setForm({ ...form, email: value })} required />
          <TextField label="비밀번호" type="password" value={form.password} placeholder="비밀번호 8자 이상" onChange={(value) => setForm({ ...form, password: value })} required minLength={8} />

          <section className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5 dark:border-[#2E2E2E] dark:bg-[#121212]">
            <label className="mb-3 flex cursor-pointer items-center gap-2 border-b border-gray-200 pb-3 dark:border-[#2E2E2E]">
              <input type="checkbox" checked={allAgreed} onChange={toggleAll} className="h-4 w-4 accent-blue-600" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">전체 동의하기</span>
            </label>

            <AgreementRow required label="서비스 이용약관 동의" checked={agreements.serviceTermsAgreed} onChange={() => toggleAgreement('serviceTermsAgreed')} onView={() => setOpenTerms('service')} />
            <AgreementRow required label="개인정보 수집 및 이용 동의" checked={agreements.privacyAgreed} onChange={() => toggleAgreement('privacyAgreed')} onView={() => setOpenTerms('privacy')} />
            <AgreementRow label="마케팅 정보 수신 동의" checked={agreements.marketingAgreed} onChange={() => toggleAgreement('marketingAgreed')} onView={() => setOpenTerms('marketing')} />

            <div className={`ml-6 grid gap-2 rounded-xl px-3 py-2 transition ${agreements.marketingAgreed ? 'bg-white dark:bg-[#1E1E1E]' : 'bg-gray-100 opacity-60 dark:bg-[#181818]'}`}>
              <ChannelCheck label="이메일 수신" checked={agreements.emailEnabled} disabled={!agreements.marketingAgreed} onChange={() => toggleAgreement('emailEnabled')} />
              <ChannelCheck label="SMS 수신" checked={agreements.smsEnabled} disabled={!agreements.marketingAgreed} onChange={() => toggleAgreement('smsEnabled')} />
              <ChannelCheck label="카카오 알림톡 수신" checked={agreements.kakaoEnabled} disabled={!agreements.marketingAgreed} onChange={() => toggleAgreement('kakaoEnabled')} />
            </div>

            <AgreementRow label="맞춤형 콘텐츠 추천 동의" checked={agreements.recommendationEnabled} onChange={() => toggleAgreement('recommendationEnabled')} onView={() => setOpenTerms('recommendation')} />
          </section>

          <button
            type="submit"
            disabled={loading || !requiredAgreed}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? '가입 중...' : '일반 회원가입'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">또는</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="flex flex-col gap-3">
          <SocialButton label="Google로 계속하기" onClick={() => { window.location.href = `${authBaseUrl}/auth/google/signup`; }} />
          <SocialButton label="Kakao로 계속하기" tone="kakao" onClick={() => { window.location.href = `${authBaseUrl}/auth/kakao/signup`; }} />
          <SocialButton label="Naver로 계속하기" tone="naver" onClick={() => { window.location.href = `${authBaseUrl}/auth/naver/signup`; }} />
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            로그인
          </Link>
        </div>
      </div>

      {openTerms && <TermsModal termsKey={openTerms} onClose={() => setOpenTerms(null)} />}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-[#3A3A3A] dark:bg-[#121212] dark:text-white"
      />
    </label>
  );
}

function AgreementRow({
  label,
  checked,
  onChange,
  onView,
  required,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  onView: () => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <label className="flex min-w-0 cursor-pointer items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-blue-600" />
        <span className="truncate text-sm text-gray-700 dark:text-gray-300">
          <span className={required ? 'font-semibold text-blue-600' : 'text-gray-400'}>[{required ? '필수' : '선택'}]</span> {label}
        </span>
      </label>
      <button type="button" onClick={onView} className="shrink-0 text-xs font-medium text-gray-400 hover:text-blue-600">
        보기 &gt;
      </button>
    </div>
  );
}

function ChannelCheck({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="h-4 w-4 accent-blue-600 disabled:cursor-not-allowed" />
      {label}
    </label>
  );
}

function SocialButton({ label, onClick, tone = 'default' }: { label: string; onClick: () => void; tone?: 'default' | 'kakao' | 'naver' }) {
  const className =
    tone === 'kakao'
      ? 'border-[#FEE500] bg-[#FEE500] text-gray-900 hover:brightness-95'
      : tone === 'naver'
        ? 'border-[#03C75A] bg-[#03C75A] text-white hover:brightness-95'
        : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-[#3A3A3A] dark:bg-[#121212] dark:text-white dark:hover:bg-[#181818]';

  return (
    <button type="button" onClick={onClick} className={`w-full rounded-xl border py-2.5 text-sm font-medium transition ${className}`}>
      {label}
    </button>
  );
}

function TermsModal({ termsKey, onClose }: { termsKey: TermsKey; onClose: () => void }) {
  const terms = termsContent[termsKey];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-4 sm:items-center sm:pb-0">
      <div className="max-h-[75vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-[#1E1E1E]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-[#2E2E2E]">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{terms.title}</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2A2A]">
            닫기
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
          <div className="space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {terms.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
