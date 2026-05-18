# moa-app 문서

커플을 위한 React Native 앱 **moa**의 기술 문서 모음입니다.

## 문서 목록

| 파일 | 내용 |
|------|------|
| [architecture.md](./architecture.md) | 전체 아키텍처, 레이어 구조, 데이터 흐름 |
| [structure.md](./structure.md) | 디렉토리 구조 및 각 파일/폴더 역할 |
| [features.md](./features.md) | 기능별 명세 (화면 → 컴포넌트 → 훅 → API) |
| [design-system.md](./design-system.md) | 디자인 토큰, UI 컴포넌트, 레이아웃 규칙 |
| [state-management.md](./state-management.md) | Zustand + React Query 상태관리 패턴 |
| [backend.md](./backend.md) | Supabase 구성, DB 스키마, Edge Functions |
| [improvements.md](./improvements.md) | 발견된 문제점 및 개선 사항 목록 |

## 빠른 참조

### 기술 스택
- **Expo SDK 54** + React 19 + React Native 0.81
- **Expo Router v6** — 파일 기반 라우팅
- **Supabase** — 인증, DB, 스토리지, Edge Functions
- **NativeWind v4** — Tailwind CSS 기반 스타일링
- **Zustand v5** — 전역 상태 (인증)
- **TanStack React Query v5** — 서버 상태 캐싱
- **TypeScript** (strict 모드)

### 주요 진입점

| 관심사 | 파일 |
|--------|------|
| 앱 부팅 / 인증 분기 | `app/_layout.tsx` |
| 전역 인증 상태 | `src/stores/authStore.ts` |
| Supabase 클라이언트 | `src/lib/supabase/client.ts` |
| 디자인 토큰 | `tailwind.config.js` |
| 앱 메타데이터 | `app.json` |
