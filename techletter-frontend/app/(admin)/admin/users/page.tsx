'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavTabs from '@/components/admin/AdminNavTabs';
import api from '@/lib/api';

type UserRole = 'user' | 'reporter' | 'admin';

interface AdminUser {
  id: number;
  email: string;
  nickname: string;
  role: UserRole;
  socialProvider?: string;
  createdAt: string;
}

const roleLabel: Record<UserRole, string> = {
  user: '일반 회원',
  reporter: '기자',
  admin: '관리자',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState<UserRole | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<AdminUser[]>('/users/admin');
      setUsers(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers().catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => (
    filter === 'all' ? users : users.filter((user) => user.role === filter)
  ), [users, filter]);

  const updateRole = async (user: AdminUser, role: UserRole) => {
    if (user.role === role) return;
    setSavingId(user.id);
    try {
      const res = await api.patch<AdminUser>(`/users/admin/${user.id}/role`, { role });
      setUsers((prev) => prev.map((item) => item.id === user.id ? res.data : item));
    } catch (error: any) {
      alert(error.response?.data?.message || '권한 변경에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-24 text-white">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/mypage')} className="text-gray-400 transition hover:text-white" aria-label="뒤로가기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-base font-bold">사용자 관리</span>
            <span className="text-xs text-gray-500">총 {users.length.toLocaleString()}명</span>
          </div>
          <p className="hidden">ADMIN</p>
          <h1 className="hidden">사용자 관리</h1>
          <p className="hidden">전체 회원의 역할과 가입 정보를 확인합니다.</p>
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(['all', 'user', 'reporter', 'admin'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${filter === item ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-700 text-gray-400'}`}
                >
                  {item === 'all' ? '전체' : roleLabel[item]}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">총 {filtered.length.toLocaleString()}명</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">불러오는 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="py-2">회원</th>
                    <th className="py-2">이메일</th>
                    <th className="py-2">가입 방식</th>
                    <th className="py-2">가입일</th>
                    <th className="py-2">권한</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td className="py-3 font-semibold">{user.nickname}</td>
                      <td className="py-3 text-gray-400">{user.email}</td>
                      <td className="py-3 text-gray-400">{(user.socialProvider || 'email').toUpperCase()}</td>
                      <td className="py-3 text-gray-400">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td className="py-3">
                        <select
                          value={user.role}
                          disabled={savingId === user.id}
                          onChange={(event) => updateRole(user, event.target.value as UserRole)}
                          className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          <option value="user">일반 회원</option>
                          <option value="reporter">기자</option>
                          <option value="admin">관리자</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
