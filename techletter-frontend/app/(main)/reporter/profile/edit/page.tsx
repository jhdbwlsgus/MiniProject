'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import ProfileImageUploader from '@/components/common/ProfileImageUploader';
import ProfileAvatar from '@/components/common/ProfileAvatar';
import AdminNavTabs from '@/components/admin/AdminNavTabs';
import api, { getImageUrl } from '@/lib/api';

interface Category {
  id: number;
  name: string;
}

interface ReporterProfile {
  id: number;
  slug: string;
  displayName?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  subscriptionPitch?: string | null;
  headline?: string | null;
  bio?: string | null;
  specialties?: string[] | null;
  portfolioUrl?: string | null;
  blogUrl?: string | null;
  githubUrl?: string | null;
  categoryIds?: number[] | null;
  featuredNewsIds?: number[] | null;
}

interface ReporterNews {
  id: number;
  title: string;
  status: string;
}

const toCsv = (items?: string[] | null) => (items || []).join(', ');
const fromCsv = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function ReporterProfileEditPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<ReporterProfile | null>(null);
  const [newsList, setNewsList] = useState<ReporterNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    profileImage: '',
    coverImage: '',
    subscriptionPitch: '',
    headline: '',
    bio: '',
    specialties: '',
    portfolioUrl: '',
    blogUrl: '',
    githubUrl: '',
    categoryIds: [] as number[],
    featuredNewsIds: [] as number[],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, categoriesRes, dashboardRes] = await Promise.all([
          api.get<ReporterProfile>('/reporters/me'),
          api.get<Category[]>('/categories').catch(() => ({ data: [] as Category[] })),
          api.get('/reporters/me/dashboard').catch(() => ({ data: { news: [] } })),
        ]);
        const current = profileRes.data;
        if (!current || !current.id) {
          router.push('/reporter/apply');
          return;
        }
        setProfile(current);
        setCategories(categoriesRes.data || []);
        setNewsList(dashboardRes.data.news || []);
        setForm({
          displayName: current.displayName || '',
          profileImage: current.profileImage || '',
          coverImage: current.coverImage || '',
          subscriptionPitch: current.subscriptionPitch || '',
          headline: current.headline || '',
          bio: current.bio || '',
          specialties: toCsv(current.specialties),
          portfolioUrl: current.portfolioUrl || '',
          blogUrl: current.blogUrl || '',
          githubUrl: current.githubUrl || '',
          categoryIds: current.categoryIds || [],
          featuredNewsIds: current.featuredNewsIds || [],
        });
      } catch {
        router.push('/mypage/profile');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const selectedCategories = useMemo(
    () => categories.filter((category) => form.categoryIds.includes(category.id)),
    [categories, form.categoryIds],
  );

  const completion = useMemo(() => {
    const checks = [
      !!form.displayName.trim(),
      !!form.profileImage.trim(),
      !!form.coverImage.trim(),
      !!form.subscriptionPitch.trim(),
      !!form.headline.trim(),
      !!form.bio.trim(),
      fromCsv(form.specialties).length > 0,
      form.categoryIds.length > 0,
      !!(form.portfolioUrl || form.blogUrl || form.githubUrl).trim(),
      form.featuredNewsIds.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  const checklist = [
    ['프로필 사진', !!form.profileImage.trim()],
    ['커버 이미지', !!form.coverImage.trim()],
    ['한줄 소개', !!form.headline.trim()],
    ['자기소개', !!form.bio.trim()],
    ['전문 분야', fromCsv(form.specialties).length > 0],
    ['구독 문구', !!form.subscriptionPitch.trim()],
    ['대표 기사', form.featuredNewsIds.length > 0],
  ] as const;

  const toggleCategory = (id: number) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((item) => item !== id)
        : [...prev.categoryIds, id],
    }));
  };

  const toggleFeaturedNews = (id: number) => {
    setForm((prev) => {
      const exists = prev.featuredNewsIds.includes(id);
      if (exists) {
        return { ...prev, featuredNewsIds: prev.featuredNewsIds.filter((item) => item !== id) };
      }
      if (prev.featuredNewsIds.length >= 3) {
        alert('대표 기사는 최대 3개까지 선택할 수 있습니다.');
        return prev;
      }
      return { ...prev, featuredNewsIds: [...prev.featuredNewsIds, id] };
    });
  };

  const save = async () => {
    if (!form.displayName.trim()) {
      alert('활동명을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch<ReporterProfile>('/reporters/me/profile', {
        ...form,
        displayName: form.displayName.trim(),
        profileImage: form.profileImage.trim(),
        coverImage: form.coverImage.trim(),
        subscriptionPitch: form.subscriptionPitch.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        specialties: fromCsv(form.specialties),
      });
      setProfile(res.data);
      alert('기자 프로필이 저장되었습니다.');
      router.push(`/reporters/${res.data.slug}`);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : '프로필 저장에 실패했습니다.';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500 dark:bg-[#121212]">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-[#121212] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-[#2E2E2E] dark:bg-[#121212]/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/mypage')} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1E1E1E]" aria-label="마이페이지로 돌아가기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div>
              <h1 className="text-base font-bold">프로필 편집</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">기사와 기자 피드에 표시되는 공개 정보</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile?.slug && (
              <Link href={`/reporters/${profile.slug}`} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-[#3A3A3A] dark:text-gray-300 dark:hover:bg-[#1E1E1E]">
                공개 보기
              </Link>
            )}
            <button onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
              {saving ? '저장 중' : '저장'}
            </button>
          </div>
        </div>
        <AdminNavTabs />
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <div className="h-24 bg-gray-900 dark:bg-[#0B0B0B]">
              {form.coverImage && (
                <img src={getImageUrl(form.coverImage)} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="-mt-10 px-5 pb-5">
              <ProfileAvatar nickname={form.displayName} imageUrl={form.profileImage} size="lg" />
              <div className="mt-4">
                <p className="truncate text-lg font-bold">{form.displayName || '활동명'}</p>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                  {form.headline || '한줄 소개를 입력해주세요.'}
                </p>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {form.bio || '자기소개가 공개 프로필에 표시됩니다.'}
              </p>
              {form.subscriptionPitch && (
                <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
                  {form.subscriptionPitch}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {fromCsv(form.specialties).slice(0, 4).map((item) => (
                  <span key={item} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-[#2A2A2A] dark:text-gray-300">
                    {item}
                  </span>
                ))}
                {selectedCategories.slice(0, 3).map((category) => (
                  <span key={category.id} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                    {category.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-[#2E2E2E] dark:bg-[#1E1E1E]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">프로필 완성도</h2>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">{completion}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-[#2A2A2A]">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${completion}%` }} />
            </div>
            <div className="mt-4 grid gap-2">
              {checklist.map(([label, done]) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className={done ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}>{label}</span>
                  <span className={done ? 'font-semibold text-blue-600 dark:text-blue-300' : 'text-gray-400'}>
                    {done ? '완료' : '필요'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <Panel title="사진">
            <ProfileImageUploader
              nickname={form.displayName}
              value={form.profileImage}
              onChange={(url) => setForm((prev) => ({ ...prev, profileImage: url }))}
              disabled={saving}
            />
            <Field label="커버 이미지 URL" value={form.coverImage} onChange={(value) => setForm((prev) => ({ ...prev, coverImage: value }))} placeholder="https://..." />
          </Panel>

          <Panel title="소개">
            <Field label="활동명" value={form.displayName} onChange={(value) => setForm((prev) => ({ ...prev, displayName: value }))} placeholder="예: 율" />
            <Field label="한줄 소개" value={form.headline} onChange={(value) => setForm((prev) => ({ ...prev, headline: value }))} placeholder="AI와 반도체를 쉽게 설명하는 기자" />
            <Field label="구독 유도 문구" value={form.subscriptionPitch} onChange={(value) => setForm((prev) => ({ ...prev, subscriptionPitch: value }))} placeholder="이 기자를 구독하면 AI/반도체 브리핑을 받아볼 수 있어요." />
            <Textarea label="자기소개" value={form.bio} onChange={(value) => setForm((prev) => ({ ...prev, bio: value }))} />
          </Panel>

          <Panel title="전문 분야">
            <Field label="전문 분야" value={form.specialties} onChange={(value) => setForm((prev) => ({ ...prev, specialties: value }))} placeholder="AI, 반도체, 보안" />
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = form.categoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      active
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-[#3A3A3A] dark:text-gray-300'
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="대표 기사">
            <p className="text-xs text-gray-500">공개 프로필 상단에 고정할 기사 1~3개를 선택하세요.</p>
            <div className="grid gap-2">
              {newsList.length ? newsList.map((news) => {
                const active = form.featuredNewsIds.includes(news.id);
                return (
                  <button
                    key={news.id}
                    type="button"
                    onClick={() => toggleFeaturedNews(news.id)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-[#3A3A3A] dark:text-gray-300'
                    }`}
                  >
                    <span className="font-semibold">{active ? '고정됨 · ' : ''}</span>
                    {news.title}
                  </button>
                );
              }) : (
                <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-[#121212]">선택할 기사가 없습니다.</p>
              )}
            </div>
          </Panel>

          <Panel title="링크">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="포트폴리오" value={form.portfolioUrl} onChange={(value) => setForm((prev) => ({ ...prev, portfolioUrl: value }))} placeholder="https://..." />
              <Field label="블로그/SNS" value={form.blogUrl} onChange={(value) => setForm((prev) => ({ ...prev, blogUrl: value }))} placeholder="https://..." />
              <Field label="GitHub" value={form.githubUrl} onChange={(value) => setForm((prev) => ({ ...prev, githubUrl: value }))} placeholder="https://github.com/..." />
            </div>
          </Panel>
        </section>
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
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#3A3A3A] dark:bg-[#121212]" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-500">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#3A3A3A] dark:bg-[#121212]" />
    </label>
  );
}
