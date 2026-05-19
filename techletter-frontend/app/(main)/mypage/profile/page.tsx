'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import ProfileAvatar from '@/components/common/ProfileAvatar';
import ProfileImageUploader from '@/components/common/ProfileImageUploader';

interface Category {
  id: number;
  name: string;
}

interface User {
  id: number;
  email: string;
  nickname: string;
  role: string;
  profileImage?: string | null;
  bio?: string | null;
  socialProvider?: string;
  createdAt?: string;
  interestCategoryIds?: number[] | null;
  snsLinks?: {
    website?: string;
    github?: string;
    linkedin?: string;
    x?: string;
  } | null;
}

type ReporterStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'more_info_required';

interface ReporterProfile {
  id: number;
  slug: string;
  status: ReporterStatus;
  displayName?: string;
  headline?: string | null;
  reviewMessage?: string | null;
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

const statusLabel: Record<ReporterStatus, string> = {
  pending: '심사중',
  approved: '승인 완료',
  rejected: '반려됨',
  suspended: '정지됨',
  more_info_required: '추가 정보 요청',
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

export default function ProfileManagePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reporterProfile, setReporterProfile] = useState<ReporterProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [form, setForm] = useState({
    nickname: '',
    profileImage: '',
    bio: '',
    website: '',
    github: '',
    linkedin: '',
    x: '',
    interestCategoryIds: [] as number[],
  });
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, categoriesRes, reporterRes, notificationRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/categories').catch(() => ({ data: [] })),
          api.get('/reporters/me').catch(() => ({ data: null })),
          api.get('/notifications/preferences').catch(() => ({ data: null })),
        ]);
        const currentUser = userRes.data as User;
        setUser(currentUser);
        setCategories(categoriesRes.data || []);
        setReporterProfile(reporterRes.data);
        setNotifications(notificationRes.data);
        setForm({
          nickname: currentUser.nickname || '',
          profileImage: currentUser.profileImage || '',
          bio: currentUser.bio || '',
          website: currentUser.snsLinks?.website || '',
          github: currentUser.snsLinks?.github || '',
          linkedin: currentUser.snsLinks?.linkedin || '',
          x: currentUser.snsLinks?.x || '',
          interestCategoryIds: currentUser.interestCategoryIds || [],
        });
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const profileCompletion = useMemo(() => {
    const items = [
      !!form.nickname.trim(),
      !!form.profileImage.trim(),
      !!form.bio.trim(),
      form.interestCategoryIds.length > 0,
      !!form.website.trim() || !!form.github.trim() || !!form.linkedin.trim() || !!form.x.trim(),
    ];
    return Math.round((items.filter(Boolean).length / items.length) * 100);
  }, [form]);

  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const canChangePassword = user?.socialProvider === 'email' || !user?.socialProvider;

  const toggleCategory = (id: number) => {
    setForm((prev) => ({
      ...prev,
      interestCategoryIds: prev.interestCategoryIds.includes(id)
        ? prev.interestCategoryIds.filter((item) => item !== id)
        : [...prev.interestCategoryIds, id],
    }));
  };

  const saveProfile = async () => {
    if (!form.nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/users/me', {
        nickname: form.nickname.trim(),
        profileImage: form.profileImage.trim(),
        bio: form.bio.trim(),
        snsLinks: {
          website: form.website.trim(),
          github: form.github.trim(),
          linkedin: form.linkedin.trim(),
          x: form.x.trim(),
        },
        interestCategoryIds: form.interestCategoryIds,
      });
      setUser(res.data);
      alert('프로필이 저장되었습니다.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, '프로필 저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!password.currentPassword || !password.newPassword) {
      alert('현재 비밀번호와 새 비밀번호를 입력해주세요.');
      return;
    }
    if (password.newPassword.length < 8) {
      alert('새 비밀번호는 8자 이상으로 입력해주세요.');
      return;
    }
    if (password.newPassword !== password.newPasswordConfirm) {
      alert('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.patch('/users/me/password', {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
      alert('비밀번호가 변경되었습니다.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, '비밀번호 변경에 실패했습니다.'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleNotification = async (key: keyof NotificationPreferences) => {
    if (!notifications) return;
    const nextValue = !notifications[key];
    setNotifications((prev) => prev ? { ...prev, [key]: nextValue } : prev);
    try {
      await api.patch('/notifications/preferences', { [key]: nextValue });
    } catch {
      setNotifications((prev) => prev ? { ...prev, [key]: !nextValue } : prev);
      alert('알림 설정 저장에 실패했습니다.');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-[#2A2A2A]" />
      </div>
    );
  }

  if (isAdmin) {
    return <AdminProfilePage user={user} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-950 dark:bg-[#121212] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-[#2E2E2E] dark:bg-[#121212]/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link href="/mypage" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#1E1E1E]" aria-label="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div>
            <h1 className="text-base font-bold">프로필 관리</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">프로필, 계정 보안, 기자 신청 상태를 관리합니다.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <Panel title="프로필 정보">
            <div>
              <ProfileImageUploader
                nickname={form.nickname || user.nickname}
                value={form.profileImage}
                onChange={(url) => setForm((prev) => ({ ...prev, profileImage: url }))}
                disabled={saving}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="닉네임" value={form.nickname} onChange={(value) => setForm({ ...form, nickname: value })} />
              <Field label="프로필 이미지 URL" value={form.profileImage} onChange={(value) => setForm({ ...form, profileImage: value })} placeholder="업로드하면 자동 입력됩니다" />
            </div>
            <Textarea label="자기소개" value={form.bio} onChange={(value) => setForm({ ...form, bio: value })} />
          </Panel>

          <Panel title="관심 카테고리">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = form.interestCategoryIds.includes(category.id);
                return (
                  <button key={category.id} type="button" onClick={() => toggleCategory(category.id)} className={`rounded-full border px-3 py-1.5 text-sm ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 dark:border-[#3A3A3A] dark:text-gray-300'}`}>
                    {category.name}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="SNS 링크">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="웹사이트" value={form.website} onChange={(value) => setForm({ ...form, website: value })} placeholder="https://..." />
              <Field label="GitHub" value={form.github} onChange={(value) => setForm({ ...form, github: value })} placeholder="https://github.com/..." />
              <Field label="LinkedIn" value={form.linkedin} onChange={(value) => setForm({ ...form, linkedin: value })} placeholder="https://..." />
              <Field label="X / Twitter" value={form.x} onChange={(value) => setForm({ ...form, x: value })} placeholder="https://..." />
            </div>
            <button onClick={saveProfile} disabled={saving} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
              {saving ? '저장 중...' : '프로필 저장'}
            </button>
          </Panel>

          <Panel title="계정 보안">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 dark:bg-[#121212]">
              <div>
                <p className="text-sm font-semibold">로그인 방식</p>
                <p className="mt-1 text-xs text-gray-500">{(user.socialProvider || 'email').toUpperCase()}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-500 dark:bg-[#2A2A2A] dark:text-gray-300">
                {canChangePassword ? '비밀번호 변경 가능' : '소셜 계정'}
              </span>
            </div>
            {canChangePassword ? (
              <div className="grid gap-2">
                <Field label="현재 비밀번호" type="password" value={password.currentPassword} onChange={(value) => setPassword({ ...password, currentPassword: value })} />
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="새 비밀번호" type="password" value={password.newPassword} onChange={(value) => setPassword({ ...password, newPassword: value })} />
                  <Field label="새 비밀번호 확인" type="password" value={password.newPasswordConfirm} onChange={(value) => setPassword({ ...password, newPasswordConfirm: value })} />
                </div>
                <button onClick={changePassword} disabled={passwordLoading} className="rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-500 disabled:opacity-50 dark:border-[#3A3A3A] dark:text-gray-200">
                  {passwordLoading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            ) : (
              <p className="rounded-xl bg-gray-50 px-3 py-3 text-xs leading-relaxed text-gray-500 dark:bg-[#121212]">
                소셜 로그인 계정은 이 서비스에서 비밀번호를 관리하지 않습니다.
              </p>
            )}
          </Panel>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <h2 className="text-sm font-bold">프로필 완성도</h2>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-[#2A2A2A]">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${profileCompletion}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500">{profileCompletion}% 완료</p>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <h2 className="text-sm font-bold">기자 회원</h2>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              승인된 기자는 본인 기사, 피드, 구독자, 개인 통계를 관리할 수 있습니다.
            </p>
            <p className="mt-4 text-sm font-semibold">
              {reporterProfile?.status ? statusLabel[reporterProfile.status] : isAdmin ? '관리자 계정' : '미신청'}
            </p>
            {reporterProfile?.reviewMessage && <p className="mt-2 text-xs text-gray-500">관리자 메모: {reporterProfile.reviewMessage}</p>}
            {isAdmin ? (
              <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-[#121212]">
                관리자는 기자 신청 대상이 아닙니다. 기자 승인과 권한 관리는 관리자 메뉴에서 처리합니다.
              </p>
            ) : reporterProfile?.status === 'approved' ? (
              <div className="mt-4 grid gap-2">
                <Link href="/reporter/dashboard" className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700">
                  기자 대시보드
                </Link>
                <Link href={`/reporters/${reporterProfile.slug}`} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-transparent dark:text-blue-300">
                  공개 기자 프로필 보기
                </Link>
              </div>
            ) : (
              <Link href="/reporter/apply" className="mt-4 block rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700">
                {reporterProfile?.status === 'pending' ? '신청 내용 확인' : '기자 회원 신청'}
              </Link>
            )}
          </section>

          {notifications && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
              <h2 className="text-sm font-bold">알림 수신</h2>
              <div className="mt-3 space-y-3">
                {([
                  ['emailEnabled', '이메일 수신'],
                  ['smsEnabled', 'SMS 수신'],
                  ['kakaoEnabled', '카카오 알림톡'],
                  ['reporterNewsEnabled', '구독 기자 새 기사'],
                ] as Array<[keyof NotificationPreferences, string]>).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span>{label}</span>
                    <input type="checkbox" checked={notifications[key]} onChange={() => toggleNotification(key)} className="h-4 w-4 accent-blue-600" />
                  </label>
                ))}
              </div>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}

function AdminProfilePage({ user }: { user: User }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-950 dark:bg-[#121212] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-[#2E2E2E] dark:bg-[#121212]/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link href="/mypage" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#1E1E1E]" aria-label="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div>
            <h1 className="text-base font-bold">관리자 설정</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">운영 계정과 관리자 기능을 한곳에서 확인합니다.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <Panel title="관리자 계정">
            <div className="flex items-center gap-4 rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/20">
              <ProfileAvatar nickname={user.nickname} imageUrl={user.profileImage} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user.nickname}</p>
                <p className="mt-1 truncate text-xs text-gray-500">{user.email}</p>
              </div>
              <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white">ADMIN</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <InfoCard label="권한" value="플랫폼 전체 관리" />
              <InfoCard label="로그인 방식" value={(user.socialProvider || 'email').toUpperCase()} />
              <InfoCard label="가입일" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'} />
            </div>
          </Panel>

          <Panel title="운영 바로가기">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminLink href="/admin/news/create" title="뉴스 작성" desc="새 기사와 프리미엄 콘텐츠를 작성합니다." />
              <AdminLink href="/admin/news" title="뉴스 관리" desc="전체 기사 상태, 수정, 삭제를 관리합니다." />
              <AdminLink href="/admin/users" title="사용자 관리" desc="전체 회원 권한과 가입 정보를 관리합니다." />
              <AdminLink href="/admin/reporters" title="기자 관리" desc="기자 신청, 승인 기자, 정지 상태를 관리합니다." />
              <AdminLink href="/admin/stats" title="통계 분석" desc="플랫폼 전체 성과와 인기 기사를 확인합니다." />
              <AdminLink href="/admin/subscribers" title="구독자 관리" desc="유료 구독자, 결제 상태, 운영 메모를 관리합니다." />
            </div>
          </Panel>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <h2 className="text-sm font-bold">관리자 안내</h2>
            <div className="mt-3 space-y-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              <p>관리자 계정은 기자 신청이나 기자 구독 대상이 아닙니다.</p>
              <p>운영자는 전체 기사, 기자 승인, 구독자, 통계, 신고/품질 관리 기능을 담당합니다.</p>
              <p>닉네임이나 개인 관심사 설정보다 운영 권한과 관리 메뉴 접근성이 우선입니다.</p>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#121212]">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function AdminLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-blue-200 hover:bg-blue-50 dark:border-[#2E2E2E] dark:bg-[#121212] dark:hover:border-blue-900 dark:hover:bg-blue-950/20">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{desc}</p>
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
      <h2 className="mb-4 text-sm font-bold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-500">{label}</span>
      <input value={value} type={type} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#3A3A3A] dark:bg-[#121212]" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-500">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#3A3A3A] dark:bg-[#121212]" />
    </label>
  );
}
