# MiniProject — 프로젝트 구조 요약

## 프로젝트 개요

MiniProject는 NestJS 기반 백엔드(`techletter-backend`)와 Next.js App Router 기반 프론트엔드(`techletter-frontend`)로 구성된 뉴스/뉴스레터 플랫폼입니다.

- Backend: NestJS + TypeScript API 서버
- Frontend: Next.js + React + TypeScript + Tailwind CSS
- 기능: 뉴스 작성/관리, 구독/결제, 인증/OAuth, 댓글/좋아요/북마크, 뉴스레터 발송, AI/챗봇

---

## Tech Stack

### Infrastructure
- Database: Supabase (PostgreSQL)
- DB 관리 도구: DBeaver
- 배포/호스팅: 없음 명시, 로컬 개발 중심 구조

### Backend
- NestJS
- TypeORM
- Passport.js (JWT, Google/Kakao/Naver 소셜 로그인)
- OpenAI API (챗봇/AI 보조)
- Task Scheduling (뉴스레터 예약 발송)

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS
- Zustand
- Shadcn UI

---

## Key Features

- 3사 소셜 로그인: 구글, 카카오, 네이버
- 관리자/기자/일반 유저 권한 분리 (RBAC)
- 뉴스 CRUD 및 뉴스레터 정기 발송 스케줄러
- OpenAI 기반 AI 챗봇 서비스
- 댓글, 좋아요, 북마크 인터랙션

---

## 최상위 폴더

- `package.json` — 루트 패키지 설정
- `README.md` — 전체 프로젝트 설명
- `structure.md` — 프로젝트 구조 요약
- `techletter-backend/` — 백엔드 NestJS 애플리케이션
- `techletter-frontend/` — 프론트엔드 Next.js 애플리케이션

---

## techletter-backend 구조

```
techletter-backend/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── eslint.config.mjs
├── README.md
├── .env
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── auth/
│   ├── categories/
│   ├── chatbot/
│   ├── database/
│   │   └── migrations/
│   ├── interactions/
│   │   ├── bookmarks.controller.ts
│   │   ├── bookmarks.service.ts
│   │   ├── comments.controller.ts
│   │   ├── comments.service.ts
│   │   ├── likes.controller.ts
│   │   ├── likes.service.ts
│   │   ├── interactions.module.ts
│   │   └── entities/
│   ├── interviews/
│   ├── news/
│   ├── newsletter/
│   ├── reporters/
│   ├── search/
│   ├── stats/
│   ├── subscriptions/
│   ├── tags/
│   ├── types/
│   ├── upload/
│   └── users/
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
└── uploads/
```

### 주요 역할

- `src/main.ts`: 서버 진입점
- `src/app.module.ts`: 모듈 등록, 의존성 주입
- `auth/`: JWT, OAuth, 권한 검사
- `news/`: 뉴스 CRUD, 뉴스 엔티티
- `newsletter/`: 뉴스레터 발송 및 예약
- `subscriptions/`: 구독/결제 관리
- `interactions/`: 좋아요·댓글·북마크
- `chatbot/`: AI/챗봇 관련 서비스
- `database/migrations/`: DB 마이그레이션

### 백엔드 주요 스크립트

- `npm run start:dev`
- `npm run build`
- `npm run start:prod`
- `npm run lint`
- `npm run test` / `npm run test:e2e`

---

## techletter-frontend 구조

```
techletter-frontend/
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── next-env.d.ts
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   ├── (admin)/
│   ├── (auth)/
│   ├── (main)/
│   │   └── mypage/
│   └── api/
├── components/
│   ├── ThemeProvider.tsx
│   ├── admin/
│   ├── common/
│   ├── editor/
│   ├── interaction/
│   ├── layout/
│   └── news/
├── hooks/
│   ├── useAuth.ts
│   ├── useBookmark.ts
│   ├── useDarkMode.ts
│   ├── useLike.ts
│   ├── usePushNotification.ts
│   └── useUserReport.ts
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
├── store/
│   ├── authStore.ts
│   └── uiStore.ts
├── styles/
│   └── theme.css
├── types/
│   ├── api.ts
│   ├── news.ts
│   └── user.ts
└── public/
```

### 주요 역할

- `app/layout.tsx`: 루트 레이아웃
- `app/page.tsx`: 메인 홈 페이지
- `app/(admin)/`: 관리자/기자 UI
- `app/(auth)/`: 인증 관련 페이지
- `app/(main)/`: 일반 사용자 페이지
- `components/`: 공통 UI 컴포넌트
- `hooks/`: 인증·북마크·좋아요·다크모드 등 커스텀 훅
- `lib/api.ts`: API 호출 래퍼 및 공통 유틸

---

## 프로젝트 요약

NestJS 백엔드와 Next.js 프론트엔드를 분리한 풀스택 뉴스/뉴스레터 플랫폼 저장소입니다.

백엔드는 인증, 구독, 뉴스, 뉴스레터, 댓글/좋아요/북마크, 챗봇/AI 기능을 제공하고,
프론트엔드는 App Router 기반 관리자·인증·사용자 화면을 구성합니다.
