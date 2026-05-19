import MobileFrame from "@/components/layout/MobileFrame";
import NewsCard from "@/components/news/NewsCard";
import NewsListItem from "@/components/news/NewsListItem";
import { News } from "@/types/news";

const hotNews: News[] = [
  {
    id: 1,
    title: "GPT-5 출시, 성능 40% 향상",
    summary: "",
    createdAt: "2시간 전",
    views: 1200,
    likesCount: 84,
  },
  {
    id: 2,
    title: "React 19 정식 릴리즈",
    summary: "",
    createdAt: "5시간 전",
    views: 980,
    likesCount: 61,
  },
];

const latestNews: News[] = [
  {
    id: 1,
    title: "GPT-5 출시, 이전 버전 대비 성능 40% 향상",
    summary: "",
    createdAt: "2시간 전",
    views: 832,
    commentsCount: 12,
  },
  {
    id: 2,
    title: "React 19 정식 릴리즈 발표",
    summary: "",
    createdAt: "5시간 전",
    views: 654,
    commentsCount: 7,
  },
];

export default function HomePage() {
  return (
    <MobileFrame>
      <div className="mb-4 flex items-center gap-3">
        <button className="text-2xl text-blue-500">☰</button>
        <div className="flex-1 rounded-full border border-[#3b3b3b] bg-[#181818] px-4 py-2 text-sm text-gray-400">
          🔍 검색
        </div>
        <button className="text-xl">🔔</button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f5ff] text-sm font-bold text-blue-600">
          U
        </div>
      </div>

      <div className="dashed-box mb-5 flex h-36 items-center justify-center text-gray-400">
        이번 주 핫뉴스 배너
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">⚡ 지금 핫한 뉴스</h2>
        <button className="text-sm text-blue-500">전체보기</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {hotNews.map((news) => (
          <NewsCard key={news.id} news={news} />
        ))}
      </div>

      <div className="mt-5 mb-5 flex flex-wrap gap-2">
        <button className="rounded-xl bg-[#e9f0ff] px-3 py-2 text-sm font-semibold text-blue-600">
          전체
        </button>
        <button className="rounded-xl border border-[#3b3b3b] px-3 py-2 text-sm text-gray-300">
          AI
        </button>
        <button className="rounded-xl border border-[#3b3b3b] px-3 py-2 text-sm text-gray-300">
          프론트
        </button>
        <button className="rounded-xl border border-[#3b3b3b] px-3 py-2 text-sm text-gray-300">
          백엔드
        </button>
        <button className="rounded-xl border border-[#3b3b3b] px-3 py-2 text-sm text-gray-300">
          보안
        </button>
      </div>

      <h2 className="mb-3 text-lg font-bold">최신 뉴스</h2>

      <div>
        {latestNews.map((news) => (
          <NewsListItem key={news.id} news={news} />
        ))}
      </div>
    </MobileFrame>
  );
}
