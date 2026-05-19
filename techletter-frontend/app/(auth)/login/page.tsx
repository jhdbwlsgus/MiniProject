'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

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

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const authBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('accessToken', res.data.accessToken);
      window.location.href = '/';
    } catch (err: unknown) {
      setError(getErrorMessage(err, '로그인에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-start justify-center overflow-y-auto px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-10 transition-colors duration-200 sm:items-center sm:pt-12">
      <div className="w-full max-w-md card-dark p-6 shadow sm:p-8">
        <Link href="/">
          <h1 className="mb-2 cursor-pointer text-center text-2xl font-bold text-gray-900 transition hover:opacity-80 dark:text-white">
            TechLetter
          </h1>
        </Link>
        <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
          IT 트렌드를 한눈에
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              이메일
            </label>
            <input
              type="email"
              placeholder="이메일 주소"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-dark w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              비밀번호
            </label>
            <input
              type="password"
              placeholder="비밀번호"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-dark w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="blue-btn w-full py-2.5 text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">또는</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = `${authBaseUrl}/auth/google/login`;
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            Google로 로그인
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = `${authBaseUrl}/auth/kakao/login`;
            }}
            className="w-full rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-[#191919] transition hover:brightness-95"
          >
            Kakao로 로그인
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = `${authBaseUrl}/auth/naver/login`;
            }}
            className="w-full rounded-lg bg-[#03C75A] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-95"
          >
            Naver로 로그인
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
