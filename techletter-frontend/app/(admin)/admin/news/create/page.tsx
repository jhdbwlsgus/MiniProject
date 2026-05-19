'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import TiptapEditor from '@/components/editor/TiptapEditor';
import AdminNavTabs from '@/components/admin/AdminNavTabs';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface CurrentUser {
  id: number;
  email: string;
  role: string;
  nickname: string;
}

interface ReporterProfile {
  id: number;
  realName: string;
  organization: string;
  bio: string;
  portfolioUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectedReason?: string | null;
}

interface AiSeoResult {
  score: number;
  items: { label: string; ok: boolean; suggestion: string }[];
  keywords: string[];
  titleSuggestions: string[];
  metaSuggestion: string;
  readabilityNote: string;
}

interface DraftSummary {
  key: string;
  title: string;
  savedAt: string;
  source: 'local' | 'server';
  id?: number;
}

interface SourceReference {
  title: string;
  url: string;
  source: string;
  type: 'official' | 'press' | 'news' | 'report' | 'blog' | 'internal';
  memo: string;
}

const LEGACY_DRAFT_KEY = 'news_draft';
const DRAFT_KEY_PREFIX = 'news_create_draft';

function getDraftKey(userId?: number | string | null) {
  return `${DRAFT_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}
interface InterviewAnalysis {
  transcript: string;
  summary: string[];
  keyQuotes: string[];
  titleSuggestions: string[];
  lead: string;
  tags: string[];
  articleOutline: string[];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

function calcBasicSeo(form: any) {
  const contentText = form.content.replace(/<[^>]*>/g, '');
  const hasH2 = form.content.includes('<h2') || form.content.includes('<h3');
  return [
    { label: '제목 길이 (10~60자)',       ok: form.title.length >= 10 && form.title.length <= 60,    suggestion: '제목을 10~60자 사이로 작성해주세요.' },
    { label: '메타 설명 (50~160자)',      ok: form.metaDescription.length >= 50,                      suggestion: '메타 설명을 50자 이상 입력해주세요.' },
    { label: 'URL 슬러그 입력',           ok: form.slug.length > 0,                                   suggestion: 'URL 슬러그를 입력해주세요.' },
    { label: '태그 3개 이상',             ok: form.tags.length >= 3,                                  suggestion: '태그를 3개 이상 추가해주세요.' },
    { label: '본문 500자 이상',           ok: contentText.length >= 500,                              suggestion: `현재 ${contentText.length}자, 500자 이상 작성을 권장합니다.` },
    { label: '썸네일 이미지 등록',        ok: form.thumbnailUrl.length > 0,                           suggestion: '썸네일 이미지를 등록해주세요.' },
    { label: '리드문 입력',               ok: form.lead.length > 0,                                   suggestion: '리드문을 입력해주세요.' },
    { label: '소제목(H2/H3) 포함',        ok: hasH2,                                                  suggestion: '본문에 소제목을 추가하면 가독성이 향상됩니다.' },
  ];
}

function getSeoReport(form: any) {
  const contentText = form.content.replace(/<[^>]*>/g, '');
  const hasHeading = form.content.includes('<h2') || form.content.includes('<h3');
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const required = [
    {
      label: '제목 길이',
      ok: form.title.length >= 10 && form.title.length <= 60,
      value: `${form.title.length}/60자`,
      suggestion: '검색 결과에서 잘리지 않도록 10~60자로 맞춰주세요.',
    },
    {
      label: '메타 설명',
      ok: form.metaDescription.length >= 50 && form.metaDescription.length <= 160,
      value: `${form.metaDescription.length}/160자`,
      suggestion: '검색 결과에 보이는 설명입니다. 50~160자로 요약해주세요.',
    },
    {
      label: 'URL 슬러그',
      ok: slugPattern.test(form.slug),
      value: form.slug || '없음',
      suggestion: '영문 소문자, 숫자, 하이픈만 사용하면 주소가 안정적입니다.',
    },
    {
      label: '본문 분량',
      ok: contentText.length >= 500,
      value: `${contentText.length}자`,
      suggestion: '검색 품질을 위해 본문을 500자 이상 작성해주세요.',
    },
  ];

  const recommended = [
    {
      label: '태그',
      ok: form.tags.length >= 3,
      value: `${form.tags.length}개`,
      suggestion: '주요 키워드 태그를 3개 이상 추가해주세요.',
    },
    {
      label: '썸네일',
      ok: !!form.thumbnailUrl,
      value: form.thumbnailUrl ? '등록됨' : '없음',
      suggestion: '공유 화면과 목록에서 보일 대표 이미지를 등록해주세요.',
    },
    {
      label: '리드문',
      ok: !!form.lead.trim(),
      value: form.lead ? `${form.lead.length}자` : '없음',
      suggestion: '기사의 핵심을 1~2문장으로 먼저 보여주세요.',
    },
    {
      label: '소제목',
      ok: hasHeading,
      value: hasHeading ? '포함' : '없음',
      suggestion: 'H2/H3 소제목을 넣으면 읽기 흐름이 좋아집니다.',
    },
  ];

  const items = [...required, ...recommended];
  const score = Math.round((items.filter((item) => item.ok).length / items.length) * 100);
  return { required, recommended, items, score };
}

function getArticleQualityReport(form: any, sourceReferences: SourceReference[]) {
  const html = String(form.content ?? '');
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const paragraphs = html
    .split(/<\/p>|<br\s*\/?>|<\/h[1-6]>/i)
    .map((item: string) => item.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const sentences = text.split(/[.!?。！？]\s*|[다요]\.\s*/).map((item: string) => item.trim()).filter(Boolean);
  const longParagraphs = paragraphs.filter((paragraph: string) => paragraph.length > 320);
  const longSentences = sentences.filter((sentence: string) => sentence.length > 120);
  const words: string[] = text.match(/[가-힣A-Za-z0-9]{2,}/g) ?? [];
  const frequency: Record<string, number> = {};
  words.forEach((word) => {
    const normalized = word.toLowerCase();
    if (normalized.length < 3) return;
    frequency[normalized] = (frequency[normalized] ?? 0) + 1;
  });
  const repeatedWords = Object.entries(frequency)
    .filter(([, count]) => count >= 6)
    .slice(0, 5)
    .map(([word, count]) => `${word} ${count}회`);
  const hasHeading = form.content.includes('<h2') || form.content.includes('<h3');
  const activeSources = sourceReferences.filter((source) => source.title.trim() || source.url.trim() || source.memo.trim());
  const checks = [
    { label: '본문 500자 이상', ok: text.length >= 500, detail: `${text.length}자` },
    { label: '소제목 포함', ok: hasHeading, detail: hasHeading ? '포함' : '없음' },
    { label: '긴 문단 없음', ok: longParagraphs.length === 0, detail: `${longParagraphs.length}개` },
    { label: '긴 문장 없음', ok: longSentences.length === 0, detail: `${longSentences.length}개` },
    { label: '반복 표현 적음', ok: repeatedWords.length === 0, detail: repeatedWords.length ? repeatedWords.join(', ') : '양호' },
    { label: '출처 1개 이상', ok: activeSources.length > 0, detail: `${activeSources.length}개` },
    { label: '리드문 작성', ok: !!form.lead.trim(), detail: form.lead ? `${form.lead.length}자` : '없음' },
    { label: '태그 3개 이상', ok: form.tags.length >= 3, detail: `${form.tags.length}개` },
  ];
  const score = Math.round((checks.filter((check) => check.ok).length / checks.length) * 100);
  return { score, checks, longParagraphs, longSentences, repeatedWords };
}

export default function AdminNewsCreatePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: '',
    content: '',
    categoryId: '',
    status: 'draft',
    thumbnailUrl: '',
    lead: '',
    metaDescription: '',
    slug: '',
    tags: [] as string[],
    scheduledAt: '',
    isPremium: false,
    premiumExcerpt: '',
  });

  const [premiumContent, setPremiumContent] = useState({
    keyPoints: [''],
    editorComment: '',
    relatedLinks: [{ title: '', url: '' }],
  });
  const [isPremium, setIsPremium] = useState(false);

  const [sourceReferences, setSourceReferences] = useState<SourceReference[]>([
    { title: '', url: '', source: '', type: 'news', memo: '' },
  ]);

  const [newsletterOption, setNewsletterOption] = useState({
    enabled: false,
    type: 'manual' as 'daily' | 'weekly' | 'manual',
    isScheduled: false,
    scheduledAt: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'pc' | 'mobile'>('pc');
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const metaDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [reporterProfile, setReporterProfile] = useState<ReporterProfile | null>(null);
  const [reporterGateLoading, setReporterGateLoading] = useState(true);
  const [reporterApplyLoading, setReporterApplyLoading] = useState(false);
  const [reporterApplyError, setReporterApplyError] = useState('');
  const [reporterApplyForm, setReporterApplyForm] = useState({
    realName: '',
    organization: '',
    bio: '',
    portfolioUrl: '',
  });

  // 자동 임시저장
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [draftKey, setDraftKey] = useState(getDraftKey());
  const [draftKeyReady, setDraftKeyReady] = useState(false);
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [serverDraftId, setServerDraftId] = useState<number | null>(null);
  const [showDraftManager, setShowDraftManager] = useState(false);
  const skipDirtyCheckRef = useRef(false);

  // AI 패널
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiSeoResult, setAiSeoResult] = useState<AiSeoResult | null>(null);
  const [aiGeneratedContents, setAiGeneratedContents] = useState<{
    titles: string[];
    lead: string;
    tags: string[];
    meta: string;
    keyPoints: string[];
    newsletterSummary: string;
    styleNote: string;
  }>({
    titles: [], lead: '', tags: [], meta: '',
    keyPoints: [], newsletterSummary: '', styleNote: '',
  });
  const [interviewFile, setInterviewFile] = useState<File | null>(null);
  const [interviewResult, setInterviewResult] = useState<InterviewAnalysis | null>(null);
  const interviewFileRef = useRef<HTMLInputElement>(null);

  // 예상 수신자
  const [estimatedRecipients, setEstimatedRecipients] = useState<Record<string, number>>({
    daily: 0, weekly: 0, manual: 0,
  });

  const typeLabel: Record<string, string> = {
    daily: '데일리 구독자', weekly: '위클리 구독자', manual: '전체 구독자',
  };

  const basicSeoItems = calcBasicSeo(form);
  const basicSeoScore = Math.round(
    (basicSeoItems.filter(i => i.ok).length / basicSeoItems.length) * 100
  );

  const refreshDrafts = useCallback(() => {
    const summaries: DraftSummary[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || (!key.startsWith(DRAFT_KEY_PREFIX) && key !== LEGACY_DRAFT_KEY)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        if (!parsed.form) continue;
        summaries.push({
          key,
          title: parsed.form.title || '제목 없는 초안',
          savedAt: parsed.savedAt || new Date().toISOString(),
          source: 'local',
        });
      } catch {}
    }
    setDrafts(summaries.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
  }, []);

  const refreshAllDrafts = useCallback(async () => {
    const localSummaries: DraftSummary[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || (!key.startsWith(DRAFT_KEY_PREFIX) && key !== LEGACY_DRAFT_KEY)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        if (!parsed.form) continue;
        localSummaries.push({
          key,
          title: parsed.form.title || '제목 없는 초안',
          savedAt: parsed.savedAt || new Date().toISOString(),
          source: 'local',
        });
      } catch {}
    }

    try {
      const res = await api.get('/news/admin?status=draft&mine=true&limit=50');
      const serverDrafts = (res.data.news || []).map((news: any) => ({
        key: `server:${news.id}`,
        id: news.id,
        title: news.title || '제목 없는 임시글',
        savedAt: news.updatedAt || news.createdAt || new Date().toISOString(),
        source: 'server' as const,
      }));
      setDrafts([...serverDrafts, ...localSummaries].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
    } catch {
      setDrafts(localSummaries.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
    }
  }, []);

  const saveDraft = useCallback((key = draftKey) => {
    if (!form.title.trim() && !form.content.trim()) return false;

    localStorage.setItem(key, JSON.stringify({
      form,
      premiumContent,
      sourceReferences,
      newsletterOption,
      serverDraftId,
      savedAt: new Date().toISOString(),
    }));
    if (key !== LEGACY_DRAFT_KEY) localStorage.removeItem(LEGACY_DRAFT_KEY);
    setLastSaved(new Date());
    setHasUnsaved(false);
    refreshDrafts();
    return true;
  }, [draftKey, form, premiumContent, sourceReferences, newsletterOption, serverDraftId, refreshDrafts]);

  const loadDraft = async (draft: DraftSummary) => {
    if (draft.source === 'server' && draft.id) {
      if (hasUnsaved && form.title && !confirm('현재 작성 중인 내용이 있어요. 선택한 서버 임시글을 불러올까요?')) return;
      try {
        const { data: news } = await api.get(`/news/${draft.id}`);
        skipDirtyCheckRef.current = true;
        setForm({
          title: news.title || '',
          content: news.content || '',
          categoryId: news.categoryId ? String(news.categoryId) : '',
          status: news.status || 'draft',
          thumbnailUrl: news.thumbnailUrl || '',
          lead: news.lead || '',
          metaDescription: news.metaDescription || '',
          slug: news.slug || '',
          tags: Array.isArray(news.tags) ? news.tags.map((tag: { name?: string }) => tag.name).filter(Boolean) : [],
          scheduledAt: news.scheduledAt || '',
          isPremium: Boolean(news.isPremium),
          premiumExcerpt: news.premiumExcerpt || '',
        });
        if (news.premiumContent) setPremiumContent(news.premiumContent);
        setSourceReferences(news.sourceReferences?.length ? news.sourceReferences : [{ title: '', url: '', source: '', type: 'news', memo: '' }]);
        setServerDraftId(news.id);
        setLastSaved(news.updatedAt ? new Date(news.updatedAt) : null);
        setHasUnsaved(false);
        setShowDraftManager(false);
      } catch {
        alert('서버 임시글을 불러오지 못했습니다.');
      }
      return;
    }

    const key = draft.key;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    if (hasUnsaved && form.title && !confirm('현재 작성 중인 내용이 있어요. 선택한 초안을 불러올까요?')) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.form) return;
      skipDirtyCheckRef.current = true;
      setForm(parsed.form);
      if (parsed.premiumContent) setPremiumContent(parsed.premiumContent);
      if (parsed.sourceReferences) setSourceReferences(parsed.sourceReferences);
      if (parsed.newsletterOption) setNewsletterOption(parsed.newsletterOption);
      if (typeof parsed.isPremium === 'boolean') setIsPremium(parsed.isPremium);
      setDraftKey(key);
      setServerDraftId(parsed.serverDraftId ?? null);
      setLastSaved(parsed.savedAt ? new Date(parsed.savedAt) : null);
      setHasUnsaved(false);
      setShowDraftManager(false);
    } catch {}
  };

  const deleteDraft = async (draft: DraftSummary) => {
    if (!confirm('이 임시저장 초안을 삭제할까요?')) return;
    if (draft.source === 'server' && draft.id) {
      try {
        await api.delete(`/news/${draft.id}`);
        if (serverDraftId === draft.id) setServerDraftId(null);
        await refreshAllDrafts();
      } catch {
        alert('서버 임시글 삭제에 실패했습니다.');
      }
      return;
    }
    localStorage.removeItem(draft.key);
    await refreshAllDrafts();
  };

  useEffect(() => {
    api.get('/users/me')
      .then((res) => setDraftKey(getDraftKey(res.data?.id)))
      .catch(() => setDraftKey(getDraftKey()))
      .finally(() => setDraftKeyReady(true));
    refreshAllDrafts();
  }, [refreshAllDrafts]);

    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
    const saved = localStorage.getItem(draftKey) || localStorage.getItem(LEGACY_DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const shouldRestore = confirm('이전에 작성 중인 내용이 있어요. 복구할까요?');
        if (shouldRestore) {
          skipDirtyCheckRef.current = true;
          setForm(parsed.form);
          if (parsed.premiumContent) setPremiumContent(parsed.premiumContent);
          if (parsed.sourceReferences) setSourceReferences(parsed.sourceReferences);
          if (parsed.newsletterOption) setNewsletterOption(parsed.newsletterOption);
          setServerDraftId(parsed.serverDraftId ?? null);
          setLastSaved(parsed.savedAt ? new Date(parsed.savedAt) : null);
          setHasUnsaved(false);
        }
        if (shouldRestore) localStorage.setItem(draftKey, JSON.stringify({ ...parsed, savedAt: parsed.savedAt ?? new Date().toISOString() }));
        else localStorage.removeItem(draftKey);
        localStorage.removeItem(LEGACY_DRAFT_KEY);
      } catch {}
    }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (skipDirtyCheckRef.current) {
      skipDirtyCheckRef.current = false;
      return;
    }
    setHasUnsaved(true);
  }, [form, premiumContent, sourceReferences, newsletterOption]);

  useEffect(() => {
    if (!hasUnsaved || !form.title) return;
    const timer = setTimeout(() => {
      setAutoSaving(true);
      saveDraft();
      setAutoSaving(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [hasUnsaved, form.title, saveDraft]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved && form.title) {
        saveDraft();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsaved, form.title, saveDraft]);

  useEffect(() => {
    if (!newsletterOption.enabled) return;
    api.get(`/newsletter/estimated-recipients?type=${newsletterOption.type}`)
      .then(res => setEstimatedRecipients(prev => ({ ...prev, [newsletterOption.type]: res.data.count })))
      .catch(() => {});
  }, [newsletterOption.enabled, newsletterOption.type]);

  const handleTitleChange = (title: string) => {
    setForm(f => ({ ...f, title, slug: f.slug ? f.slug : generateSlug(title) }));
  };

  const handleThumbnailUpload = async (file: File) => {
    setThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(f => ({ ...f, thumbnailUrl: res.data.url }));
    } catch { alert('이미지 업로드 실패'); }
    finally { setThumbnailUploading(false); }
  };

  const addTag = () => {
    const tags = tagInput
      .split(/[\s,，、]+/)
      .map((tag) => tag.trim().replace(/^#+/, ''))
      .filter(Boolean);

    if (tags.length) {
      setForm((f) => ({
        ...f,
        tags: [...f.tags, ...tags.filter((tag) => !f.tags.includes(tag))],
      }));
    }
    setTagInput('');
  };
  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const getDraftPayload = () => ({
    ...form,
    title: form.title.trim() || '제목 없는 임시글',
    content: form.content.trim() || '<p></p>',
    status: 'draft',
    categoryId: form.categoryId ? +form.categoryId : null,
    sourceReferences: sourceReferences.filter((source) => source.title.trim() || source.url.trim() || source.memo.trim()),
    premiumContent: form.isPremium ? premiumContent : null,
  });

  const handleManualSave = async () => {
    if (!form.title.trim() && !form.content.trim() && !form.lead.trim()) {
      alert('임시저장할 제목이나 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = getDraftPayload();
      const res = serverDraftId
        ? await api.put(`/news/${serverDraftId}`, payload)
        : await api.post('/news', payload);
      setServerDraftId(res.data.id);
      localStorage.removeItem(draftKey);
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      setLastSaved(new Date());
      setHasUnsaved(false);
      await refreshAllDrafts();
      alert('서버에 임시저장 되었습니다. 로그아웃 후 다시 로그인해도 임시글에서 불러올 수 있어요.');
    } catch (err: any) {
      saveDraft();
      setError(err.response?.data?.message || '서버 임시저장에 실패해서 이 브라우저에만 임시저장했습니다.');
      alert('서버 임시저장에 실패해서 이 브라우저에만 임시저장했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (status: string) => {
    if (status !== 'draft' && !form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (status !== 'draft' && !form.content.trim()) { setError('내용을 입력해주세요.'); return; }
    if (status === 'draft' && !form.title.trim() && !form.content.trim() && !form.lead.trim()) {
      setError('임시저장할 제목이나 내용을 입력해주세요.');
      return;
    }
    if (newsletterOption.enabled && newsletterOption.isScheduled && !newsletterOption.scheduledAt) {
      setError('뉴스레터 예약 발송 시간을 입력해주세요.'); return;
    }
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        title: status === 'draft' ? (form.title.trim() || '제목 없는 임시글') : form.title,
        content: status === 'draft' ? (form.content.trim() || '<p></p>') : form.content,
        sourceReferences: sourceReferences.filter((source) => source.title.trim() || source.url.trim() || source.memo.trim()),
        premiumContent: form.isPremium ? premiumContent : null,
        status,
        categoryId: form.categoryId ? +form.categoryId : null,
      };
      const res = serverDraftId
        ? await api.put(`/news/${serverDraftId}`, payload)
        : await api.post('/news', payload);
      if (status === 'draft') setServerDraftId(res.data.id);
      if (newsletterOption.enabled && status !== 'draft') {
        await api.post('/newsletter/send', {
          title: form.title, newsId: res.data.id, type: newsletterOption.type,
          scheduledAt: newsletterOption.isScheduled ? newsletterOption.scheduledAt : null,
        });
      }
      localStorage.removeItem(draftKey);
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      setHasUnsaved(false);
      if (status === 'draft') alert('임시저장 되었습니다.');
      else if (newsletterOption.enabled) alert(newsletterOption.isScheduled ? '기사 저장 + 뉴스레터 예약 완료!' : '기사 발행 + 뉴스레터 발송 완료!');
      else alert('발행되었습니다!');
      router.push('/admin/news');
    } catch (err: any) {
      setError(err.response?.data?.message || '뉴스 작성에 실패했습니다.');
    } finally { setLoading(false); }
  };

  // ✅ AI 통합 분석 (SEO + 모든 보조 기능 한번에)
  const handleAiAnalyze = async () => {
    if (!form.title && !form.content) { alert('제목 또는 본문을 입력해주세요.'); return; }
    setAiLoading('analyze');
    const contentText = form.content.replace(/<[^>]*>/g, '').slice(0, 1000);
    try {
      const { data: aiResult } = await api.post('/news/ai/analyze', {
        title: form.title,
        content: form.content,
        tags: form.tags,
      });

      setAiSeoResult({
        score: aiResult.seoScore || 0,
        items: aiResult.seoItems || [],
        keywords: aiResult.keywords || [],
        titleSuggestions: aiResult.titleSuggestions || [],
        metaSuggestion: aiResult.metaSuggestion || '',
        readabilityNote: aiResult.readabilityNote || '',
      });
      setAiGeneratedContents({
        titles: aiResult.titleSuggestions || [],
        lead: aiResult.lead || '',
        tags: aiResult.tags || [],
        meta: aiResult.metaSuggestion || '',
        keyPoints: aiResult.keyPoints || [],
        newsletterSummary: aiResult.newsletterSummary || '',
        styleNote: aiResult.styleNote || '',
      });
      return;

      const response = await fetch('/news/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': '',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `다음 뉴스 기사를 분석하여 JSON 형식으로만 응답해주세요. 다른 텍스트는 절대 포함하지 마세요.

  제목: ${form.title || '(미입력)'}
  본문: ${contentText || '(미입력)'}
  현재 태그: ${form.tags.join(', ') || '(없음)'}

  다음 JSON 구조로 응답하세요:
  {
    "seoScore": 75,
    "seoItems": [
      {"label": "제목이 검색 친화적입니다", "ok": true, "suggestion": ""},
      {"label": "키워드가 본문에 적절히 분포되어 있습니다", "ok": true, "suggestion": ""},
      {"label": "소제목 추가를 권장합니다", "ok": false, "suggestion": "H2 태그로 소제목을 2~3개 추가하면 가독성과 SEO가 향상됩니다"},
      {"label": "키워드 반복 빈도가 적절합니다", "ok": true, "suggestion": ""},
      {"label": "검색 노출 가능성이 높습니다", "ok": false, "suggestion": "롱테일 키워드를 제목에 포함시켜 보세요"}
    ],
    "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"],
    "titleSuggestions": ["추천제목1", "추천제목2", "추천제목3"],
    "metaSuggestion": "SEO에 최적화된 메타 설명 (50~160자)",
    "lead": "2문장 이내의 리드문",
    "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
    "keyPoints": ["핵심포인트1", "핵심포인트2", "핵심포인트3"],
    "newsletterSummary": "뉴스레터용 2~3문장 요약",
    "styleNote": "문체 및 가독성 분석 결과 한 문장",
    "readabilityNote": "본문 구조 개선 제안 한 문장"
  }`
          }],
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      // ✅ 여기가 핵심 변경 포인트
      const text = data.choices?.[0]?.message?.content || '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      setAiSeoResult({
        score: parsed.seoScore || 0,
        items: parsed.seoItems || [],
        keywords: parsed.keywords || [],
        titleSuggestions: parsed.titleSuggestions || [],
        metaSuggestion: parsed.metaSuggestion || '',
        readabilityNote: parsed.readabilityNote || '',
      });
      setAiGeneratedContents({
        titles: parsed.titleSuggestions || [],
        lead: parsed.lead || '',
        tags: parsed.tags || [],
        meta: parsed.metaSuggestion || '',
        keyPoints: parsed.keyPoints || [],
        newsletterSummary: parsed.newsletterSummary || '',
        styleNote: parsed.styleNote || '',
      });
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(null);
    }
  };

  const handleReporterApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setReporterApplyLoading(true);
    setReporterApplyError('');
    try {
      const res = await api.post('/reporters/apply', reporterApplyForm);
      setReporterProfile(res.data);
      alert('기자 인증 신청이 접수되었습니다. 관리자 승인 후 기사 작성이 가능합니다.');
    } catch (err: any) {
      setReporterApplyError(err.response?.data?.message || '기자 인증 신청에 실패했습니다.');
    } finally {
      setReporterApplyLoading(false);
    }
  };

  const handleInterviewAnalyze = async () => {
    if (!interviewFile) { alert('인터뷰 음성 파일을 선택해 주세요.'); return; }
    setAiLoading('interview');
    try {
      const formData = new FormData();
      formData.append('file', interviewFile);
      const res = await api.post('/interviews/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setInterviewResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || '인터뷰 녹취 분석에 실패했습니다.');
    } finally {
      setAiLoading(null);
    }
  };

  const applyInterviewToContent = () => {
    if (!interviewResult) return;
    const blocks = [
      '<h2>인터뷰 핵심 요약</h2>',
      '<ul>',
      ...interviewResult.summary.map(item => `<li>${item}</li>`),
      '</ul>',
      interviewResult.keyQuotes.length ? '<h2>주요 발언</h2>' : '',
      ...interviewResult.keyQuotes.map(item => `<blockquote>${item}</blockquote>`),
      interviewResult.articleOutline.length ? '<h2>기사 구성안</h2>' : '',
      '<ol>',
      ...interviewResult.articleOutline.map(item => `<li>${item}</li>`),
      '</ol>',
      '<h2>전체 녹취록</h2>',
      `<p>${interviewResult.transcript.replace(/\n/g, '<br />')}</p>`,
    ].filter(Boolean);
    setForm(f => ({ ...f, content: `${f.content || ''}${f.content ? '<hr />' : ''}${blocks.join('')}` }));
  };

  const seoScore = aiSeoResult?.score ?? basicSeoScore;
  const seoItems = aiSeoResult?.items.length ? aiSeoResult.items : basicSeoItems;
  const seoColor = seoScore >= 80 ? 'text-emerald-400' : seoScore >= 50 ? 'text-yellow-400' : 'text-red-400';
  const seoBarColor = seoScore >= 80 ? 'bg-emerald-500' : seoScore >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  const displayedSeoScore = Math.max(0, Math.min(100, Math.round((seoItems.filter((item) => item.ok).length / seoItems.length) * 100)));
  const displayedSeoBarColor = displayedSeoScore >= 80 ? 'bg-emerald-500' : displayedSeoScore >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const seoStatusLabel = displayedSeoScore >= 80 ? '발행 준비 좋음' : displayedSeoScore >= 50 ? '보완 필요' : '필수 항목 부족';
  const metaPreview = form.metaDescription || form.lead || form.content.replace(/<[^>]*>/g, '').slice(0, 120);
  const qualityReport = getArticleQualityReport(form, sourceReferences);
  const qualityColor = qualityReport.score >= 80 ? 'text-emerald-400' : qualityReport.score >= 55 ? 'text-yellow-400' : 'text-red-400';
  const qualityBarColor = qualityReport.score >= 80 ? 'bg-emerald-500' : qualityReport.score >= 55 ? 'bg-yellow-500' : 'bg-red-500';

  const applyMetaDescription = (description: string) => {
    setForm((f) => ({ ...f, metaDescription: description }));
    requestAnimationFrame(() => {
      metaDescriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      metaDescriptionRef.current?.focus();
    });
  };

  const updateSourceReference = (index: number, patch: Partial<SourceReference>) => {
    setSourceReferences((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addSourceReference = () => {
    setSourceReferences((items) => [...items, { title: '', url: '', source: '', type: 'news', memo: '' }]);
  };

  const removeSourceReference = (index: number) => {
    setSourceReferences((items) => items.length <= 1 ? items : items.filter((_, i) => i !== index));
  };

  const premiumContentSection = (
    <div className="order-[10] bg-gray-800 border border-yellow-600/30 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
        <div>
          <p className="text-sm font-semibold text-yellow-300">프리미엄 기사</p>
          <p className="mt-1 text-xs text-gray-400">켜면 프리미엄 구독자만 전체 본문과 추가 콘텐츠를 볼 수 있습니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setForm((prev) => ({ ...prev, isPremium: !prev.isPremium }))}
          className={`h-6 w-11 rounded-full px-0.5 transition ${form.isPremium ? 'bg-yellow-500' : 'bg-gray-700'}`}
          aria-label="프리미엄 기사 설정"
        >
          <span className={`block h-5 w-5 rounded-full bg-white transition ${form.isPremium ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {form.isPremium && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">비구독자 공개 미리보기</label>
          <textarea
            value={form.premiumExcerpt}
            onChange={(e) => setForm({ ...form, premiumExcerpt: e.target.value })}
            placeholder="프리미엄 구독 전에도 보여줄 도입부나 요약을 입력하세요. 비워두면 리드문 또는 본문 일부가 사용됩니다."
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-medium">구독자 전용</span>
        <span className="text-sm text-gray-500">뉴스레터에만 포함되는 추가 콘텐츠</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${isPremium ? 'bg-emerald-600 text-emerald-100' : 'bg-gray-800 text-gray-300'}`}>
          {isPremium ? '프리미엄 콘텐츠' : '무료 공개 콘텐츠'}
        </span>
        <p className="text-xs text-gray-500">프리미엄으로 설정하면 구독자 전용 또는 유료 기사 표시로 활용할 수 있습니다.</p>
      </div>
    </section>
  );

  if (reporterGateLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-sm text-gray-500">
        권한 확인 중...
      </div>
    );
  }

  if (!canWriteNews) {
    const isPending = reporterProfile?.status === 'pending';
    const isRejected = reporterProfile?.status === 'rejected';

    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10 text-white">
        <div className="mx-auto w-full max-w-2xl rounded-lg border border-gray-800 bg-gray-900 p-8 shadow">
          <button
            type="button"
            onClick={() => router.push('/mypage')}
            className="mb-6 text-sm text-blue-400 hover:text-blue-300"
          >
            마이페이지로 돌아가기
          </button>

          <h1 className="text-2xl font-bold">기자 인증이 필요합니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            회원가입은 일반 계정으로 진행하고, 기사 작성 권한은 이 화면에서 별도로 신청합니다.
            승인되면 기사 작성과 관리 기능을 사용할 수 있습니다.
          </p>

          {isPending ? (
            <div className="mt-8 rounded-lg border border-yellow-700 bg-yellow-950/40 p-5 text-sm text-yellow-200">
              기자 인증 신청이 접수되어 관리자 승인을 기다리고 있습니다.
            </div>
          ) : (
            <>
              {isRejected && (
                <div className="mt-8 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
                  이전 신청이 반려되었습니다.
                  {reporterProfile?.rejectedReason && (
                    <div className="mt-2 text-red-100">사유: {reporterProfile.rejectedReason}</div>
                  )}
                </div>
              )}

              {reporterApplyError && (
                <div className="mt-6 rounded-lg bg-red-950 p-3 text-sm text-red-300">
                  {reporterApplyError}
                </div>
              )}

              <form onSubmit={handleReporterApply} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-300">실명</label>
                  <input
                    type="text"
                    value={reporterApplyForm.realName}
                    onChange={(e) => setReporterApplyForm({ ...reporterApplyForm, realName: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300">소속/매체명</label>
                  <input
                    type="text"
                    value={reporterApplyForm.organization}
                    onChange={(e) => setReporterApplyForm({ ...reporterApplyForm, organization: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm text-gray-300">포트폴리오 URL</label>
                  <input
                    type="url"
                    value={reporterApplyForm.portfolioUrl}
                    onChange={(e) => setReporterApplyForm({ ...reporterApplyForm, portfolioUrl: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm text-gray-300">기자 소개 및 신청 사유</label>
                  <textarea
                    value={reporterApplyForm.bio}
                    onChange={(e) => setReporterApplyForm({ ...reporterApplyForm, bio: e.target.value })}
                    className="min-h-32 w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="취재 분야, 경력, 작성하고 싶은 기사 주제를 적어주세요."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={reporterApplyLoading}
                  className="rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 sm:col-span-2"
                >
                  {reporterApplyLoading ? '신청 중...' : isRejected ? '기자 인증 다시 신청' : '기자 인증 신청'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-200 pb-28">
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => {
            if (hasUnsaved && form.title && !confirm('저장하지 않은 내용이 있어요. 이동할까요?')) return;
            router.push('/mypage');
          }} className="text-gray-400 hover:text-white transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="font-bold text-base flex-1">새 뉴스 작성</span>

          {/* 저장 상태 */}
          <div className="text-xs text-gray-500 flex items-center gap-1">
            {autoSaving ? (
              <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>저장 중...</>
            ) : lastSaved ? `${lastSaved.getHours()}:${String(lastSaved.getMinutes()).padStart(2, '0')} 저장됨`
            : hasUnsaved && form.title ? <span className="text-yellow-500">● 미저장</span> : null}
          </div>

          {/* AI 패널 토글 */}
          <button onClick={() => setShowAiPanel(!showAiPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              showAiPanel ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            AI 보조
          </button>

          <div className="flex gap-2">
            <button onClick={() => { refreshAllDrafts(); setShowDraftManager((v) => !v); }} disabled={loading}
              className="text-sm px-3 py-1.5 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition">
              임시글
            </button>
            <button onClick={() => router.push('/admin/news')} disabled={loading}
              className="text-sm px-3 py-1.5 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition">
              목록으로
            </button>
            <button onClick={handleManualSave} disabled={loading}
              className="text-sm px-3 py-1.5 border border-blue-700 rounded-lg text-blue-400 hover:text-blue-300 transition disabled:opacity-50">
              임시저장
            </button>
            <button onClick={() => handleSubmit('published')} disabled={loading}
              className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50">
              {loading ? '발행 중...' : '발행'}
            </button>
          </div>
        </div>
        <AdminNavTabs />
      </header>

      <div className={`max-w-5xl mx-auto px-4 py-6 pb-12 flex gap-6 ${showAiPanel ? '' : 'justify-center'}`}>

        {/* 메인 에디터 */}
        <main className={`flex flex-col gap-5 ${showAiPanel ? 'flex-1 min-w-0' : 'w-full max-w-3xl'}`}>
          {error && <div className="p-3 bg-red-900 text-red-300 rounded-lg text-sm">{error}</div>}

          {showDraftManager && (
            <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">임시저장 글</h3>
                  <p className="text-xs text-gray-500 mt-0.5">저장된 초안을 불러오거나 삭제할 수 있습니다.</p>
                </div>
                <button onClick={() => setShowDraftManager(false)} className="text-xs text-gray-500 hover:text-white">닫기</button>
              </div>
              {drafts.length ? (
                <div className="flex flex-col gap-2">
                  {drafts.map((draft) => (
                    <div key={draft.key} className="flex items-center justify-between gap-3 rounded-lg bg-gray-900 border border-gray-700 p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm text-gray-200">{draft.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${draft.source === 'server' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700 text-gray-400'}`}>
                            {draft.source === 'server' ? '서버 저장' : '브라우저 저장'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(draft.savedAt).toLocaleString('ko-KR')}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => loadDraft(draft)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 transition">편집</button>
                        <button onClick={() => deleteDraft(draft)} className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-red-900 hover:text-red-200 transition">삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900 p-6 text-center text-sm text-gray-500">
                  저장된 임시글이 없습니다.
                </div>
              )}
            </section>
          )}

          {/* 제목 */}
          <div>
            <input type="text" placeholder="뉴스 제목 입력" value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-base text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-600">{form.title.length}/60자</span>
              {form.title.length > 60 && <span className="text-xs text-red-400">제목이 너무 길어요</span>}
            </div>
          </div>

          {/* 리드문 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">리드문 (기사 요약)</label>
            <textarea placeholder="기사 핵심 내용을 한두 문장으로 요약해주세요" value={form.lead}
              onChange={(e) => setForm({ ...form, lead: e.target.value })} rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 카테고리 + 상태 */}
          {premiumContentSection}

          <div className="order-[3] grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">카테고리</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">선택</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">상태</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">임시저장</option>
                <option value="review">검토 요청</option>
                <option value="approved">승인 완료</option>
                <option value="published">게시 완료</option>
                <option value="scheduled">예약 게시</option>
              </select>
            </div>
          </div>

          {form.status === 'scheduled' && (
            <div className="order-[4]">
              <label className="text-xs text-gray-500 mb-1 block">예약 발행 시간</label>
              <input type="datetime-local" value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* 썸네일 */}
          <div className="order-[5]">
            <label className="text-xs text-gray-500 mb-1 block">썸네일</label>
            {form.thumbnailUrl && (
              <div className="relative mb-2 w-full h-40 rounded-lg overflow-hidden bg-gray-800">
                <img src={form.thumbnailUrl} alt="썸네일" className="w-full h-full object-cover" />
                <button onClick={() => setForm(f => ({ ...f, thumbnailUrl: '' }))}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition">✕</button>
              </div>
            )}
            <input type="text" placeholder="이미지 URL 직접 입력" value={form.thumbnailUrl}
              onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <input ref={thumbnailRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleThumbnailUpload(file); }}
            />
            <button onClick={() => thumbnailRef.current?.click()} disabled={thumbnailUploading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 rounded-lg transition disabled:opacity-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
              {thumbnailUploading ? '업로드 중...' : '이미지 파일 업로드'}
            </button>
          </div>

          {/* 태그 */}
          <div className="order-[6]">
            <label className="text-xs text-gray-500 mb-1 block">태그</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded-full">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-white">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="#태그 입력 후 Enter" value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={addTag} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition">추가</button>
            </div>
          </div>

          {/* SEO */}
          <div className="order-[9] bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">SEO 설정</div>
                <p className="mt-1 text-xs text-gray-500">검색 결과에 잘 보이도록 제목, 설명, 주소, 본문 구조를 점검합니다.</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {aiSeoResult && <span className="text-xs text-purple-400">AI 분석 반영</span>}
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-1.5 rounded-full transition-all ${displayedSeoBarColor}`} style={{ width: `${displayedSeoScore}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${displayedSeoColor}`}>{displayedSeoScore}점</span>
                </div>
                <span className={`text-[11px] ${displayedSeoColor}`}>{seoStatusLabel}</span>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
              <div className="text-[11px] text-gray-500 mb-2">검색 결과 미리보기</div>
              <p className="text-sm text-blue-400 line-clamp-1">{form.title || '검색 결과에 표시될 제목'}</p>
              <p className="text-[11px] text-emerald-500 mt-1 line-clamp-1">minime.local/news/{form.slug || 'url-slug'}</p>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{metaPreview || '메타 설명을 입력하면 검색 결과 설명처럼 보입니다.'}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
              <div>
                <label className="mb-1 block text-xs text-gray-500">URL 슬러그</label>
                <input
                  type="text"
                  placeholder="url-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-xs text-gray-500">메타 설명</label>
                  <span className={`text-[11px] ${form.metaDescription.length > 160 ? 'text-red-400' : 'text-gray-500'}`}>
                    {form.metaDescription.length}/160자
                  </span>
                </div>
                <textarea
                  ref={metaDescriptionRef}
                  placeholder="검색 결과에 표시될 설명 (50~160자)"
                  value={form.metaDescription}
                  onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {[
              { title: '필수 항목', items: seoReport.required },
              { title: '권장 항목', items: seoReport.recommended },
            ].map((group) => (
              <div key={group.title}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400">{group.title}</span>
                  <span className="text-[11px] text-gray-500">{group.items.filter((item) => item.ok).length}/{group.items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <div key={item.label} className="rounded-lg border border-gray-700 bg-gray-900/70 p-2.5">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${item.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {item.ok ? '✓' : '!'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-200">{item.label}</span>
                            <span className="shrink-0 text-[11px] text-gray-500">{item.value}</span>
                          </div>
                          {!item.ok && <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{item.suggestion}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              {!form.slug && form.title && (
                <button onClick={() => setForm((f) => ({ ...f, slug: generateSlug(f.title) }))}
                  className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600 transition">
                  제목으로 URL 만들기
                </button>
              )}
              {!form.metaDescription && (form.lead || form.content) && (
                <button onClick={() => applyMetaDescription((form.lead || form.content.replace(/<[^>]*>/g, '')).slice(0, 155))}
                  className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600 transition">
                  설명 자동 채우기
                </button>
              )}
            </div>

            {aiSeoResult?.keywords.length ? (
              <div>
                <div className="text-xs text-gray-500 mb-1">AI 핵심 키워드</div>
                <div className="flex gap-1 flex-wrap">
                  {aiSeoResult.keywords.map((kw, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {aiSeoResult?.readabilityNote && (
              <div className="bg-gray-900 rounded-lg p-2">
                <p className="text-xs text-gray-400">{aiSeoResult.readabilityNote}</p>
              </div>
            )}
          </div>

          <div className="hidden">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">SEO 설정</div>
              <div className="flex items-center gap-2">
                {aiSeoResult && <span className="text-xs text-purple-400">AI 분석 반영</span>}
                <div className="w-24 bg-gray-700 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${seoBarColor}`} style={{ width: `${seoScore}%` }} />
                </div>
                <span className={`text-xs font-bold ${seoColor}`}>{seoScore}점</span>
              </div>
            </div>

            {/* SEO 체크리스트 */}
            <div className="flex flex-col gap-1.5">
              {seoItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`text-xs mt-0.5 ${item.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.ok ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <span className={`text-xs ${item.ok ? 'text-gray-300' : 'text-gray-500'}`}>{item.label}</span>
                    {!item.ok && item.suggestion && (
                      <p className="text-xs text-gray-600 mt-0.5">{item.suggestion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* AI 키워드 */}
            {aiSeoResult?.keywords.length ? (
              <div>
                <div className="text-xs text-gray-500 mb-1">핵심 키워드</div>
                <div className="flex gap-1 flex-wrap">
                  {aiSeoResult.keywords.map((kw, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 가독성 메모 */}
            {aiSeoResult?.readabilityNote && (
              <div className="bg-gray-900 rounded-lg p-2">
                <p className="text-xs text-gray-400">{aiSeoResult.readabilityNote}</p>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1 block">URL 슬러그</label>
              <input type="text" placeholder="url-slug" value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">메타 설명 ({form.metaDescription.length}/160자)</label>
              <textarea placeholder="검색 결과에 표시될 설명 (50~160자)" value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={2}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* 본문 */}
          <div className="order-[7]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">본문 ({form.content.replace(/<[^>]*>/g, '').length}자)</label>
            </div>
            <TiptapEditor
              content={form.content}
              references={sourceReferences}
              onChange={(content) => setForm({ ...form, content })}
            />
          </div>

          <div className="order-[8] bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">출처/참고자료</div>
                <p className="mt-1 text-xs text-gray-500">AI 보조와 기사 검수에 사용할 근거 자료를 입력해주세요.</p>
              </div>
              <button onClick={addSourceReference} className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600 transition">
                + 출처 추가
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {sourceReferences.map((source, index) => (
                <div key={index} className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-400">출처 {index + 1}</span>
                    {sourceReferences.length > 1 && (
                      <button onClick={() => removeSourceReference(index)} className="text-xs text-gray-500 hover:text-red-400 transition">
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={source.title} onChange={(e) => updateSourceReference(index, { title: e.target.value })} placeholder="자료 제목"
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500" />
                    <input value={source.source} onChange={(e) => updateSourceReference(index, { source: e.target.value })} placeholder="출처명"
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500" />
                    <input value={source.url} onChange={(e) => updateSourceReference(index, { url: e.target.value })} placeholder="https://"
                      className="col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500" />
                    <select value={source.type} onChange={(e) => updateSourceReference(index, { type: e.target.value as SourceReference['type'] })}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="official">공식 발표</option>
                      <option value="press">보도자료</option>
                      <option value="news">언론 기사</option>
                      <option value="report">논문/리포트</option>
                      <option value="blog">블로그/커뮤니티</option>
                      <option value="internal">내부 자료</option>
                    </select>
                    <input value={source.memo} onChange={(e) => updateSourceReference(index, { memo: e.target.value })} placeholder="AI가 참고할 메모"
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-[11] bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">본문 품질 점수</div>
                <p className="mt-1 text-xs text-gray-500">기사 구조, 문장 길이, 반복 표현, 출처 입력 상태를 함께 점검합니다.</p>
              </div>
              <div className="flex min-w-28 flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-700">
                    <div className={`h-1.5 rounded-full transition-all ${qualityBarColor}`} style={{ width: `${qualityReport.score}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${qualityColor}`}>{qualityReport.score}점</span>
                </div>
                <span className={`text-[11px] ${qualityColor}`}>{qualityReport.score >= 80 ? '좋음' : qualityReport.score >= 55 ? '보완 필요' : '초안 단계'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {qualityReport.checks.map((check) => (
                <div key={check.label} className="rounded-lg border border-gray-700 bg-gray-900 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs ${check.ok ? 'text-emerald-400' : 'text-yellow-400'}`}>{check.ok ? '✓' : '!'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-200">{check.label}</div>
                      <div className="mt-0.5 truncate text-[11px] text-gray-500">{check.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 구독자 전용 콘텐츠 */}
          <div className="hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-medium">구독자 전용</span>
              <span className="text-xs text-gray-500">뉴스레터에만 포함되는 추가 콘텐츠</span>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">핵심 포인트</label>
              <div className="flex flex-col gap-2">
                {premiumContent.keyPoints.map((point, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-yellow-400 font-bold w-4">{i + 1}</span>
                    <input type="text" value={point}
                      onChange={(e) => {
                        const updated = [...premiumContent.keyPoints];
                        updated[i] = e.target.value;
                        setPremiumContent(p => ({ ...p, keyPoints: updated }));
                      }}
                      placeholder={`핵심 포인트 ${i + 1}`}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    {premiumContent.keyPoints.length > 1 && (
                      <button onClick={() => setPremiumContent(p => ({
                        ...p, keyPoints: p.keyPoints.filter((_, idx) => idx !== i)
                      }))} className="text-gray-600 hover:text-red-400 text-sm">×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setPremiumContent(p => ({ ...p, keyPoints: [...p.keyPoints, ''] }))}
                  className="text-xs text-gray-500 hover:text-white transition text-left">+ 포인트 추가</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">에디터 코멘트</label>
              <textarea value={premiumContent.editorComment}
                onChange={(e) => setPremiumContent(p => ({ ...p, editorComment: e.target.value }))}
                placeholder="구독자에게 전하는 에디터의 한마디..." rows={2}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">추천 링크</label>
              <div className="flex flex-col gap-2">
                {premiumContent.relatedLinks.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={link.title}
                      onChange={(e) => {
                        const updated = [...premiumContent.relatedLinks];
                        updated[i] = { ...updated[i], title: e.target.value };
                        setPremiumContent(p => ({ ...p, relatedLinks: updated }));
                      }}
                      placeholder="링크 제목"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    <input type="text" value={link.url}
                      onChange={(e) => {
                        const updated = [...premiumContent.relatedLinks];
                        updated[i] = { ...updated[i], url: e.target.value };
                        setPremiumContent(p => ({ ...p, relatedLinks: updated }));
                      }}
                      placeholder="https://"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    {premiumContent.relatedLinks.length > 1 && (
                      <button onClick={() => setPremiumContent(p => ({
                        ...p, relatedLinks: p.relatedLinks.filter((_, idx) => idx !== i)
                      }))} className="text-gray-600 hover:text-red-400 text-sm">×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setPremiumContent(p => ({ ...p, relatedLinks: [...p.relatedLinks, { title: '', url: '' }] }))}
                  className="text-xs text-gray-500 hover:text-white transition text-left">+ 링크 추가</button>
              </div>
            </div>
          </div>

          {/* 뉴스레터 발송 옵션 */}
          <div className={`order-[12] rounded-xl border p-4 flex flex-col gap-4 transition ${
            newsletterOption.enabled ? 'bg-blue-600/10 border-blue-600/30' : 'bg-gray-800 border-gray-700'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-white">뉴스레터로 발송</div>
                <div className="text-xs text-gray-500 mt-0.5">기사 발행과 독립적으로 발송 시간 설정 가능</div>
              </div>
              <button onClick={() => setNewsletterOption(o => ({ ...o, enabled: !o.enabled }))}
                className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-all duration-200 ${
                  newsletterOption.enabled ? 'bg-blue-600 justify-end' : 'bg-gray-700 justify-start'
                }`}>
                <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>
            {newsletterOption.enabled && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">발송 대상</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'daily',  label: '데일리', desc: '매일 수신 동의자',       color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
                      { key: 'weekly', label: '위클리', desc: '매주 수신 동의자',       color: 'border-purple-500 bg-purple-500/10 text-purple-400' },
                      { key: 'manual', label: '전체',   desc: 'ACTIVE+기간내CANCELED', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
                    ].map((item) => (
                      <button key={item.key} onClick={() => setNewsletterOption(o => ({ ...o, type: item.key as any }))}
                        className={`p-3 rounded-xl border-2 text-left transition ${
                          newsletterOption.type === item.key ? item.color : 'border-gray-700 bg-gray-900 text-gray-400'
                        }`}>
                        <div className="text-xs font-medium">{item.label}</div>
                        <div className="text-xs opacity-70 mt-0.5">{item.desc}</div>
                        <div className="text-sm font-bold mt-1">{estimatedRecipients[item.key]}명</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">발송 시각</label>
                  <div className="flex gap-2">
                    <button onClick={() => setNewsletterOption(o => ({ ...o, isScheduled: false }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${
                        !newsletterOption.isScheduled ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>즉시 발송</button>
                    <button onClick={() => setNewsletterOption(o => ({ ...o, isScheduled: true }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${
                        newsletterOption.isScheduled ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>예약 발송</button>
                  </div>
                  {newsletterOption.isScheduled && (
                    <input type="datetime-local" value={newsletterOption.scheduledAt}
                      onChange={(e) => setNewsletterOption(o => ({ ...o, scheduledAt: e.target.value }))}
                      className="w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  )}
                </div>
                <button onClick={() => setShowPreview(true)} disabled={!form.title.trim()}
                  className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  뉴스레터 미리보기
                </button>
                <div className="bg-gray-900 rounded-xl p-3 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">발송 대상</span>
                    <span className="text-white">{typeLabel[newsletterOption.type]}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">예상 수신자</span>
                    <span className="text-blue-400 font-medium">{estimatedRecipients[newsletterOption.type]}명</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">발송 시각</span>
                    <span className="text-white">
                      {newsletterOption.isScheduled ? newsletterOption.scheduledAt || '미설정' : '기사 발행 즉시'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ✅ AI 보조 패널 */}
        {showAiPanel && (
          <aside className="sticky top-28 w-80 flex-shrink-0 self-start">
            <div className="flex max-h-[calc(100vh-16rem)] flex-col overflow-hidden rounded-2xl border border-purple-600/30 bg-gray-900 p-4">

              {/* 헤더 */}
              <div className="flex flex-shrink-0 items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">AI 작성 보조</span>
                </div>
                <button onClick={handleAiAnalyze} disabled={!!aiLoading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1">
                  {aiLoading === 'analyze' ? (
                    <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>분석 중...</>
                  ) : '전체 분석'}
                </button>
              </div>

              <p className="mt-4 flex-shrink-0 text-xs text-gray-500">제목 또는 본문 입력 후 전체 분석을 실행하면 AI가 SEO, 제목, 태그, 리드문 등을 한번에 분석해드려요.</p>

              {/* AI 결과가 없을 때 */}
              <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain border-t border-gray-800 pr-1 pt-4 [scrollbar-gutter:stable]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">인터뷰 녹취</div>
                    <div className="text-xs text-gray-500 mt-0.5">mp3, m4a, wav, webm / 25MB 이하</div>
                  </div>
                  <button
                    onClick={() => interviewFileRef.current?.click()}
                    className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition"
                  >
                    파일 선택
                  </button>
                </div>
                <input
                  ref={interviewFileRef}
                  type="file"
                  accept="audio/*,video/mp4,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setInterviewFile(file);
                    setInterviewResult(null);
                  }}
                />
                {interviewFile && (
                  <div className="bg-gray-800 rounded-lg p-2.5">
                    <div className="text-xs text-gray-300 truncate">{interviewFile.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{(interviewFile.size / 1024 / 1024).toFixed(1)}MB</div>
                  </div>
                )}
                <button
                  onClick={handleInterviewAnalyze}
                  disabled={!interviewFile || !!aiLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  {aiLoading === 'interview' ? (
                    <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>녹취 분석 중...</>
                  ) : '녹취록 만들고 요약'}
                </button>

                {interviewResult && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-2">3줄 요약</div>
                      <div className="flex flex-col gap-1.5">
                        {interviewResult.summary.map((item, i) => (
                          <div key={i} className="flex gap-2 text-xs text-gray-300 leading-relaxed">
                            <span className="text-indigo-400 font-bold">{i + 1}.</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {interviewResult.titleSuggestions.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-2">제목 후보</div>
                        <div className="flex flex-col gap-2">
                          {interviewResult.titleSuggestions.map((title, i) => (
                            <div key={i} className="bg-gray-800 rounded-lg p-2.5 flex justify-between items-start gap-2">
                              <p className="text-xs text-gray-300 flex-1 leading-relaxed">{title}</p>
                              <button
                                onClick={() => setForm(f => ({ ...f, title, slug: generateSlug(title) }))}
                                className="text-xs text-blue-400 hover:text-blue-300 transition flex-shrink-0"
                              >
                                적용
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {interviewResult.keyQuotes.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-2">주요 발언</div>
                        <div className="flex flex-col gap-2">
                          {interviewResult.keyQuotes.slice(0, 3).map((quote, i) => (
                            <div key={i} className="bg-gray-800 rounded-lg p-2.5 text-xs text-gray-300 leading-relaxed">
                              {quote}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setForm(f => ({ ...f, lead: interviewResult.lead || interviewResult.summary.join(' ') }))}
                        className="py-2 bg-gray-800 hover:bg-gray-700 text-blue-300 rounded-lg text-xs transition"
                      >
                        리드문 적용
                      </button>
                      <button
                        onClick={() => setPremiumContent(p => ({ ...p, keyPoints: interviewResult.summary }))}
                        className="py-2 bg-gray-800 hover:bg-gray-700 text-yellow-300 rounded-lg text-xs transition"
                      >
                        핵심 적용
                      </button>
                      <button
                        onClick={() => {
                          const newTags = interviewResult.tags.filter(t => !form.tags.includes(t));
                          setForm(f => ({ ...f, tags: [...f.tags, ...newTags] }));
                        }}
                        className="py-2 bg-gray-800 hover:bg-gray-700 text-emerald-300 rounded-lg text-xs transition"
                      >
                        태그 추가
                      </button>
                      <button
                        onClick={applyInterviewToContent}
                        className="py-2 bg-gray-800 hover:bg-gray-700 text-purple-300 rounded-lg text-xs transition"
                      >
                        본문 삽입
                      </button>
                    </div>

                    <details className="bg-gray-950 rounded-lg border border-gray-800 p-2.5">
                      <summary className="cursor-pointer text-xs text-gray-400">전체 녹취록</summary>
                      <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-500">
                        {interviewResult.transcript}
                      </p>
                    </details>
                  </div>
                )}
              {!aiSeoResult && !aiLoading && (
                <div className="text-center py-6 text-gray-600 text-xs">
                  아직 분석 결과가 없어요.<br />전체 분석 버튼을 눌러주세요!
                </div>
              )}

              {aiLoading === 'analyze' && (
                <div className="text-center py-6">
                  <svg className="animate-spin w-6 h-6 mx-auto text-purple-400 mb-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <p className="text-xs text-gray-500">AI가 기사를 분석하고 있어요...</p>
                </div>
              )}

              {aiSeoResult && !aiLoading && (
                <>
                  {/* 제목 추천 */}
                  {aiGeneratedContents.titles.length > 0 && (
                    <div className="border-t border-gray-800 pt-4">
                      <div className="text-xs font-medium text-gray-400 mb-2">제목 추천</div>
                      <div className="flex flex-col gap-2">
                        {aiGeneratedContents.titles.map((title, i) => (
                          <div key={i} className="bg-gray-800 rounded-lg p-2.5 flex justify-between items-start gap-2">
                            <p className="text-xs text-gray-300 flex-1 leading-relaxed">{title}</p>
                            <button onClick={() => setForm(f => ({ ...f, title, slug: generateSlug(title) }))}
                              className="text-xs text-blue-400 hover:text-blue-300 transition flex-shrink-0">
                              적용
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 리드문 */}
                  {aiGeneratedContents.lead && (
                    <div className="border-t border-gray-800 pt-4">
                      <div className="text-xs font-medium text-gray-400 mb-2">리드문 추천</div>
                      <div className="bg-gray-800 rounded-lg p-2.5 flex justify-between items-start gap-2">
                        <p className="text-xs text-gray-300 flex-1 leading-relaxed">{aiGeneratedContents.lead}</p>
                        <button onClick={() => setForm(f => ({ ...f, lead: aiGeneratedContents.lead }))}
                          className="text-xs text-blue-400 hover:text-blue-300 transition flex-shrink-0">
                          적용
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 태그 추천 */}
                  {aiGeneratedContents.tags.length > 0 && (
                    <div className="border-t border-gray-800 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-400">태그 추천</div>
                        <button onClick={() => {
                          const newTags = aiGeneratedContents.tags.filter(t => !form.tags.includes(t));
                          setForm(f => ({ ...f, tags: [...f.tags, ...newTags] }));
                        }} className="text-xs text-blue-400 hover:text-blue-300 transition">전체 추가</button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {aiGeneratedContents.tags.map((tag, i) => (
                          <button key={i}
                            onClick={() => { if (!form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag] })); }}
                            className={`text-xs px-2 py-0.5 rounded-full transition ${
                              form.tags.includes(tag)
                                ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}>
                            #{tag} {form.tags.includes(tag) ? '✓' : '+'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 메타 설명 */}
                  {aiGeneratedContents.meta && (
                    <div className="border-t border-gray-800 pt-4">
                      <div className="text-xs font-medium text-gray-400 mb-2">메타 설명 추천</div>
                      <div className="bg-gray-800 rounded-lg p-2.5 flex justify-between items-start gap-2">
                        <p className="text-xs text-gray-300 flex-1 leading-relaxed">{aiGeneratedContents.meta}</p>
                        <button onClick={() => applyMetaDescription(aiGeneratedContents.meta)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition flex-shrink-0">
                          적용
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 핵심 포인트 */}
                  {aiGeneratedContents.keyPoints.length > 0 && (
                    <div className="border-t border-gray-800 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-400">핵심 포인트</div>
                        <button onClick={() => setPremiumContent(p => ({ ...p, keyPoints: aiGeneratedContents.keyPoints }))}
                          className="text-xs text-blue-400 hover:text-blue-300 transition">적용</button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {aiGeneratedContents.keyPoints.map((point, i) => (
                          <div key={i} className="flex gap-2 text-xs text-gray-400">
                            <span className="text-yellow-400 font-bold">{i + 1}.</span>
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 뉴스레터 요약 */}
                  {aiGeneratedContents.newsletterSummary && (
                    <div className="border-t border-gray-800 pt-4">
                      <div className="text-xs font-medium text-gray-400 mb-2">뉴스레터 요약</div>
                      <div className="bg-gray-800 rounded-lg p-2.5 flex justify-between items-start gap-2">
                        <p className="text-xs text-gray-300 flex-1 leading-relaxed">{aiGeneratedContents.newsletterSummary}</p>
                        <button onClick={() => setForm(f => ({ ...f, lead: aiGeneratedContents.newsletterSummary }))}
                          className="text-xs text-blue-400 hover:text-blue-300 transition flex-shrink-0">
                          리드문에 적용
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 문체 분석 */}
                  {aiGeneratedContents.styleNote && (
                    <div className="border-t border-gray-800 pt-4">
                      <div className="text-xs font-medium text-gray-400 mb-2">문체 분석</div>
                      <div className="bg-gray-800 rounded-lg p-2.5">
                        <p className="text-xs text-gray-400 leading-relaxed">{aiGeneratedContents.styleNote}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 뉴스레터 미리보기 모달 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4 overflow-y-auto py-10">
          <div className="w-full max-w-2xl">
            <div className="flex justify-center gap-2 mb-4">
              <button onClick={() => setPreviewMode('pc')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${previewMode === 'pc' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                💻 PC
              </button>
              <button onClick={() => setPreviewMode('mobile')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${previewMode === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                📱 모바일
              </button>
            </div>
            <div className={`bg-white rounded-2xl mx-auto transition-all ${previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <span className="font-bold text-gray-800 text-sm">뉴스레터 미리보기</span>
                <button onClick={() => setShowPreview(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="px-6 py-6">
                <div className="text-center mb-6">
                  <div className="text-xs text-gray-400 mb-1">TechLetter</div>
                  <div className="text-xs text-gray-400">
                    {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                {form.thumbnailUrl && (
                  <img src={form.thumbnailUrl} alt="썸네일" className="w-full h-48 object-cover rounded-xl mb-4" />
                )}
                <h1 className={`font-bold text-gray-900 mb-3 leading-tight ${previewMode === 'mobile' ? 'text-lg' : 'text-xl'}`}>
                  {form.title || '뉴스 제목'}
                </h1>
                {form.lead && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4 pb-4 border-b border-gray-100">{form.lead}</p>
                )}
                <div className="text-sm text-gray-700 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{
                    __html: form.content
                      ? form.content.replace(/<[^>]*>/g, ' ').slice(0, 200) + (form.content.length > 200 ? '...' : '')
                      : '본문 내용이 여기에 표시됩니다.'
                  }}
                />
                {premiumContent.keyPoints.some(p => p.trim()) && (
                  <div className="bg-yellow-50 rounded-xl p-4 mb-4">
                    <div className="text-xs font-bold text-yellow-700 mb-2">핵심 포인트 (구독자 전용)</div>
                    {premiumContent.keyPoints.filter(p => p.trim()).map((point, i) => (
                      <div key={i} className="flex gap-2 text-sm text-gray-700 mb-1">
                        <span className="text-yellow-500 font-bold">{i + 1}.</span>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                )}
                {premiumContent.editorComment && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-4 border-l-4 border-blue-400">
                    <div className="text-xs font-bold text-gray-500 mb-1">에디터 코멘트</div>
                    <p className="text-sm text-gray-700 italic">{premiumContent.editorComment}</p>
                  </div>
                )}
                <div className="text-center mb-6">
                  <div className="inline-block px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl">
                    전체 기사 읽기 →
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">발송 대상</span>
                    <span className="text-gray-700 font-medium">{typeLabel[newsletterOption.type]}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">예상 수신자</span>
                    <span className="text-blue-600 font-bold">{estimatedRecipients[newsletterOption.type]}명</span>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <span className="text-xs text-gray-400">수신을 원하지 않으시면 </span>
                  <span className="text-xs text-blue-500 underline cursor-pointer">여기</span>
                  <span className="text-xs text-gray-400">를 클릭하세요.</span>
                </div>
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button onClick={() => setShowPreview(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition">
                  닫기
                </button>
                <button onClick={() => { setShowPreview(false); handleSubmit('published'); }} disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                  {loading ? '발행 중...' : newsletterOption.isScheduled ? '기사 저장 + 예약 발송' : '기사 발행 + 즉시 발송'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
