'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'bot' | 'user';
  text: string;
  time: string;
}

function getNow() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

const SUGGESTIONS = ['오늘 핫한 뉴스 알려줘', 'AI 트렌드 요약해줘', '내 관심 뉴스 추천해줘'];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: '안녕하세요! MINIME AI 비서입니다.\n궁금한 IT 뉴스나 트렌드를 물어보세요 🚀',
      time: getNow(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 320);
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMessage, time: getNow() }]);
    setInput('');
    setIsLoading(true);
    
    try {
      // 1. 브라우저 저장소에서 로그인할 때 받아둔 토큰(신분증)을 꺼냅니다.
      // (진현 님 프로젝트에서 토큰 저장 이름이 다를 수 있으니 확인해 보세요! 보통 accessToken이나 token을 씁니다)
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

      // 2. 백엔드(문지기)에게 보낼 때 headers에 토큰을 같이 보냅니다.
      const res = await fetch('http://localhost:3000/chatbot/ask', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // 토큰이 있으면 'Authorization' 헤더에 쏙 넣어줍니다!
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ message: userMessage }),
      });

      // 만약 토큰이 없거나 만료되어서 401 에러가 났다면?
      if (res.status === 401) {
        throw new Error('로그인이 필요하거나 권한이 없습니다.');
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: data.answer ?? data.reply ?? '응답을 받지 못했어요.', time: getNow() },
      ]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      setMessages((prev) => [
        ...prev,
        { 
          role: 'bot', 
          text: errorMessage === '로그인이 필요하거나 권한이 없습니다.' 
            ? '로그인 후 이용해 주세요! 🔐' 
            : '서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요 😢', 
          time: getNow() 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const showSuggestions = messages.length === 1 && !isLoading;
  const hasUnread = !isOpen && messages.length > 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=JetBrains+Mono:wght@400;500&display=swap');

        .tl-chat * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── 창 ── */
        .tl-window {
          position: absolute;
          bottom: 76px; right: 0; /* 버튼이 커져서 창 위치도 살짝 위로 올림 */
          width: 356px; height: 540px;
          background: #F5F4EF;
          border-radius: 24px;
          box-shadow: 0 0 0 1px rgba(26,25,22,.09), 0 28px 56px -8px rgba(26,25,22,.24), 0 8px 20px -4px rgba(26,25,22,.1);
          display: flex; flex-direction: column; overflow: hidden;
          transform-origin: bottom right;
          animation: tlOpen .28s cubic-bezier(.34,1.56,.64,1) both;
          font-family: 'DM Sans', sans-serif;
        }
        @keyframes tlOpen {
          from { opacity:0; transform:scale(.86) translateY(14px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }

        /* ── 헤더 ── */
        .tl-header {
          background: #1A1916;
          padding: 16px 18px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .tl-header-left { display: flex; align-items: center; gap: 10px; }
        .tl-avatar {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #2B5BFF 0%, #1a40cc 100%);
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; flex-shrink: 0;
        }
        .tl-title {
          font-family: 'DM Serif Display', serif;
          font-size: 15px; color: #F5F4EF;
          letter-spacing: -.3px; line-height: 1.2;
        }
        .tl-subtitle {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px; color: rgba(245,244,239,.4);
          font-family: 'JetBrains Mono', monospace;
          margin-top: 2px;
        }
        .tl-dot {
          width: 5px; height: 5px;
          background: #4ade80; border-radius: 50%;
          animation: tlPulse 2s ease-in-out infinite;
        }
        @keyframes tlPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        .tl-close {
          width: 30px; height: 30px;
          background: rgba(245,244,239,.07); border: none; border-radius: 8px;
          color: rgba(245,244,239,.45); font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all .15s; line-height: 1;
        }
        .tl-close:hover { background: rgba(245,244,239,.13); color: #F5F4EF; }

        /* ── 메시지 목록 ── */
        .tl-msgs {
          flex: 1; overflow-y: auto;
          padding: 14px 14px 8px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .tl-msgs::-webkit-scrollbar { width: 3px; }
        .tl-msgs::-webkit-scrollbar-thumb { background: rgba(26,25,22,.1); border-radius: 2px; }

        /* ── 버블 ── */
        .tl-msg { display: flex; flex-direction: column; animation: tlMsgIn .2s ease both; }
        @keyframes tlMsgIn { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
        .tl-msg.user { align-items: flex-end; }
        .tl-msg.bot  { align-items: flex-start; }
        .tl-bubble {
          max-width: 83%;
          padding: 10px 14px;
          font-size: 13.5px; line-height: 1.65;
          white-space: pre-wrap; word-break: break-word;
        }
        .tl-bubble.user {
          background: #1A1916; color: #F5F4EF;
          border-radius: 18px 18px 3px 18px;
        }
        .tl-bubble.bot {
          background: #fff; color: #1A1916;
          border: 1px solid rgba(26,25,22,.07);
          border-radius: 18px 18px 18px 3px;
          box-shadow: 0 1px 3px rgba(26,25,22,.05);
        }
        .tl-time {
          font-size: 10px; color: rgba(26,25,22,.28);
          font-family: 'JetBrains Mono', monospace;
          margin-top: 3px; padding: 0 3px;
        }

        /* ── 타이핑 ── */
        .tl-typing {
          background: #fff;
          border: 1px solid rgba(26,25,22,.07);
          border-radius: 18px 18px 18px 3px;
          padding: 13px 16px;
          display: inline-flex; align-items: center; gap: 4px;
          box-shadow: 0 1px 3px rgba(26,25,22,.05);
          animation: tlMsgIn .2s ease both;
        }
        .tl-td {
          width: 5px; height: 5px;
          background: #A8A69E; border-radius: 50%;
          animation: tlBounce 1.1s ease-in-out infinite;
        }
        .tl-td:nth-child(2){animation-delay:.15s}
        .tl-td:nth-child(3){animation-delay:.3s}
        @keyframes tlBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

        /* ── 제안 칩 ── */
        .tl-chips { padding: 0 14px 10px; display: flex; flex-wrap: wrap; gap: 5px; }
        .tl-chip {
          font-family: 'DM Sans', sans-serif;
          font-size: 11.5px; color: #6B6960;
          background: #fff; border: 1px solid rgba(26,25,22,.1);
          border-radius: 100px; padding: 5px 12px;
          cursor: pointer; transition: all .14s;
          white-space: nowrap;
        }
        .tl-chip:hover { border-color: #1A1916; color: #1A1916; }

        /* ── 입력창 ── */
        .tl-input-wrap {
          padding: 10px 12px 14px;
          background: #ECEAE2;
          border-top: 1px solid rgba(26,25,22,.07);
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0;
        }
        .tl-input {
          flex: 1; background: #fff;
          border: 1px solid rgba(26,25,22,.1); border-radius: 100px;
          padding: 9px 16px; font-size: 13.5px;
          font-family: 'DM Sans', sans-serif; color: #1A1916;
          outline: none; transition: border-color .14s, box-shadow .14s;
        }
        .tl-input::placeholder { color: #A8A69E; }
        .tl-input:focus { border-color: #2B5BFF; box-shadow: 0 0 0 3px rgba(43,91,255,.1); }
        .tl-input:disabled { opacity: .5; }
        .tl-send {
          width: 38px; height: 38px; flex-shrink: 0;
          background: #1A1916; border: none; border-radius: 50%;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all .15s;
        }
        .tl-send:hover:not(:disabled) { background: #2B5BFF; transform: scale(1.07); }
        .tl-send:disabled { opacity: .32; cursor: not-allowed; }

        /* ── FAB ── */
        .tl-fab {
          width: 60px; height: 60px; /* 기존 52px에서 확대 */
          background: #2B5BFF; /* 밝은 블루로 변경 */
          border: none; border-radius: 18px; /* 곡률 살짝 조정 */
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(43,91,255,.4), 0 1px 4px rgba(26,25,22,.14); /* 파란색 빛망울 그림자 */
          transition: all .22s cubic-bezier(.34,1.56,.64,1);
          position: relative;
        }
        .tl-fab:hover { transform: scale(1.08) translateY(-2px); background: #1a40cc; }
        .tl-fab-inner {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px;
        }
        .tl-fab-emoji { font-size: 24px; line-height: 1; color: #ffffff; } /* 이모지 크기 및 흰색 강제 */
        .tl-fab-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px; color: rgba(255,255,255,.8); /* 텍스트 가독성 확보 */
          letter-spacing: .5px; line-height: 1;
        }
        .tl-badge {
          position: absolute; top: -2px; right: -2px;
          width: 14px; height: 14px;
          background: #FF3B30; /* 알림 뱃지는 강렬한 빨간색으로 */
          border-radius: 50%;
          border: 2.5px solid #2B5BFF; /* 테두리는 버튼색과 동일하게 */
          animation: tlBadge .3s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes tlBadge { from{transform:scale(0)} to{transform:scale(1)} }
      `}</style>

      <div
        className="tl-chat"
        /* 하단 네비게이션 바(보통 높이 60px 내외)와 겹치지 않게 bottom을 90으로 상향 */
        style={{
          position: 'fixed',
          bottom: 'calc(110px + env(safe-area-inset-bottom))',
          right: 24,
          zIndex: 9999,
        }}
      >
        {/* ── 챗봇 창 ── */}
        {isOpen && (
          <div className="tl-window">
            {/* 헤더 */}
            <div className="tl-header">
              <div className="tl-header-left">
                <div className="tl-avatar">🤖</div>
                <div>
                  <div className="tl-title">MINIME AI</div>
                  <div className="tl-subtitle">
                    <span className="tl-dot" />
                    실시간 뉴스 연동 중
                  </div>
                </div>
              </div>
              <button className="tl-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            {/* 메시지 */}
            <div className="tl-msgs">
              {messages.map((msg, idx) => (
                <div key={idx} className={`tl-msg ${msg.role}`}>
                  <div className={`tl-bubble ${msg.role}`}>{msg.text}</div>
                  <div className="tl-time">{msg.time}</div>
                </div>
              ))}
              {isLoading && (
                <div className="tl-msg bot">
                  <div className="tl-typing">
                    <div className="tl-td" /><div className="tl-td" /><div className="tl-td" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 제안 칩 */}
            {showSuggestions && (
              <div className="tl-chips">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="tl-chip"
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* 입력 */}
            <div className="tl-input-wrap">
              <input
                ref={inputRef}
                className="tl-input"
                type="text"
                placeholder="뉴스에 대해 물어보세요..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              <button
                className="tl-send"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                aria-label="전송"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
                  stroke="#F5F4EF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 8h12M9 3l5 5-5 5" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── FAB ── */}
        <button
          className="tl-fab"
          onClick={() => setIsOpen((o) => !o)}
          aria-label="챗봇 열기/닫기"
        >
          <div className="tl-fab-inner">
            <span className="tl-fab-emoji">{isOpen ? '✕' : '💬'}</span>
            {!isOpen && <span className="tl-fab-label">AI</span>}
          </div>
          {hasUnread && <div className="tl-badge" />}
        </button>
      </div>
    </>
  );
}
