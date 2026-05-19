'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import TiptapEditor from '@/components/editor/TiptapEditor';

interface Category {
  id: number;
  name: string;
}

export default function AdminNewsEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

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
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsRes, catRes] = await Promise.all([
          api.get(`/news/${id}`),
          api.get('/categories'),
        ]);
        const news = newsRes.data;
        setForm({
          title: news.title || '',
          content: news.content || '',
          categoryId: news.categoryId ? String(news.categoryId) : '',
          status: news.status || 'draft',
          thumbnailUrl: news.thumbnailUrl || '',
          lead: news.lead || '',
          metaDescription: news.metaDescription || '',
          slug: news.slug || '',
          tags: news.tags?.map((t: any) => t.name) || [],
          scheduledAt: news.scheduledAt ? news.scheduledAt.slice(0, 16) : '',
        });
        setCategories(catRes.data);
      } catch {
        alert('뉴스를 불러올 수 없습니다.');
        router.push('/admin/news');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id]);

  const handleThumbnailUpload = async (file: File) => {
    setThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(f => ({ ...f, thumbnailUrl: res.data.url }));
    } catch {
      alert('이미지 업로드 실패');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleSubmit = async (status: string) => {
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!form.content.trim()) { setError('내용을 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      await api.put(`/news/${id}`, { ...form, status, categoryId: form.categoryId ? +form.categoryId : null });
      router.push('/admin/news');
    } catch (err: any) {
      setError(err.response?.data?.message || '수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (tag && !form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  if (fetching) return (
    <div className="min-h-screen flex items-center justify-center transition-colors duration-200">
      <div className="text-gray-500 dark:text-gray-400">불러오는 중...</div>
    </div>
  );

  return (
    <div className="min-h-screen pb-28 transition-colors duration-200">
      <header className="sticky top-0 z-50 bg-white dark:bg-[#171717] border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="font-bold text-base flex-1">뉴스 수정</span>
          <div className="flex gap-2">
            <button onClick={() => handleSubmit('draft')} disabled={loading}
              className="text-sm px-3 py-1.5 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition disabled:opacity-50">
              임시저장
            </button>
            <button onClick={() => handleSubmit('published')} disabled={loading}
              className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50">
              {loading ? '저장 중...' : '저장 후 게시'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
        {error && <div className="p-3 bg-red-900 text-red-300 rounded-lg text-sm">{error}</div>}

        {/* 제목 */}
        <input type="text" placeholder="뉴스 제목 입력" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-base text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* 리드문 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">리드문 (기사 요약)</label>
          <textarea placeholder="기사 핵심 내용을 한두 문장으로 요약해주세요" value={form.lead}
            onChange={(e) => setForm({ ...form, lead: e.target.value })} rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* 카테고리 + 상태 */}
        <div className="grid grid-cols-2 gap-3">
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
              <option value="review">검토중</option>
              <option value="approved">승인됨</option>
              <option value="published">게시됨</option>
              <option value="scheduled">예약발행</option>
            </select>
          </div>
        </div>

        {/* 예약 발행 시간 */}
        {form.status === 'scheduled' && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">예약 발행 시간</label>
            <input type="datetime-local" value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 썸네일 */}
        <div>
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
        <div>
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
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">SEO 설정</div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">URL 슬러그</label>
            <input type="text" placeholder="url-slug" value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">메타 설명 (검색 미리보기)</label>
            <textarea placeholder="검색 결과에 표시될 설명" value={form.metaDescription}
              onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* 본문 */}
        <div>
          <label className="text-xs text-gray-500 mb-2 block">본문</label>
          <TiptapEditor content={form.content} onChange={(content) => setForm({ ...form, content })} />
        </div>
      </main>
    </div>
  );
}
