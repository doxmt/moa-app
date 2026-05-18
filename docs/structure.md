# 디렉토리 구조

## 전체 트리

```
moa-app/
├── app/                        Expo Router 라우팅 (화면)
│   ├── _layout.tsx             루트 레이아웃 (Provider, AuthGate)
│   ├── index.tsx               진입점 (리다이렉트 전용)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx           로그인 화면
│   ├── (onboarding)/
│   │   ├── _layout.tsx
│   │   └── index.tsx           프로필 설정 (회원가입 후 최초 1회)
│   ├── (tabs)/
│   │   ├── _layout.tsx         탭바 + 헤더 레이아웃
│   │   ├── home.tsx            홈
│   │   ├── calendar.tsx        캘린더
│   │   ├── recommend.tsx       추천 게임
│   │   ├── story.tsx           스토리
│   │   └── question.tsx        오늘의 질문
│   └── settings/
│       ├── _layout.tsx
│       ├── index.tsx           설정 메인
│       ├── profile.tsx         프로필 편집
│       ├── account.tsx         계정 관리
│       ├── couple.tsx          커플 연결 (QR 코드)
│       ├── connect.tsx         연결 상태
│       ├── calendar.tsx        캘린더 설정
│       ├── question-hour.tsx   질문 갱신 시간 설정
│       ├── privacy.tsx         개인정보 처리방침
│       ├── terms.tsx           이용약관
│       └── delete-account.tsx  계정 삭제
│
├── src/
│   ├── components/
│   │   ├── features/           기능별 컴포넌트
│   │   │   ├── calendar/       CalendarGrid, EventForm, MilestoneList
│   │   │   ├── home/           BalanceGameCard, PolaroidCard
│   │   │   ├── layout/         Header, TabBar
│   │   │   ├── notification/   NotificationModal
│   │   │   ├── question/       QuestionCard
│   │   │   ├── recommend/      RoulettePage, LadderPage, DrawPage, DetailPage, constants
│   │   │   └── story/          StoryViewer, StoryUploadModal, story.styles
│   │   └── ui/                 공통 UI 컴포넌트
│   │       ├── ConfirmDialog.tsx
│   │       ├── DateTimeWheelPicker.tsx
│   │       ├── EmptyState.tsx
│   │       ├── LoadingView.tsx
│   │       ├── ScrollDatePicker.tsx
│   │       ├── ScrollTimePicker.tsx
│   │       └── WheelColumn.tsx
│   ├── hooks/                  커스텀 훅 (데이터 페칭 + 비즈니스 로직)
│   │   ├── useCalendarData.ts
│   │   ├── useHomeData.ts
│   │   ├── useNotificationData.ts
│   │   ├── useNotificationSetup.ts
│   │   ├── useQuestionData.ts
│   │   ├── useStoryData.ts
│   │   └── useToast.tsx
│   ├── lib/
│   │   └── supabase/           Supabase API 모듈
│   │       ├── client.ts       클라이언트 초기화
│   │       ├── calendar.ts     이벤트 CRUD
│   │       ├── notifications.ts 알림 CRUD
│   │       ├── photo.ts        커플 대표 사진
│   │       ├── profile.ts      프로필 & 커플 정보
│   │       ├── recommendations.ts 추천 항목 조회
│   │       └── stories.ts      스토리 CRUD
│   ├── stores/
│   │   └── authStore.ts        Zustand 인증 스토어
│   ├── types/                  (비어있음 — 타입은 각 파일에 로컬 정의)
│   └── utils/
│       ├── date.ts             날짜 포맷 유틸
│       ├── holidays.ts         한국 공휴일 데이터
│       └── questionDay.ts      커플 연결 후 경과일 계산
│
├── supabase/
│   └── functions/              Supabase Edge Functions
│       ├── delete-account/     계정 및 관련 데이터 삭제
│       ├── send-notification/  푸시 알림 전송
│       └── cleanup-couples/    연결 해제된 커플 정리
│
├── assets/
│   └── images/                 앱 아이콘, 스플래시 이미지
│
├── app.json                    Expo 앱 설정
├── tailwind.config.js          NativeWind 디자인 토큰
├── tsconfig.json               TypeScript 설정 (path alias @/* → src/*)
├── metro.config.js             Metro 번들러 (NativeWind 통합)
├── babel.config.js             Babel 설정
├── package.json                의존성
├── pnpm-lock.yaml
├── global.css                  Tailwind 기본 입력
├── nativewind-env.d.ts         NativeWind 타입 선언
└── .env                        환경변수 (git 제외)
```

## 폴더별 역할 요약

### `app/` — 화면 (라우팅)
Expo Router가 이 폴더를 파일 경로 → URL로 매핑한다. 화면 레이아웃과 페이지 조립만 담당하고, 비즈니스 로직은 `src/hooks/`에 위임한다.

### `src/components/features/` — 기능 컴포넌트
특정 도메인에 종속된 컴포넌트. 각 서브폴더가 하나의 도메인(캘린더, 홈, 스토리 등)에 대응한다.

### `src/components/ui/` — 공통 UI
도메인 무관하게 재사용되는 프리미티브. `WheelColumn`은 날짜/시간 선택기 3종(DateTimeWheelPicker, ScrollDatePicker, ScrollTimePicker)의 기반이다.

### `src/hooks/` — 커스텀 훅
React Query를 통해 Supabase 데이터를 가져오고, 변이(mutation) 액션을 제공한다. 화면 컴포넌트는 이 훅을 통해서만 데이터에 접근한다.

### `src/lib/supabase/` — Supabase API
순수 함수로 이루어진 API 레이어. 훅에서 호출하며, Supabase 쿼리 세부 사항을 이 폴더에 격리한다.

### `src/stores/` — Zustand 스토어
현재 `authStore.ts` 하나만 존재. 인증 세션처럼 여러 화면이 동시에 필요한 전역 상태만 담는다.

### `supabase/functions/` — Edge Functions
서버 사이드 로직. Deno 런타임. 클라이언트에서 직접 실행하기 어렵거나 보안이 필요한 작업(계정 삭제, 푸시 발송)에 사용한다.

## Path Alias

`tsconfig.json`에 `@/*` → `./src/*` 별칭이 설정돼 있어, 모든 내부 import는 `@/`로 시작한다.

```typescript
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
```
