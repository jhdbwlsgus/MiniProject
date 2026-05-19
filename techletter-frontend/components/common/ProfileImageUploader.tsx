'use client';

import { ChangeEvent, useRef, useState } from 'react';
import api, { getImageUrl } from '@/lib/api';
import ProfileAvatar from './ProfileAvatar';

interface ProfileImageUploaderProps {
  nickname?: string | null;
  value?: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export default function ProfileImageUploader({
  nickname,
  value,
  onChange,
  disabled = false,
}: ProfileImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      const res = await api.post<{ url: string }>('/upload/image', formData);
      onChange(res.data.url);
    } catch {
      alert('프로필 이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-[#121212]">
      <ProfileAvatar nickname={nickname} imageUrl={getImageUrl(value)} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">프로필 이미지</p>
        <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP 이미지를 업로드할 수 있습니다.</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={upload} className="hidden" />
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? '업로드 중' : '업로드'}
        </button>
        <button
          type="button"
          onClick={() => onChange('')}
          disabled={disabled || uploading || !value}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 transition hover:bg-white disabled:opacity-40 dark:border-[#3A3A3A] dark:hover:bg-[#1E1E1E]"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
