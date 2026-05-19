'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavTabs from '@/components/admin/AdminNavTabs';
import api from '@/lib/api';

type ReporterStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'more_info_required';

interface ReporterRequest {
  id: number;
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  specialties?: string[] | null;
  portfolioUrl?: string | null;
  blogUrl?: string | null;
  githubUrl?: string | null;
  previousExperience?: string | null;
  plannedTopics?: string[] | null;
  sampleArticleType?: string | null;
  sampleArticleText?: string | null;
  sampleArticleUrl?: string | null;
  sampleArticleFileUrl?: string | null;
  status: ReporterStatus;
  reviewMessage?: string | null;
  createdAt: string;
  user?: {
    email?: string;
    nickname?: string;
    createdAt?: string;
  };
}

const statusLabel: Record<ReporterStatus, string> = {
  pending: '심사중',
  approved: '승인 완료',
  rejected: '반려',
  suspended: '정지',
  more_info_required: '추가 정보 요청',
};

const statusTone: Record<ReporterStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-500',
  suspended: 'bg-gray-500/10 text-gray-500',
  more_info_required: 'bg-blue-500/10 text-blue-500',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ko-KR');
}

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

export default function ReporterRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ReporterRequest[]>([]);
  const [selected, setSelected] = useState<ReporterRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReporterStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<ReporterStatus | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<ReporterRequest[]>('/reporters/admin');
      setRequests(res.data);
      setSelected((current) => {
        if (!res.data.length) return null;
        return current ? res.data.find((item) => item.id === current.id) ?? res.data[0] : res.data[0];
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, '기자 신청 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const updateStatus = async (status: ReporterStatus) => {
    if (!selected || savingStatus) return;
    const needsReason = status === 'rejected' || status === 'more_info_required' || status === 'suspended';
    if (needsReason && !message.trim()) {
      alert('처리 사유를 입력해주세요.');
      return;
    }

    setSavingStatus(status);
    setError('');
    try {
      const res = await api.patch<ReporterRequest>(`/reporters/admin/${selected.id}/status`, {
        status,
        reviewMessage: message.trim(),
      });
      setRequests((prev) => prev.map((item) => (item.id === selected.id ? res.data : item)));
      setSelected(res.data);
      setMessage('');
      alert(`기자 신청 상태를 "${statusLabel[status]}"(으)로 변경했습니다.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, '상태 변경에 실패했습니다.'));
    } finally {
      setSavingStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-24 text-white">
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-start gap-3">
            <button onClick={() => router.push('/mypage')} className="mt-0.5 text-gray-400 transition hover:text-white" aria-label="뒤로가기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-blue-400">ADMIN</p>
              <h1 className="mt-1 text-xl font-bold">기자 신청 관리</h1>
              <p className="mt-1 text-sm text-gray-400">
                기자 신청 정보를 검토하고 승인, 반려, 추가 정보 요청, 정지 처리를 진행합니다.
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/20 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold">신청 목록</h2>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ReporterStatus | 'all')}
              className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-white"
            >
              <option value="all">전체</option>
              {Object.entries(statusLabel).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">표시할 신청이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelected(request)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected?.id === request.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-800 bg-gray-950 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">{request.displayName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone[request.status]}`}>
                      {statusLabel[request.status]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">{request.user?.email || '-'}</p>
                  <p className="mt-2 text-[11px] text-gray-500">신청일 {formatDate(request.createdAt)}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          {!selected ? (
            <div className="py-20 text-center text-sm text-gray-500">검토할 신청을 선택해주세요.</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[selected.status]}`}>
                    {statusLabel[selected.status]}
                  </span>
                  <h2 className="mt-3 text-lg font-bold">{selected.displayName}</h2>
                  <p className="mt-1 text-sm text-gray-500">{selected.headline || '한줄 소개가 없습니다.'}</p>
                </div>
                {selected.profileImage && <img src={selected.profileImage} alt="" className="h-16 w-16 rounded-xl object-cover" />}
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-2">
                <Info label="이메일" value={selected.user?.email} />
                <Info label="닉네임" value={selected.user?.nickname} />
                <Info label="가입일" value={formatDate(selected.user?.createdAt)} />
                <Info label="신청일" value={formatDate(selected.createdAt)} />
              </div>

              <Block title="자기소개">{selected.bio || '입력된 자기소개가 없습니다.'}</Block>
              <Block title="전문 분야">{(selected.specialties || []).join(', ') || '입력된 전문 분야가 없습니다.'}</Block>
              <Block title="작성 예정 분야">{(selected.plannedTopics || []).join(', ') || '입력된 작성 예정 분야가 없습니다.'}</Block>
              <Block title="이전 작성 경험">{selected.previousExperience || '입력된 작성 경험이 없습니다.'}</Block>

              <div className="grid gap-3 md:grid-cols-3">
                <LinkBox label="포트폴리오" url={selected.portfolioUrl} />
                <LinkBox label="블로그/SNS" url={selected.blogUrl} />
                <LinkBox label="GitHub" url={selected.githubUrl} />
              </div>

              <Block title={`샘플 기사${selected.sampleArticleType ? ` (${selected.sampleArticleType})` : ''}`}>
                {selected.sampleArticleText || selected.sampleArticleUrl || selected.sampleArticleFileUrl || '제출된 샘플 기사가 없습니다.'}
              </Block>

              {selected.reviewMessage && <Block title="최근 심사 메모">{selected.reviewMessage}</Block>}

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                <label className="block text-xs font-semibold text-gray-500">처리 사유</label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  placeholder="반려, 추가 정보 요청, 정지 처리 시 사용자에게 안내될 사유를 입력하세요."
                  className="mt-2 w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <Action disabled={!!savingStatus} loading={savingStatus === 'approved'} label="승인" onClick={() => updateStatus('approved')} className="bg-emerald-600 text-white hover:bg-emerald-700" />
                  <Action disabled={!!savingStatus} loading={savingStatus === 'more_info_required'} label="추가 정보 요청" onClick={() => updateStatus('more_info_required')} className="bg-blue-600 text-white hover:bg-blue-700" />
                  <Action disabled={!!savingStatus} loading={savingStatus === 'rejected'} label="반려" onClick={() => updateStatus('rejected')} className="bg-red-600 text-white hover:bg-red-700" />
                  <Action disabled={!!savingStatus} loading={savingStatus === 'suspended'} label="정지" onClick={() => updateStatus('suspended')} className="bg-gray-800 text-white hover:bg-gray-900" />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-gray-950 p-3">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="mt-1 break-all text-sm font-medium">{value || '-'}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold text-gray-500">{title}</h3>
      <div className="whitespace-pre-wrap rounded-xl bg-gray-950 p-3 text-sm leading-relaxed text-gray-300">
        {children}
      </div>
    </div>
  );
}

function LinkBox({ label, url }: { label: string; url?: string | null }) {
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      className={`rounded-xl border p-3 text-sm ${
        url
          ? 'border-blue-900/60 text-blue-300 hover:bg-blue-950/40'
          : 'pointer-events-none border-gray-800 text-gray-500'
      }`}
    >
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="mt-1 truncate font-medium">{url || '없음'}</div>
    </a>
  );
}

function Action({
  label,
  onClick,
  disabled,
  loading,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  className: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${className}`}>
      {loading ? '처리 중...' : label}
    </button>
  );
}
