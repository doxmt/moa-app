# 아키텍처

## 레이어 구조

moa-app은 4개 레이어로 구성된다.

```
┌─────────────────────────────────────────────────────┐
│  UI Layer  app/                                     │
│  Expo Router 파일 기반 라우팅                          │
│  (auth) | (onboarding) | (tabs) | settings          │
└─────────────────┬───────────────────────────────────┘
                  │ useXxxData(), useAuthStore()
┌─────────────────▼───────────────────────────────────┐
│  Feature / State Layer  src/                        │
│  components/features/  hooks/  stores/  components/ui/ │
└─────────────────┬───────────────────────────────────┘
                  │ supabase.from() / supabase.storage
┌─────────────────▼───────────────────────────────────┐
│  API Layer  src/lib/supabase/                       │
│  calendar.ts  stories.ts  profile.ts  ...           │
└─────────────────┬───────────────────────────────────┘
                  │ HTTPS / WebSocket
┌─────────────────▼───────────────────────────────────┐
│  Backend  Supabase                                  │
│  PostgreSQL  Storage  Auth  Realtime  Edge Functions │
└─────────────────────────────────────────────────────┘
```

## 데이터 흐름

### 인증 흐름

```
앱 시작
  → app/_layout.tsx (RootLayout)
  → AuthGate 컴포넌트
  → useAuthStore.initialize()
      → supabase.auth.getSession()     세션 복원
      → checkProfileComplete()         프로필 완성 여부
      → onAuthStateChange() 구독       이후 상태 변화 감지
  → 라우팅 결정:
      세션 없음  → /(auth)/login
      세션 있음 + 프로필 미완성 → /(onboarding)
      세션 있음 + 프로필 완성  → /(tabs)/home
```

### 서버 상태 흐름

```
화면 마운트
  → useXxxData() 훅
  → React Query useQuery/useMutation
  → src/lib/supabase/*.ts API 함수
  → Supabase PostgreSQL / Storage
  → 캐시 업데이트 (staleTime: 5분)
```

### 전역 상태 vs 서버 상태

| 상태 | 도구 | 위치 |
|------|------|------|
| 인증 세션, 프로필 완성 여부 | Zustand | `src/stores/authStore.ts` |
| 캘린더 이벤트, 스토리, 알림 등 | React Query | 각 `src/hooks/useXxx.ts` |

## AuthGate 패턴

`app/_layout.tsx`에 있는 `AuthGate`는 렌더링 결과 없이 라우팅만 제어하는 패턴이다.

```typescript
// 핵심 분기 로직
if (!session) → router.replace('/(auth)/login')
if (inAuth && profileComplete) → router.replace('/(tabs)/home')
if (inAuth && !profileComplete) → router.replace('/(onboarding)')
```

`profileComplete === null`이면 Supabase 확인 중이므로 리다이렉트를 보류한다.

## Expo Router 라우팅 구조

Expo Router는 `app/` 폴더 구조를 URL 경로로 직접 매핑한다. `(그룹)` 표기는 URL에 포함되지 않는 레이아웃 그룹이다.

```
app/
├── _layout.tsx        루트 레이아웃 — 전체 Provider 및 AuthGate
├── index.tsx          / 진입점 — AuthGate가 처리하므로 빈 화면
├── (auth)/            URL: /login
├── (onboarding)/      URL: /onboarding
├── (tabs)/            URL: /home, /calendar, /recommend, /story, /question
└── settings/          URL: /settings, /settings/profile, ...
```

## React Query 설정

`app/_layout.tsx`에서 전역으로 설정:

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5분간 캐시 신선
      retry: 1,                    // 실패 시 1회 재시도
      refetchOnWindowFocus: false, // 포커스 복귀 시 재요청 비활성
    },
  },
})
```

## 기술 선택 근거

| 기술 | 선택 이유 |
|------|-----------|
| Expo Router | Next.js와 동일한 파일 기반 라우팅 패러다임, 웹→RN 전환 용이 |
| Supabase | Auth + DB + Storage + Edge Functions를 하나로, BaaS 빠른 개발 |
| NativeWind | Tailwind 문법을 RN에서 그대로 사용, 웹 개발자 친화적 |
| React Query | 서버 상태 캐싱/동기화 특화, 낙관적 업데이트 지원 |
| Zustand | 인증처럼 단순한 전역 상태에 적합, 보일러플레이트 최소 |
