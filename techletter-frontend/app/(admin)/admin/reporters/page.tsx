'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavTabs from '@/components/admin/AdminNavTabs';
import api from '@/lib/api';

type ReporterStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'more_info_required';

interface ReporterProfile {
  id: number;
  displayName: string;
  headline?: string | null;
  status: ReporterStatus;
  level: number;
  createdAt: string;
  approvedAt?: string | null;
  user?: { email?: string; nickname?: string };
}

const statusLabel: Record<ReporterStatus, string> = {
  pending: '심사중',
  approved: '승인 기자',
  rejected: '반려',
  suspended: '정지',
  more_info_required: '추가 정보 요청',
};

export default function AdminReportersPage() {
  const router = useRouter();
  const [reporters, setReporters] = useState<ReporterProfile[]>([]);
  const [filter, setFilter] = useState<ReporterStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ReporterProfile[]>('/reporters/admin')
      .then((res) => setReporters(res.data || []))
      .catch(() => setReporters([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => (
    filter === 'all' ? reporters : reporters.filter((reporter) => reporter.status === filter)
  ), [reporters, filter]);

  const pendingCount = reporters.filter((reporter) => reporter.status === 'pending' || reporter.status === 'more_info_required').length;
  const approvedCount = reporters.filter((reporter) => reporter.status === 'approved').length;

  return (
    <div className="min-h-screen bg-gray-950 pb-24 text-white">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/mypage')} className="text-gray-400 transition hover:text-white" aria-label="뒤로가기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-base font-bold">기자 관리</span>
            <span className="text-xs text-gray-500">총 {reporters.length.toLocaleString()}명</span>
          </div>
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Metric label="전체 기자 프로필" value={reporters.length} />
          <Metric label="검토 필요" value={pendingCount} />
          <Metric label="승인 기자" value={approvedCount} />
        </div>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'approved', 'more_info_required', 'rejected', 'suspended'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${filter === item ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-700 text-gray-400'}`}
                >
                  {item === 'all' ? '전체' : statusLabel[item]}
                </button>
              ))}
            </div>
            <Link href="/admin/reporter-requests" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700">
              신청 심사 열기
            </Link>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">표시할 기자가 없습니다.</div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((reporter) => (
                <article key={reporter.id} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{reporter.displayName}</p>
                      <p className="mt-1 text-xs text-gray-500">{reporter.headline || reporter.user?.email || '-'}</p>
                    </div>
                    <span className="rounded-full bg-gray-800 px-2.5 py-1 text-[11px] font-semibold text-gray-300">
                      {statusLabel[reporter.status]}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-3">
                    <span>이메일 {reporter.user?.email || '-'}</span>
                    <span>레벨 {reporter.level || 1}</span>
                    <span>신청일 {new Date(reporter.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
