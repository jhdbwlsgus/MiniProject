'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import api from '@/lib/api';
import ProfileImageUploader from '@/components/common/ProfileImageUploader';

interface Category {
  id: number;
  name: string;
}

type ReporterStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'more_info_required';

interface ReporterProfile {
  id: number;
  slug: string;
  status: ReporterStatus;
  displayName?: string | null;
  profileImage?: string | null;
  headline?: string | null;
  bio?: string | null;
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
  categoryIds?: number[] | null;
  reviewMessage?: string | null;
}

const statusLabel: Record<ReporterStatus, string> = {
  pending: '심사중',
  approved: '승인 완료',
  rejected: '반려됨',
  suspended: '정지됨',
  more_info_required: '추가 정보 요청',
};

const toCsv = (items?: string[] | null) => (items || []).join(', ');

export default function ReporterApplyPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<ReporterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    profileImage: '',
    headline: '',
    bio: '',
    specialties: '',
    portfolioUrl: '',
    blogUrl: '',
    githubUrl: '',
    previousExperience: '',
    plannedTopics: '',
    sampleArticleType: 'direct',
    sampleArticleText: '',
    sampleArticleUrl: '',
    sampleArticleFileUrl: '',
    categoryIds: [] as number[],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, categoriesRes, reporterRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/categories').catch(() => ({ data: [] })),
          api.get('/reporters/me').catch(() => ({ data: null })),
        ]);
        if (userRes.data.role === 'admin') {
          alert('관리자는 기자 신청 대상이 아닙니다.');
          router.push('/mypage/profile');
          return;
        }
        const existing = reporterRes.data as ReporterProfile | null;
        setProfile(existing);
        setCategories(categoriesRes.data || []);
        if (existing) {
          setForm({
            displayName: existing.displayName || '',
            profileImage: existing.profileImage || '',
            headline: existing.headline || '',
            bio: existing.bio || '',
            specialties: toCsv(existing.specialties),
            portfolioUrl: existing.portfolioUrl || '',
            blogUrl: existing.blogUrl || '',
            githubUrl: existing.githubUrl || '',
            previousExperience: existing.previousExperience || '',
            plannedTopics: toCsv(existing.plannedTopics),
            sampleArticleType: existing.sampleArticleType || 'direct',
            sampleArticleText: existing.sampleArticleText || '',
            sampleArticleUrl: existing.sampleArticleUrl || '',
            sampleArticleFileUrl: existing.sampleArticleFileUrl || '',
            categoryIds: existing.categoryIds || [],
          });
        } else {
          setForm((prev) => ({
            ...prev,
            displayName: userRes.data.nickname || '',
            profileImage: userRes.data.profileImage || '',
            bio: userRes.data.bio || '',
            categoryIds: userRes.data.interestCategoryIds || [],
          }));
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const toggleCategory = (id: number) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((item) => item !== id)
        : [...prev.categoryIds, id],
    }));
  };

  const submit = async () => {
    if (!form.displayName.trim() || !form.headline.trim() || !form.bio.trim()) {
      alert('활동명, 한줄 소개, 자기소개는 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/reporters/apply', {
        ...form,
        displayName: form.displayName.trim(),
        profileImage: form.profileImage.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        specialties: form.specialties.split(',').map((item) => item.trim()).filter(Boolean),
        plannedTopics: form.plannedTopics.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setProfile(res.data);
      alert(profile ? '기자 신청 내용이 저장되었습니다.' : '기자 신청이 접수되었습니다. 관리자 심사 후 알림으로 결과를 안내합니다.');
      router.push('/mypage/profile');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : '기자 신청에 실패했습니다.';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500 dark:bg-[#121212]">불러오는 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-[#121212] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-[#2E2E2E] dark:bg-[#121212]/90">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/mypage/profile" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1E1E1E]" aria-label="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div>
            <h1 className="text-base font-bold">{profile ? '기자 신청 내용' : '기자 신청하기'}</h1>
            <p className="text-xs text-gray-500">
              {profile ? '제출한 신청 내용을 확인하고 필요한 경우 보완할 수 있습니다.' : '승인 후 기사 작성, 기자 피드, 개인 통계를 사용할 수 있습니다.'}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5">
        {profile && (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="font-bold text-blue-700 dark:text-blue-300">현재 상태: {statusLabel[profile.status]}</div>
            {profile.reviewMessage && <p className="mt-2 text-gray-600 dark:text-gray-300">관리자 메모: {profile.reviewMessage}</p>}
            {profile.status === 'approved' && (
              <Link href={`/reporters/${profile.slug}`} className="mt-3 inline-block text-sm font-semibold text-blue-600 dark:text-blue-300">
                공개 기자 프로필 보기
              </Link>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="space-y-4">
            <Panel title="프로필 정보">
              <ProfileImageUploader
                nickname={form.displayName}
                value={form.profileImage}
                onChange={(url) => setForm((prev) => ({ ...prev, profileImage: url }))}
                disabled={saving || profile?.status === 'approved'}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="활동명" value={form.displayName} onChange={(value) => setForm({ ...form, displayName: value })} />
                <Field label="프로필 이미지 URL" value={form.profileImage} onChange={(value) => setForm({ ...form, profileImage: value })} />
              </div>
              <Field label="한줄 소개" value={form.headline} onChange={(value) => setForm({ ...form, headline: value })} placeholder="예: AI와 반도체를 쉽게 풀어쓰는 기자" />
              <Textarea label="자기소개" value={form.bio} onChange={(value) => setForm({ ...form, bio: value })} />
            </Panel>

            <Panel title="전문성과 활동 정보">
              <Field label="전문 분야" value={form.specialties} onChange={(value) => setForm({ ...form, specialties: value })} placeholder="AI, 반도체, 보안" />
              <Textarea label="이전 작성 경험" value={form.previousExperience} onChange={(value) => setForm({ ...form, previousExperience: value })} />
              <Field label="작성 예정 분야" value={form.plannedTopics} onChange={(value) => setForm({ ...form, plannedTopics: value })} placeholder="AI 브리핑, 업계 인터뷰, 스타트업 분석" />
              <div>
                <div className="mb-2 text-xs font-semibold text-gray-500">관심 카테고리</div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const active = form.categoryIds.includes(category.id);
                    return (
                      <button key={category.id} onClick={() => toggleCategory(category.id)} className={`rounded-full border px-3 py-1.5 text-sm ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 dark:border-[#3A3A3A] dark:text-gray-300'}`}>
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Panel>

            <Panel title="링크 및 샘플 기사">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="포트폴리오" value={form.portfolioUrl} onChange={(value) => setForm({ ...form, portfolioUrl: value })} />
                <Field label="블로그/SNS" value={form.blogUrl} onChange={(value) => setForm({ ...form, blogUrl: value })} />
                <Field label="GitHub" value={form.githubUrl} onChange={(value) => setForm({ ...form, githubUrl: value })} />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">샘플 제출 방식</span>
                <select value={form.sampleArticleType} onChange={(event) => setForm({ ...form, sampleArticleType: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none dark:border-[#3A3A3A] dark:bg-[#121212]">
                  <option value="direct">직접 작성</option>
                  <option value="pdf">PDF 업로드 링크</option>
                  <option value="url">URL 제출</option>
                </select>
              </label>
              <Textarea label="샘플 기사 본문" value={form.sampleArticleText} onChange={(value) => setForm({ ...form, sampleArticleText: value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="샘플 기사 URL" value={form.sampleArticleUrl} onChange={(value) => setForm({ ...form, sampleArticleUrl: value })} />
                <Field label="샘플 PDF 파일 URL" value={form.sampleArticleFileUrl} onChange={(value) => setForm({ ...form, sampleArticleFileUrl: value })} />
              </div>
            </Panel>
          </section>

          <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <h2 className="text-sm font-bold">심사 안내</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {profile ? (
                <>
                  <p>현재 저장된 신청 내용입니다. 심사중이거나 추가 정보 요청을 받은 경우 이 페이지에서 내용을 보완할 수 있습니다.</p>
                  <p>보완 저장 시 상태는 다시 심사중으로 유지되며, 관리자가 최신 내용을 기준으로 검토합니다.</p>
                </>
              ) : (
                <>
                  <p>신청 후 관리자가 전문 분야, 샘플 기사, 포트폴리오를 확인합니다.</p>
                  <p>승인 전까지는 일반 회원 기능만 사용할 수 있고, 승인되면 기자 대시보드가 활성화됩니다.</p>
                  <p>추가 정보 요청을 받으면 이 페이지에서 내용을 보완해 다시 제출할 수 있습니다.</p>
                </>
              )}
            </div>
            <button onClick={submit} disabled={saving || profile?.status === 'approved'} className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
              {saving ? '저장 중...' : profile?.status === 'approved' ? '이미 승인된 기자입니다' : profile ? '신청 내용 저장' : '기자 신청 제출'}
            </button>
          </aside>
        </div>
      </main>
    </div>
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

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || 'https://...'} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#3A3A3A] dark:bg-[#121212]" />
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
