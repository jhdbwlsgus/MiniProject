# MiniProject 프로젝트 구조

## 1. 프로젝트 개요

MiniProject는 기술 뉴스/뉴스레터 서비스를 만드는 풀스택 프로젝트입니다. 저장소는 백엔드와 프론트엔드를 분리한 구조이며, 별도 기획/와이어프레임 자료 폴더도 함께 보관하고 있습니다.

- `techletter-backend/`: NestJS 기반 API 서버
- `techletter-frontend/`: Next.js App Router 기반 웹 클라이언트
- `MiniProject- 그외자료/`: PRD, 와이어프레임, 기사 썸네일 등 프로젝트 참고 자료

주요 도메인은 뉴스, 카테고리/태그, 회원/인증, 기자, 구독/결제, 알림, 검색, 통계, 댓글/좋아요/북마크, 챗봇입니다.

## 2. 최상위 구조

```text
MiniProject/
├── package.json
├── package-lock.json
├── README.md
├── structure.md
├── MiniProject- 그외자료/
├── techletter-backend/
└── techletter-frontend/
```

### 최상위 파일/폴더 역할

- `package.json`: 루트 공통 의존성 일부가 정의되어 있습니다.
- `README.md`: 프로젝트 실행 및 구성 개요 문서입니다.
- `structure.md`: 현재 프로젝트 구조를 설명하는 문서입니다.
- `MiniProject- 그외자료/`: PRD 문서, 화면 와이어프레임 이미지, 기사 썸네일 자료가 있습니다.
- `techletter-backend/`: 서버 API, DB 엔티티, 인증, 스케줄러, 파일 업로드 기능을 담당합니다.
- `techletter-frontend/`: 사용자/관리자/기자 화면, 공통 UI, API 클라이언트, 상태 관리 코드를 담당합니다.

## 3. 기술 스택

### Backend

- NestJS 11
- TypeScript
- TypeORM
- PostgreSQL 드라이버 `pg`
- MySQL 드라이버 `mysql2`
- Passport JWT, Google OAuth, Kakao OAuth
- bcrypt
- Multer 파일 업로드
- Nest Schedule
- OpenAI SDK
- Jest

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Axios
- next-themes
- Tiptap Editor
- React Dropzone
- ESLint

## 4. 백엔드 구조

```text
techletter-backend/
├── package.json
├── package-lock.json
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.mjs
├── .prettierrc
├── .env
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── auth/
│   ├── categories/
│   ├── chatbot/
│   ├── interactions/
│   ├── interviews/
│   ├── news/
│   ├── newsletter/
│   ├── notifications/
│   ├── reporters/
│   ├── search/
│   ├── stats/
│   ├── subscriptions/
│   ├── tags/
│   ├── types/
│   ├── upload/
│   └── users/
├── test/
├── uploads/
└── dist/
```

### 백엔드 핵심 진입점

- `src/main.ts`: NestJS 서버를 실행하는 진입점입니다.
- `src/app.module.ts`: 전체 모듈을 조립합니다. Config, TypeORM, Schedule, Users, Auth, News, Categories, Tags, Chatbot, Interactions, Subscriptions, Stats, Upload, Interviews, Reporters, Notifications, Search 모듈을 등록합니다.
- `src/app.controller.ts`, `src/app.service.ts`: 기본 컨트롤러와 서비스입니다.

### 백엔드 도메인별 역할

