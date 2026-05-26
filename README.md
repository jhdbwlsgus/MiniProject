# MiniProject

기술 뉴스레터 플랫폼을 구현한 풀스택 프로젝트입니다. NestJS 기반 API 서버와 Next.js App Router 기반 웹 클라이언트가 분리되어 있으며, 일반 사용자, 관리자, 기자 기능을 함께 다룹니다.

자세한 폴더별 설명은 [structure.md](./structure.md)를 참고하세요.

## 주요 기능

- 뉴스 목록, 상세, 카테고리/태그별 조회
- 뉴스 좋아요, 댓글, 북마크, 공유
- 회원가입, 로그인, JWT 인증, OAuth 로그인
- 마이페이지, 프로필, 알림, 결제 내역
- 기자 신청, 기자 프로필, 기자 피드, 구독자 관리
- 관리자 뉴스 작성/수정, 사용자/구독자/기자 관리, 통계, 발송 이력
- 구독/결제, 뉴스레터, 알림
- 검색, 핫토픽, 아카이브
- OpenAI 기반 챗봇 및 기자용 챗봇
- 파일 업로드와 업로드 이미지 제공

## 프로젝트 구성

```text
MiniProject/
├─ README.md
├─ structure.md
├─ package.json
├─ MiniProject- 그외자료/
├─ techletter-backend/
└─ techletter-frontend/
```

- `techletter-backend/`: NestJS API 서버입니다. 인증, 뉴스, 구독, 알림, 통계, 검색, 기자, 챗봇, 업로드 기능을 담당합니다.
- `techletter-frontend/`: Next.js 웹 클라이언트입니다. 사용자 화면, 인증 화면, 관리자 화면, 기자 화면과 공통 UI를 담당합니다.
- `MiniProject- 그외자료/`: PRD, 와이어프레임, 기사 썸네일 등 기획/참고 자료가 들어 있습니다.

## 기술 스택

### Backend

- NestJS 11
- TypeScript
- TypeORM
- PostgreSQL
- Redis, BullMQ, Cache Manager
- Passport JWT, Google/Kakao/Naver OAuth
- Multer
- Nest Schedule
- OpenAI SDK
- Jest

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Axios
- next-themes
- Tiptap Editor
- React Dropzone

## 실행 방법

### 1. 백엔드 실행

```bash
cd techletter-backend
npm install
npm run start:dev
```

기본 API 서버 주소는 `http://localhost:3000`입니다. `PORT` 환경 변수를 지정하면 다른 포트로 실행할 수 있습니다.

### 2. 프론트엔드 실행

```bash
cd techletter-frontend
npm install
npm run dev
```

프론트엔드 개발 서버는 `http://localhost:3001`에서 실행됩니다.

## 환경 변수

백엔드는 `techletter-backend/.env` 또는 루트의 `.env`를 읽도록 설정되어 있습니다. 실제 값은 로컬 환경에 맞게 구성해야 합니다.

주요 환경 변수 예시:

```env
PORT=3000
FRONTEND_URL=http://localhost:3001

DB_HOST=
DB_PORT=6543
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=

REDIS_URL=

JWT_SECRET=
OPENAI_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

프론트엔드는 백엔드 API 주소로 `NEXT_PUBLIC_API_BASE_URL`을 사용할 수 있습니다. 값이 없으면 기본값으로 `http://localhost:3000`을 사용합니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## 주요 스크립트

### Backend

```bash
cd techletter-backend
npm run start
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm run test
npm run test:e2e
```

### Frontend

```bash
cd techletter-frontend
npm run dev
npm run build
npm run start
npm run lint
```

## 개발 참고

- 백엔드 진입점: `techletter-backend/src/main.ts`
- 백엔드 모듈 조립: `techletter-backend/src/app.module.ts`
- 프론트엔드 루트 레이아웃: `techletter-frontend/app/layout.tsx`
- 프론트엔드 API 클라이언트: `techletter-frontend/lib/api.ts`
- 공통 UI 컴포넌트: `techletter-frontend/components/common/`
- 뉴스 관련 UI: `techletter-frontend/components/news/`
- 챗봇 백엔드: `techletter-backend/src/chatbot/`
- 챗봇 프론트엔드: `techletter-frontend/components/common/Chatbot.tsx`

## 참고 문서

- [프로젝트 구조 문서](./structure.md)
- `techletter-backend/README.md`
- `techletter-frontend/README.md`
