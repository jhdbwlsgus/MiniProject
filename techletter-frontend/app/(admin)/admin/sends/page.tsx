'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

type SendStatus = 'SUCCESS' | 'FAILED' | 'SENDING' | 'SCHEDULED';
type SendType = 'daily' | 'weekly' | 'manual';
type FailReason = '결제 만료' | '수신 거부' | '이메일 오류' | '서버 오류' | null;

interface NewsletterSend {
  id: number;
  title: string;
  type: SendType;
  status: SendStatus;
  recipientCount: number;
  successCount: number;
  failCount: number;
  failReasons: { reason: FailReason; count: number }[];
  targetCondition: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface DraftNews {
  id: number;
  title: string;
  lead: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

const statusConfig: Record<SendStatus, { label: string; color: string; bg: string }> = {
  SUCCESS:   { label: '발송 완료', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  FAILED:    { label: '발송 실패', color: 'text-red-400',     bg: 'bg-red-500/10' },
  SENDING:   { label: '발송 중',   color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  SCHEDULED: { label: '예약됨',    color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
};

const typeLabel: Record<SendType, string> = {
  daily:  '데일리',
  weekly: '위클리',
  manual: '수동 발송',
};

const typeColor: Record<SendType, string> = {
  daily:  'text-blue-400',
  weekly: 'text-purple-400',
  manual: 'text-gray-400',
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const targetDescription: Record<SendType, string> = {
  daily:  'ACTIVE + CANCELED(기간내) / 데일리 수신 동의자',
  weekly: 'ACTIVE + CANCELED(기간내) / 위클리 수신 동의자',
  manual: 'ACTIVE + CANCELED(기간내) / 전체 구독자',
};

export default function SendsPage() {
  const [sends, setSends] = useState<NewsletterSend[]>([]);
  const [draftNews, setDraftNews] = useState<DraftNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<SendType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<SendStatus | 'ALL'>('ALL');
  const [filterOnlyFailed, setFilterOnlyFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedNews, setSelectedNews] = useState<DraftNews | null>(null);
  const [sendType, setSendType] = useState<SendType>('manual');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState<Record<SendType, number>>({
    daily: 0, weekly: 0, manual: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sendsRes, draftsRes] = await Promise.all([
          api.get('/newsletter/history'),
          api.get('/news/admin?status=draft'),
        ]);
        setSends(Array.isArray(sendsRes.data) ? sendsRes.data : []);
        // ✅ 배열 여부 확인 후 설정
        const drafts = Array.isArray(draftsRes.data)
          ? draftsRes.data
          : draftsRes.data.news || draftsRes.data.items || [];
        setDraftNews(drafts);
      } catch (err: any) {
        setError(err.response?.data?.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchEstimated = async () => {
      try {
        const res = await api.get(`/newsletter/estimated-recipients?type=${sendType}`);
        setEstimatedRecipients(prev => ({ ...prev, [sendType]: res.data.count }));
      } catch {
        // 실패 시 0 유지
      }
    };
    if (showModal) fetchEstimated();
  }, [sendType, showModal]);

  const filtered = sends.filter(s => {
    const matchType = filterType === 'ALL' || s.type === filterType;
    const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
    const matchFailed = !filterOnlyFailed || s.failCount > 0;
    return matchType && matchStatus && matchFailed;
  });

  const stats = {
    total: sends.length,
    success: sends.filter(s => s.status === 'SUCCESS').length,
    totalRecipients: sends.filter(s => s.status === 'SUCCESS').reduce((a, s) => a + s.successCount, 0),
    scheduled: sends.filter(s => s.status === 'SCHEDULED').length,
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStep(1);
    setSelectedNews(null);
    setSendType('manual');
    setIsScheduled(false);
    setScheduledAt('');
    setShowPreview(false);
  };

  const handleSend = async () => {
    if (!selectedNews || sendLoading) return;
    setSendLoading(true);
    try {
      await api.post('/newsletter/send', {
        title: selectedNews.title,
        type: sendType,
        newsId: selectedNews.id,
        scheduledAt: isScheduled ? scheduledAt : null,
      });
      alert(isScheduled ? '뉴스레터가 예약되었습니다!' : '뉴스레터가 발송되었습니다!');
      const res = await api.get('/newsletter/history');
      setSends(Array.isArray(res.data) ? res.data : []);
      handleCloseModal();
    } catch (err: any) {
      alert(err.response?.data?.message || '발송 실패');
    } finally {
      setSendLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500">로딩 중...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-28">
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/mypage">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <span className="font-bold text-base">뉴스레터 발송 이력</span>
          </div>
          <button onClick={() => setShowModal(true)}
            className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            기사 선택 후 발송
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '총 발송 횟수',  value: stats.total,                                  color: 'text-white' },
            { label: '성공 발송',     value: stats.success,                                 color: 'text-emerald-400' },
            { label: '총 수신자 수',  value: `${stats.totalRecipients.toLocaleString()}명`, color: 'text-blue-400' },
            { label: '예약 발송',     value: stats.scheduled,                               color: 'text-yellow-400' },
          ].map((item) => (
            <div key={item.label} className="bg-gray-900 rounded-xl p-4">
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-gray-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 transition">
            <option value="ALL">전체 유형</option>
            <option value="daily">데일리</option>
            <option value="weekly">위클리</option>
            <option value="manual">수동 발송</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 transition">
            <option value="ALL">전체 상태</option>
            <option value="SUCCESS">발송 완료</option>
            <option value="FAILED">발송 실패</option>
            <option value="SENDING">발송 중</option>
            <option value="SCHEDULED">예약됨</option>
          </select>
          <button onClick={() => setFilterOnlyFailed(!filterOnlyFailed)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition border ${
              filterOnlyFailed ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}>
            실패 건만 보기
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-gray-800 text-xs text-gray-500 font-medium">
            <div className="col-span-2">제목 / 발송 조건</div>
            <div>유형 / 상태</div>
            <div>수신자</div>
            <div>발송 시각</div>
            <div>성공률</div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500 text-sm">발송 이력이 없어요</div>
          ) : (
            filtered.map((send) => {
              const config = statusConfig[send.status];
              const successRate = send.recipientCount > 0
                ? Math.round((send.successCount / send.recipientCount) * 100) : 0;
              const isExpanded = expandedId === send.id;

              return (
                <div key={send.id} className="border-b border-gray-800 last:border-0">
                  <button onClick={() => setExpandedId(isExpanded ? null : send.id)}
                    className="w-full grid grid-cols-6 gap-4 px-4 py-4 hover:bg-gray-800/50 transition items-center text-left">
                    <div className="col-span-2">
                      <div className="text-sm font-medium text-white line-clamp-1">{send.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{send.targetCondition}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-medium ${typeColor[send.type]}`}>{typeLabel[send.type]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${config.color} ${config.bg}`}>{config.label}</span>
                    </div>
                    <div>
                      <div className="text-sm text-white">{send.recipientCount.toLocaleString()}명</div>
                      {send.failCount > 0 && <div className="text-xs text-red-400">{send.failCount}명 실패</div>}
                    </div>
                    <div className="text-xs text-gray-400">
                      {send.scheduledAt && <div className="text-gray-500 mb-0.5">예약: {formatDate(send.scheduledAt)}</div>}
                      {formatDate(send.sentAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      {send.status === 'SCHEDULED' ? (
                        <span className="text-xs text-gray-500">-</span>
                      ) : (
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${successRate === 100 ? 'text-emerald-400' : successRate > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {successRate}%
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                            <div className={`h-1 rounded-full ${successRate === 100 ? 'bg-emerald-400' : successRate > 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                              style={{ width: `${successRate}%` }} />
                          </div>
                        </div>
                      )}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"
                        className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-800 pt-3 bg-gray-800/30">
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="bg-gray-900 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">성공</div>
                          <div className="text-sm font-medium text-emerald-400">{send.successCount.toLocaleString()}명</div>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">실패</div>
                          <div className="text-sm font-medium text-red-400">{send.failCount.toLocaleString()}명</div>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">발송 조건</div>
                          <div className="text-xs text-gray-300">{send.targetCondition}</div>
                        </div>
                      </div>
                      {send.failReasons && send.failReasons.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 mb-2 font-medium">실패 사유 분석</div>
                          <div className="flex flex-col gap-1.5">
                            {send.failReasons.map((fr, i) => (
                              <div key={i} className="flex justify-between items-center bg-gray-900 rounded-lg px-3 py-2">
                                <span className="text-xs text-gray-400">{fr.reason}</span>
                                <span className="text-xs text-red-400 font-medium">{fr.count}명</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs text-gray-600 text-center">총 {filtered.length}건 표시 중</p>
      </main>

      {/* 기사 선택 발송 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base">뉴스레터 발송</h2>
                <span className="text-xs text-gray-500">{step}/3단계</span>
              </div>
              <button onClick={handleCloseModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">

              {/* 1단계: 기사 선택 */}
              {step === 1 && (
                <>
                  <div>
                    <div className="text-sm font-medium text-white mb-1">발송할 기사를 선택하세요</div>
                    <div className="text-xs text-gray-500">임시저장(DRAFT) 상태의 기사 목록입니다</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {draftNews.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        발송 가능한 기사가 없어요.<br />
                        <Link href="/admin/news/create" className="text-blue-400 hover:text-blue-300 mt-1 inline-block">
                          새 기사 작성하기
                        </Link>
                      </div>
                    ) : (
                      draftNews.map((news) => (
                        <button key={news.id} onClick={() => setSelectedNews(news)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition ${
                            selectedNews?.id === news.id
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                          }`}>
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-white line-clamp-1">{news.title}</div>
                              {news.lead && <div className="text-xs text-gray-400 mt-1 line-clamp-2">{news.lead}</div>}
                              <div className="text-xs text-gray-600 mt-1">{formatDate(news.createdAt)}</div>
                            </div>
                            {selectedNews?.id === news.id && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleCloseModal}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition">
                      취소
                    </button>
                    <button onClick={() => setStep(2)} disabled={!selectedNews}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition">
                      다음
                    </button>
                  </div>
                </>
              )}

              {/* 2단계: 발송 설정 */}
              {step === 2 && (
                <>
                  <div>
                    <div className="text-sm font-medium text-white mb-1">발송 설정</div>
                    <div className="text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2 mt-2 line-clamp-1">
                      📄 {selectedNews?.title}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">발송 대상</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'daily',  label: '데일리', desc: '데일리 수신 동의자', color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
                        { key: 'weekly', label: '위클리', desc: '위클리 수신 동의자', color: 'border-purple-500 bg-purple-500/10 text-purple-400' },
                        { key: 'manual', label: '전체',   desc: 'ACTIVE+CANCELED',   color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
                      ].map((item) => (
                        <button key={item.key} onClick={() => setSendType(item.key as SendType)}
                          className={`p-3 rounded-xl border-2 text-left transition ${
                            sendType === item.key ? item.color : 'border-gray-700 bg-gray-800 text-gray-400'
                          }`}>
                          <div className="text-xs font-medium">{item.label}</div>
                          <div className="text-xs opacity-70 mt-0.5">{item.desc}</div>
                          <div className="text-sm font-bold mt-1">{estimatedRecipients[item.key as SendType]}명</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">발송 시각</label>
                    <div className="flex gap-2">
                      <button onClick={() => setIsScheduled(false)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${
                          !isScheduled ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                        }`}>
                        즉시 발송
                      </button>
                      <button onClick={() => setIsScheduled(true)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${
                          isScheduled ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                        }`}>
                        예약 발송
                      </button>
                    </div>
                    {isScheduled && (
                      <input type="datetime-local" value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    )}
                  </div>
                  <button onClick={() => setShowPreview(true)}
                    className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    뉴스레터 미리보기
                  </button>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition">
                      이전
                    </button>
                    <button onClick={() => setStep(3)} disabled={isScheduled && !scheduledAt}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition">
                      다음
                    </button>
                  </div>
                </>
              )}

              {/* 3단계: 최종 확인 */}
              {step === 3 && (
                <>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="text-sm text-blue-300 font-medium mb-2">발송 대상 확인</div>
                    <p className="text-xs text-blue-200/80 leading-relaxed">{targetDescription[sendType]}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <span className="text-sm font-bold text-white">예상 수신자 {estimatedRecipients[sendType].toLocaleString()}명</span>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">기사</span>
                      <span className="text-white text-right max-w-48 line-clamp-1">{selectedNews?.title}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">유형</span>
                      <span className={typeColor[sendType]}>{typeLabel[sendType]}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">발송 시각</span>
                      <span className="text-white">{isScheduled ? formatDate(scheduledAt) : '즉시 발송'}</span>
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                    <p className="text-xs text-yellow-300">
                      ⚠️ {isScheduled ? '예약 후에도 발송 전까지 취소 가능합니다.' : '발송 후 취소가 불가능합니다. 신중하게 확인해주세요.'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition">
                      이전
                    </button>
                    <button onClick={handleSend} disabled={sendLoading}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                      {sendLoading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                            <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          처리 중...
                        </>
                      ) : isScheduled ? '예약하기' : '발송하기'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 뉴스레터 미리보기 모달 */}
      {showPreview && selectedNews && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center px-4 overflow-y-auto py-10">
          <div className="bg-white rounded-2xl w-full max-w-lg">
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
              <h1 className="text-xl font-bold text-gray-900 mb-3 leading-tight">{selectedNews.title}</h1>
              {selectedNews.lead && (
                <p className="text-sm text-gray-600 leading-relaxed mb-4 pb-4 border-b border-gray-100">
                  {selectedNews.lead}
                </p>
              )}
              <div className="text-sm text-gray-500 italic mb-4">
                [본문 내용은 실제 발송 시 기사 전문이 포함됩니다]
              </div>
              <div className="text-center mb-6">
                <div className="inline-block px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl">
                  전체 기사 읽기 →
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">발송 대상</span>
                  <span className="text-gray-700 font-medium">{typeLabel[sendType]}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">예상 수신자</span>
                  <span className="text-blue-600 font-bold">{estimatedRecipients[sendType]}명</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">발송 시각</span>
                  <span className="text-gray-700">{isScheduled ? formatDate(scheduledAt) : '즉시 발송'}</span>
                </div>
              </div>
              <div className="text-center mt-4">
                <span className="text-xs text-gray-400">수신을 원하지 않으시면 </span>
                <span className="text-xs text-blue-500 underline cursor-pointer">여기</span>
                <span className="text-xs text-gray-400">를 클릭하세요.</span>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowPreview(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