- `auth/`: 로그인, 회원가입 DTO, JWT 인증 가드/전략, Google/Kakao/Naver OAuth 가드/전략을 포함합니다.
- `users/`: 사용자 엔티티, 삭제 사용자 엔티티, 사용자 API와 서비스를 담당합니다.
- `news/`: 뉴스 엔티티, 조회수 엔티티, 뉴스 CRUD, 뉴스 스케줄러, 생성/수정 DTO를 포함합니다.
- `categories/`: 카테고리 엔티티와 카테고리 API를 담당합니다.
- `tags/`: 태그 엔티티와 태그 API를 담당합니다.
- `interactions/`: 댓글, 좋아요, 북마크 컨트롤러/서비스와 관련 엔티티를 포함합니다.
- `subscriptions/`: 구독, 결제 엔티티와 구독 스케줄러, 구독 API를 담당합니다.
- `newsletter/`: 뉴스레터 엔티티, 발송/관리 API와 서비스를 담당합니다.
- `notifications/`: 알림 및 알림 설정 엔티티, 알림 API를 담당합니다.
- `reporters/`: 기자 프로필, 기자 피드, 기자 구독, 기자 신청/거절 DTO와 기자 API를 담당합니다.
- `interviews/`: 인터뷰 관련 API와 서비스를 담당합니다.
- `chatbot/`: 일반 챗봇과 기자용 챗봇 서비스를 담당합니다.
- `search/`: 검색 API와 검색 서비스를 담당합니다.
- `stats/`: 통계 API와 서비스를 담당합니다.
- `upload/`: 파일 업로드 API를 담당합니다.
- `types/`: 외부 라이브러리 타입 보강 파일을 포함합니다.

### 백엔드 실행 스크립트

```bash
cd techletter-backend
npm install
npm run start:dev
```

자주 쓰는 스크립트:

