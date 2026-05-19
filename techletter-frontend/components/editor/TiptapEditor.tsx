'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Youtube from '@tiptap/extension-youtube';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import CharacterCount from '@tiptap/extension-character-count';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
        fontFamily: {
          default: null,
          parseHTML: (el) => el.style.fontFamily || null,
          renderHTML: (attrs) => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
        },
      },
    }];
  },
});

interface Props {
  content: string;
  onChange: (content: string) => void;
  onAutoSave?: (content: string) => void;
  references?: Array<{
    title?: string;
    url?: string;
    source?: string;
    memo?: string;
    type?: string;
  }>;
}

const FONT_FAMILIES = [
  { label: '기본 서체', value: '' },
  { label: '나눔고딕', value: 'Nanum Gothic' },
  { label: '나눔명조', value: 'Nanum Myeongjo' },
  { label: '맑은고딕', value: 'Malgun Gothic' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
];

const HEADING_OPTIONS = [
  { label: '본문', value: 'paragraph' },
  { label: '대제목', value: 'h1' },
  { label: '중제목', value: 'h2' },
  { label: '소제목', value: 'h3' },
];

const Divider = () => <div className="w-px bg-gray-600 mx-0.5 self-stretch" />;

interface SpellIssue {
  id: string;
  original: string;
  replacement: string;
  message: string;
  context: string;
}

export default function TiptapEditor({ content, onChange, onAutoSave, references = [] }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [fontSize, setFontSize] = useState('16');
  const [fontSizeInput, setFontSizeInput] = useState('16');
  const [spellIssues, setSpellIssues] = useState<SpellIssue[]>([]);
  const [showSpellPanel, setShowSpellPanel] = useState(false);
  const [spellLoading, setSpellLoading] = useState(false);
  const [spellError, setSpellError] = useState('');
  const [rewriteLoading, setRewriteLoading] = useState<string | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      Color,
      Superscript,
      Subscript,
      CharacterCount,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: '내용을 입력하세요...',
        emptyEditorClass: 'is-editor-empty',
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Youtube.configure({ width: 640, height: 360 }),
    ],
    content,
    editorProps: {
      attributes: {
        spellcheck: 'true',
        lang: 'ko',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      setAutoSaved(false);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        localStorage.setItem('editor_autosave', html);
        if (onAutoSave) onAutoSave(html);
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2000);
      }, 3000);
    },
  });

  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, []);

  useEffect(() => {
    if (!editor || editor.getHTML() === content) return;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  if (!editor) return null;

  const applyFontSize = (size: string) => {
    const num = parseInt(size);
    if (isNaN(num) || num < 6 || num > 200) return;
    const s = String(num);
    setFontSize(s);
    setFontSizeInput(s);
    editor.chain().setMark('textStyle', { fontSize: `${s}px` }).run();
  };

  const increaseFontSize = () => applyFontSize(String(Math.min(200, parseInt(fontSize) + 1)));
  const decreaseFontSize = () => applyFontSize(String(Math.max(6, parseInt(fontSize) - 1)));

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    return 'paragraph';
  };

  const applyHeading = (value: string) => {
    if (value === 'paragraph') editor.chain().focus().setParagraph().run();
    else if (value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
    else if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
  };

  const Btn = ({ onClick, active, title, children, danger, disabled }: {
    onClick: () => void; active?: boolean; title?: string;
    children: React.ReactNode; danger?: boolean; disabled?: boolean;
  }) => (
    <button
      type="button" title={title} disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      className={`w-7 h-7 flex items-center justify-center rounded transition text-xs font-medium ${
        disabled ? 'opacity-30 cursor-not-allowed' :
        danger ? 'text-red-400 hover:bg-red-900 hover:text-red-300' :
        active ? 'bg-blue-600 text-white' :
        'text-gray-300 hover:bg-gray-600 hover:text-white'
      }`}
    >{children}</button>
  );

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      const formData = new FormData(); formData.append('file', file);
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => { setUploadProgress(null); const data = JSON.parse(xhr.responseText); editor.chain().focus().setImage({ src: data.url }).run(); };
      xhr.onerror = () => { setUploadProgress(null); alert('이미지 업로드 실패'); };
      xhr.open('POST', 'http://localhost:3000/upload/image');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('accessToken')}`);
      xhr.send(formData); setUploadProgress(0);
    };
    input.click();
  };

  const addVideo = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'video/*';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      const formData = new FormData(); formData.append('file', file);
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => { setUploadProgress(null); const data = JSON.parse(xhr.responseText); editor.chain().focus().setContent(editor.getHTML() + `<video controls src="${data.url}" style="max-width:100%;margin:1rem 0;border-radius:8px;"></video>`).run(); };
      xhr.onerror = () => { setUploadProgress(null); alert('동영상 업로드 실패'); };
      xhr.open('POST', 'http://localhost:3000/upload/video');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('accessToken')}`);
      xhr.send(formData); setUploadProgress(0);
    };
    input.click();
  };

  const addYoutube = () => {
    const url = prompt('유튜브 URL을 입력하세요');
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  const setLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = prompt('링크 URL을 입력하세요', prev);
    if (url === null) return;
    if (url === '') editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
  };

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const isInTable = editor.isActive('table');

  const runSpellCheck = async () => {
    const text = editor.getText();
    setShowSpellPanel(true);
    setSpellError('');

    if (!text.trim()) {
      setSpellIssues([]);
      return;
    }

    try {
      setSpellLoading(true);
      const { data } = await api.post('/news/ai/spellcheck', { text });
      const issues = Array.isArray(data.issues) ? data.issues : [];
      setSpellIssues(
        issues.map((issue: Omit<SpellIssue, 'id'>, index: number) => ({
          id: `${index}-${issue.original}-${issue.replacement}`,
          original: issue.original,
          replacement: issue.replacement,
          message: issue.message,
          context: issue.context,
        })),
      );
    } catch (err: any) {
      setSpellIssues([]);
      setSpellError(err.response?.data?.message || err.message || '맞춤법 검사 중 오류가 발생했습니다.');
    } finally {
      setSpellLoading(false);
    }
  };

  const applySpellIssue = (issue: SpellIssue) => {
    const html = editor.getHTML();
    const nextHtml = html.replace(issue.original, issue.replacement);
    editor.commands.setContent(nextHtml);
    setSpellIssues((issues) => issues.filter((item) => item.id !== issue.id));
  };

  const rewriteSelection = async (mode: 'concise' | 'easy' | 'professional') => {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      alert('다듬을 문장이나 문단을 먼저 선택해주세요.');
      return;
    }

    const selectedText = editor.state.doc.textBetween(from, to, '\n').trim();
    if (!selectedText) {
      alert('선택한 영역에 텍스트가 없습니다.');
      return;
    }

    try {
      setRewriteLoading(mode);
      const { data } = await api.post('/news/ai/rewrite-selection', {
        text: selectedText,
        mode,
        references,
      });
      if (data.rewritten) {
        editor.chain().focus().insertContent(data.rewritten).run();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || '선택 문장 다듬기 중 오류가 발생했습니다.');
    } finally {
      setRewriteLoading(null);
    }
  };

  const translateSelection = async (targetLanguage: 'ko' | 'en' | 'ja' | 'zh') => {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      alert('번역할 문장이나 문단을 먼저 선택해주세요.');
      return;
    }

    const selectedText = editor.state.doc.textBetween(from, to, '\n').trim();
    if (!selectedText) {
      alert('선택한 영역에 텍스트가 없습니다.');
      return;
    }

    try {
      setTranslateLoading(true);
      const { data } = await api.post('/news/ai/translate-selection', {
        text: selectedText,
        targetLanguage,
      });
      if (data.translated) {
        editor.chain().focus().insertContent(data.translated).run();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || '선택 문장 번역 중 오류가 발생했습니다.');
    } finally {
      setTranslateLoading(false);
    }
  };

  return (
    <div className={`border border-gray-700 rounded-xl overflow-hidden flex flex-col bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>

      {uploadProgress !== null && (
        <div className="bg-blue-950 border-b border-blue-900 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-blue-300 mb-1">
            <span>업로드 중...</span><span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-blue-900 rounded-full h-1">
            <div className="bg-blue-400 h-1 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <div className="bg-gray-800 px-2 py-1 flex flex-wrap items-center gap-0.5 border-b border-gray-700">

        {/* 제목 스타일 드롭다운 */}
        <select
          value={getCurrentHeading()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => applyHeading(e.target.value)}
          className="h-7 bg-gray-700 text-gray-200 text-xs rounded px-1.5 border border-gray-600 outline-none focus:border-blue-500"
        >
          {HEADING_OPTIONS.map((h) => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </select>

        {/* 폰트 패밀리 */}
        <select
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { editor.chain().setMark('textStyle', { fontFamily: e.target.value || null }).run(); }}
          className="h-7 bg-gray-700 text-gray-200 text-xs rounded px-1.5 border border-gray-600 outline-none focus:border-blue-500"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* 폰트 크기 */}
        <div className="flex items-center gap-0.5">
          <input
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={fontSizeInput}
            onChange={(e) => setFontSizeInput(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={(e) => applyFontSize(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFontSize(fontSizeInput)}
            className="w-10 h-7 bg-gray-700 text-gray-200 text-xs rounded px-1 border border-gray-600 outline-none focus:border-blue-500 text-center"
          />
          <button type="button" onMouseDown={(e) => { e.preventDefault(); decreaseFontSize(); }}
            className="w-5 h-7 flex items-center justify-center text-gray-300 hover:bg-gray-600 hover:text-white rounded transition text-sm font-bold">-</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); increaseFontSize(); }}
            className="w-5 h-7 flex items-center justify-center text-gray-300 hover:bg-gray-600 hover:text-white rounded transition text-sm font-bold">+</button>
        </div>

        <Divider />

        {/* 텍스트 서식 */}
        <Btn onClick={() => editor.chain().toggleBold().run()} active={editor.isActive('bold')} title="굵게">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 11.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().toggleItalic().run()} active={editor.isActive('italic')} title="기울임">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().toggleSuperscript().run()} active={editor.isActive('superscript')} title="위첨자">
          <span style={{ fontSize: '10px' }}>x²</span>
        </Btn>
        <Btn onClick={() => editor.chain().toggleSubscript().run()} active={editor.isActive('subscript')} title="아래첨자">
          <span style={{ fontSize: '10px' }}>x₂</span>
        </Btn>

        <Divider />

        {/* 글자 색상 */}
        <div className="relative" title="글자 색상">
          <label className="w-7 h-7 flex flex-col items-center justify-center rounded cursor-pointer hover:bg-gray-600 transition gap-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11 3L5.5 17h2.25l1.12-3h6.25l1.12 3H18.5L13 3h-2zm-1.38 9L12 5.67 14.38 12H9.62z"/></svg>
            <div className="w-5 h-1 rounded-full bg-red-500" />
            <input type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => editor.chain().setColor(e.target.value).run()} />
          </label>
        </div>

        {/* 배경색 */}
        <div className="relative" title="배경색">
          <label className="w-7 h-7 flex flex-col items-center justify-center rounded cursor-pointer hover:bg-gray-600 transition gap-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15a1.49 1.49 0 0 0 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21z"/></svg>
            <div className="w-5 h-1 rounded-full bg-yellow-300" />
            <input type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => editor.chain().toggleHighlight({ color: e.target.value }).run()} />
          </label>
        </div>

        <Btn onClick={() => editor.chain().toggleHighlight({ color: '#fde68a' }).run()} active={editor.isActive('highlight')} title="형광펜">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#fde68a"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        </Btn>

        <Divider />

        {/* 목록 */}
        <Btn onClick={() => editor.chain().toggleBulletList().run()} active={editor.isActive('bulletList')} title="목록">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용구">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="코드">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().setHorizontalRule().run()} title="구분선">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
        </Btn>

        <Divider />

        {/* 정렬 */}
        <Btn onClick={() => editor.chain().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="양쪽 정렬">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-6v2h18V3H3z"/></svg>
        </Btn>

        <Divider />

        {/* 들여쓰기 */}
        <Btn onClick={() => editor.chain().sinkListItem('listItem').run()} title="들여쓰기" disabled={!editor.can().sinkListItem('listItem')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm0-4h10v-2H3v2zm0-4h18v-2H3v2zm0-4h10V7H3v2zm0-6v2h18V3H3zm14 9l4 4-4 4V12z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().liftListItem('listItem').run()} title="내어쓰기" disabled={!editor.can().liftListItem('listItem')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm0-4h10v-2H3v2zm0-4h18v-2H3v2zm0-4h10V7H3v2zm0-6v2h18V3H3zm10 9l-4 4 4 4V12z"/></svg>
        </Btn>

        <Divider />

        {/* 삽입 */}
        <Btn onClick={setLink} active={editor.isActive('link')} title="링크 삽입">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
        </Btn>
        <Btn onClick={addImage} title="이미지 업로드">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
        </Btn>
        <Btn onClick={addVideo} title="동영상 업로드">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
        </Btn>
        <Btn onClick={addYoutube} title="유튜브 임베드">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표 삽입">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 2v3H5V5h15zm-9 5h-6v3h6v-3zm0 5h-6v3h6v-3zm8 3h-6v-3h6v3zm0-5h-6v-3h6v3z"/></svg>
        </Btn>

        {/* 표 편집 */}
        {isInTable && (
          <>
            <Divider />
            <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="행 추가"><span style={{ fontSize: '10px' }}>행+</span></Btn>
            <Btn onClick={() => editor.chain().focus().deleteRow().run()} title="행 삭제" danger><span style={{ fontSize: '10px' }}>행-</span></Btn>
            <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="열 추가"><span style={{ fontSize: '10px' }}>열+</span></Btn>
            <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title="열 삭제" danger><span style={{ fontSize: '10px' }}>열-</span></Btn>
            <Btn onClick={() => editor.chain().focus().mergeCells().run()} title="셀 병합"><span style={{ fontSize: '10px' }}>병합</span></Btn>
            <Btn onClick={() => editor.chain().focus().splitCell().run()} title="셀 분리"><span style={{ fontSize: '10px' }}>분리</span></Btn>
            <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제" danger><span style={{ fontSize: '10px' }}>표삭제</span></Btn>
          </>
        )}

        <Divider />

        <Btn onClick={() => editor.chain().focus().undo().run()} title="실행취소">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="다시실행">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
        </Btn>

        <Divider />

        <Btn onClick={() => { setPreviewContent(editor.getHTML()); setIsPreview(true); }} active={isPreview} title="미리보기">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
        </Btn>
        <button
          type="button"
          title="맞춤법 검사"
          onMouseDown={(e) => { e.preventDefault(); runSpellCheck(); }}
          className={`h-7 rounded px-2 text-xs font-medium transition ${
            showSpellPanel
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-600 hover:text-white'
          }`}
        >
          맞춤법
        </button>
        <button
          type="button"
          title="선택 문장을 간결하게 다듬기"
          disabled={!!rewriteLoading}
          onMouseDown={(e) => { e.preventDefault(); rewriteSelection('concise'); }}
          className="h-7 rounded px-2 text-xs font-medium text-gray-300 transition hover:bg-gray-600 hover:text-white disabled:opacity-40"
        >
          {rewriteLoading === 'concise' ? '다듬는 중' : '간결하게'}
        </button>
        <button
          type="button"
          title="선택 문장을 쉽게 다듬기"
          disabled={!!rewriteLoading}
          onMouseDown={(e) => { e.preventDefault(); rewriteSelection('easy'); }}
          className="h-7 rounded px-2 text-xs font-medium text-gray-300 transition hover:bg-gray-600 hover:text-white disabled:opacity-40"
        >
          쉽게
        </button>
        <button
          type="button"
          title="선택 문장을 전문적인 기사 문체로 다듬기"
          disabled={!!rewriteLoading}
          onMouseDown={(e) => { e.preventDefault(); rewriteSelection('professional'); }}
          className="h-7 rounded px-2 text-xs font-medium text-gray-300 transition hover:bg-gray-600 hover:text-white disabled:opacity-40"
        >
          전문적으로
        </button>
        <select
          title="선택 문장 번역"
          disabled={translateLoading}
          defaultValue=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const value = e.target.value as 'ko' | 'en' | 'ja' | 'zh' | '';
            if (!value) return;
            translateSelection(value);
            e.target.value = '';
          }}
          className="h-7 rounded border border-gray-600 bg-gray-700 px-2 text-xs font-medium text-gray-200 outline-none transition hover:bg-gray-600 focus:border-blue-500 disabled:opacity-40"
        >
          <option value="">{translateLoading ? '번역 중' : '번역'}</option>
          <option value="ko">한국어로</option>
          <option value="en">영어로</option>
          <option value="ja">일본어로</option>
          <option value="zh">중국어로</option>
        </select>
        <Btn onClick={() => setIsFullscreen(!isFullscreen)} active={isFullscreen} title="전체화면">
          {isFullscreen
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
          }
        </Btn>
      </div>

      {showSpellPanel && (
        <div className="border-b border-gray-700 bg-gray-900 px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-100">맞춤법 검사</div>
              <p className="mt-0.5 text-xs text-gray-500">
                {spellLoading
                  ? 'AI가 맞춤법과 띄어쓰기를 검사하고 있습니다.'
                  : spellIssues.length
                  ? `${spellIssues.length}개의 확인할 표현이 있습니다.`
                  : spellError || '확인할 표현을 찾지 못했습니다.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runSpellCheck}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-gray-800 hover:text-white"
              >
                다시 검사
              </button>
              <button
                type="button"
                onClick={() => setShowSpellPanel(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-500 transition hover:bg-gray-800 hover:text-gray-200"
              >
                닫기
              </button>
            </div>
          </div>

          {spellLoading && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm text-gray-400">
              검사 중...
            </div>
          )}

          {!spellLoading && spellIssues.length > 0 && (
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
              {spellIssues.map((issue) => (
                <div key={issue.id} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-300 line-through">
                          {issue.original}
                        </span>
                        <span className="text-gray-500">→</span>
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">
                          {issue.replacement}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{issue.message}</p>
                      <p className="mt-1 text-xs text-gray-500">{issue.context}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applySpellIssue(issue)}
                      className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                    >
                      적용
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isPreview ? (
        <EditorContent
          editor={editor}
          className={`bg-gray-900 px-6 py-5 text-gray-100 prose prose-invert max-w-none
            [&_.ProseMirror]:outline-none
            [&_.ProseMirror]:min-h-[400px]
            [&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
            [&_.ProseMirror_.is-editor-empty:first-child::before]:text-gray-500
            [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left
            [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none
            [&_.ProseMirror_h1]:text-3xl
            [&_.ProseMirror_h1]:font-bold
            [&_.ProseMirror_h1]:mt-6
            [&_.ProseMirror_h1]:mb-3
            [&_.ProseMirror_h2]:text-2xl
            [&_.ProseMirror_h2]:font-bold
            [&_.ProseMirror_h2]:mt-5
            [&_.ProseMirror_h2]:mb-2
            [&_.ProseMirror_h3]:text-xl
            [&_.ProseMirror_h3]:font-bold
            [&_.ProseMirror_h3]:mt-4
            [&_.ProseMirror_h3]:mb-2
            [&_.ProseMirror_blockquote]:border-l-4
            [&_.ProseMirror_blockquote]:border-blue-500
            [&_.ProseMirror_blockquote]:pl-4
            [&_.ProseMirror_blockquote]:italic
            [&_.ProseMirror_blockquote]:text-gray-400
            [&_.ProseMirror_table]:border-collapse
            [&_.ProseMirror_table]:w-full
            [&_.ProseMirror_td]:border
            [&_.ProseMirror_td]:border-gray-600
            [&_.ProseMirror_td]:p-2
            [&_.ProseMirror_td]:min-w-[80px]
            [&_.ProseMirror_th]:border
            [&_.ProseMirror_th]:border-gray-600
            [&_.ProseMirror_th]:p-2
            [&_.ProseMirror_th]:bg-gray-700
            [&_.ProseMirror_th]:font-bold
            [&_.ProseMirror_hr]:border-gray-600
            [&_.ProseMirror_hr]:my-4
            [&_.ProseMirror_img]:rounded-lg
            [&_.ProseMirror_img]:max-w-full
            [&_.ProseMirror_code]:bg-gray-800
            [&_.ProseMirror_code]:px-1
            [&_.ProseMirror_code]:rounded
            [&_.ProseMirror_pre]:bg-gray-800
            [&_.ProseMirror_pre]:rounded-lg
            [&_.ProseMirror_pre]:p-4
            ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}
          `}
        />
      ) : (
        <div className={`card-dark px-8 py-6 overflow-y-auto ${isFullscreen ? 'flex-1' : 'min-h-[400px]'}`}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200">
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">📖 독자 미리보기</span>
              <button onClick={() => setIsPreview(false)} className="text-sm text-blue-600 hover:underline font-medium">
                ← 편집으로 돌아가기
              </button>
            </div>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewContent }} />
          </div>
        </div>
      )}

      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1.5 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>글자 {charCount.toLocaleString()}</span>
          <span>단어 {wordCount.toLocaleString()}</span>
          {autoSaved && <span className="text-green-400">✓ 자동저장됨</span>}
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard.readText().then((text) => editor.chain().focus().insertContent(text).run())}
          className="hover:text-gray-300 transition"
        >
          서식 없이 붙여넣기
        </button>
      </div>
    </div>
  );
}