- `npm run start`: Nest 서버 실행
- `npm run start:dev`: watch 모드 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run start:prod`: `dist/main` 실행
- `npm run lint`: ESLint 자동 수정
- `npm run test`: 단위 테스트
- `npm run test:e2e`: E2E 테스트

## 5. 프론트엔드 구조

```text
techletter-frontend/
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   ├── globals.css
│   ├── (admin)/
│   ├── (auth)/
│   ├── (main)/
│   └── api/
├── components/
│   ├── admin/
│   ├── common/
│   ├── editor/
│   ├── interaction/
│   ├── layout/
│   ├── news/
│   └── ThemeProvider.tsx
├── hooks/
├── lib/
├── public/
├── store/
├── styles/
└── types/
```

### 프론트엔드 핵심 진입점

- `app/layout.tsx`: 앱 전체 루트 레이아웃입니다.
- `app/page.tsx`: 루트 페이지입니다.
- `app/globals.css`: 전역 스타일입니다.
- `components/ThemeProvider.tsx`: 테마 Provider 컴포넌트입니다.
- `lib/api.ts`: 백엔드 API 호출을 위한 클라이언트/유틸 영역입니다.

### App Router 페이지 그룹

- `app/(main)/`: 일반 사용자 화면입니다.
  - `page.tsx`: 메인 화면
  - `news/[id]/page.tsx`: 뉴스 상세
  - `category/[slug]/page.tsx`: 카테고리별 뉴스
  - `tag/[slug]/page.tsx`: 태그별 뉴스
  - `search/page.tsx`: 검색
  - `archive/`, `archive/[id]/`: 아카이브
  - `hot-topic/page.tsx`: 핫토픽
  - `subscriptions/`: 구독 플랜, 결제, 완료 화면
  - `mypage/`: 마이페이지, 프로필, 북마크, 결제내역, 알림, 설정
  - `reporters/`, `reporters/[slug]/`: 기자 목록 및 상세
  - `reporter/`: 기자 신청, 대시보드, 피드, 구독자, 프로필 수정
- `app/(auth)/`: 인증 화면입니다.
  - `login/page.tsx`: 로그인
  - `signup/page.tsx`: 회원가입
  - `auth/callback/page.tsx`: OAuth 콜백 처리
- `app/(admin)/`: 관리자 화면입니다.
  - `admin/page.tsx`: 관리자 메인
  - `admin/news/`: 뉴스 목록, 작성, 수정
  - `admin/users/page.tsx`: 사용자 관리
  - `admin/subscribers/page.tsx`: 구독자 관리
  - `admin/reporters/page.tsx`: 기자 관리
  - `admin/reporter-requests/page.tsx`: 기자 신청 관리
  - `admin/stats/page.tsx`: 통계
  - `admin/sends/page.tsx`: 발송 내역
- `app/api/auth/[...nextauth]/route.ts`: 프론트엔드 API 라우트 형태의 인증 핸들러입니다.

### 프론트엔드 컴포넌트 역할

- `components/common/`: Header, Footer, Button, Modal, Pagination, Chatbot, 검색 입력, 프로필 이미지/아바타, 다크모드 토글 등 공통 UI입니다.
- `components/layout/`: 모바일 프레임, 하단 내비게이션 등 레이아웃 컴포넌트입니다.
- `components/news/`: 뉴스 카드, 목록, 상세, 카테고리 스크롤, 태그 목록, 핫토픽 위젯입니다.
- `components/interaction/`: 댓글 입력/목록, 좋아요, 북마크, 공유 버튼입니다.
- `components/editor/`: Tiptap 에디터와 툴바입니다.
- `components/admin/`: 관리자 내비게이션 탭, 통계 차트, 구독자 테이블, 발송 내역 테이블입니다.

### 프론트엔드 상태/유틸/타입

- `hooks/`: 인증, 북마크, 좋아요, 다크모드, 푸시 알림, 사용자 신고 관련 커스텀 훅입니다.
- `lib/`: API 클라이언트, 인증 유틸, 공통 유틸 함수를 포함합니다.
- `store/`: `authStore`, `uiStore` 등 클라이언트 상태 저장소입니다.
- `types/`: API, 뉴스, 사용자 타입 정의입니다.
- `styles/`: 테마 CSS 등 스타일 보조 파일입니다.
- `public/`: 정적 파일 위치입니다.

### 프론트엔드 실행 스크립트

```bash
cd techletter-frontend
npm install
npm run dev
```

자주 쓰는 스크립트:

- `npm run dev`: Next.js 개발 서버 실행, 포트 `3001`
- `npm run build`: 프로덕션 빌드
- `npm run start`: 빌드 결과 실행
- `npm run lint`: ESLint 실행

## 6. 데이터와 외부 연동

- 백엔드는 TypeORM으로 DB 엔티티를 관리합니다.
- `app.module.ts` 기준 DB 타입은 PostgreSQL이며, 환경 변수로 접속 정보를 읽습니다.
- `.env`는 `techletter-backend/.env` 또는 상위 `.env`를 읽도록 설정되어 있습니다.
- 파일 업로드 결과물은 백엔드 `uploads/` 폴더에 저장되는 구조입니다.
- OpenAI SDK가 백엔드 챗봇 기능에 사용됩니다.
- OAuth 관련 전략은 Google, Kakao, Naver 파일로 분리되어 있습니다.

## 7. 개발 시 자주 보는 위치

- 새 API 모듈 추가: `techletter-backend/src/<domain>/`
- DB 엔티티 수정: 각 도메인 폴더의 `*.entity.ts`
- 인증/권한 확인: `techletter-backend/src/auth/`
- API 호출 수정: `techletter-frontend/lib/api.ts`
- 사용자 페이지 추가: `techletter-frontend/app/(main)/`
- 관리자 페이지 추가: `techletter-frontend/app/(admin)/admin/`
- 공통 UI 수정: `techletter-frontend/components/common/`
- 뉴스 UI 수정: `techletter-frontend/components/news/`
- 마이페이지 수정: `techletter-frontend/app/(main)/mypage/`

## 8. 전체 요약

이 프로젝트는 NestJS API 서버와 Next.js 웹 클라이언트를 분리한 뉴스레터 플랫폼입니다. 백엔드는 인증, 뉴스, 구독/결제, 알림, 통계, 검색, 기자, 챗봇 기능을 모듈 단위로 나누고, 프론트엔드는 App Router의 라우트 그룹을 활용해 일반 사용자, 인증, 관리자, 기자 화면을 구분합니다.
