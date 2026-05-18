# 상태 관리

## 개요

두 가지 상태 관리 도구를 역할에 따라 분리해서 사용한다.

| 도구 | 역할 | 위치 |
|------|------|------|
| **Zustand** | 전역 클라이언트 상태 (인증) | `src/stores/authStore.ts` |
| **React Query** | 서버 상태 캐싱/동기화 | `src/hooks/useXxx.ts` |

---

## Zustand — authStore

### 상태 구조

```typescript
type AuthState = {
  session: Session | null;          // Supabase 세션
  user: User | null;                // 현재 사용자
  initialized: boolean;            // 초기화 완료 여부
  profileComplete: boolean | null; // 프로필 완성 여부 (null = 확인 중)
}
```

### 초기화 패턴

싱글톤 init 패턴으로 중복 초기화를 방지한다.

```typescript
let initPromise: Promise<void> | null = null;

initialize: async () => {
  if (get().initialized) return;
  if (initPromise) return initPromise;   // 중복 호출 방지
  initPromise = (async () => { ... })();
  return initPromise;
}
```

`app/_layout.tsx`의 `AuthGate`에서 컴포넌트 마운트 시 한 번 호출한다.

### Auth 이벤트 처리

`supabase.auth.onAuthStateChange()`로 이후 모든 상태 변화를 구독한다.

| 이벤트 | 처리 |
|--------|------|
| `INITIAL_SESSION` | 무시 (초기화 시 이미 처리) |
| `TOKEN_REFRESHED` | session, user만 업데이트 (profileComplete 유지) |
| `USER_UPDATED` | session, user만 업데이트 (profileComplete 유지) |
| 그 외 (SIGNED_IN 등) | 전체 상태 갱신, profileComplete 재확인 |

### profileComplete 체크

```typescript
// profiles 테이블에서 name 필드로 완성 여부 판단
async function checkProfileComplete(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data?.name;
}
```

`TOKEN_REFRESHED` 같은 조용한 이벤트에서는 profileComplete를 재확인하지 않아 불필요한 DB 쿼리를 방지한다.

---

## React Query

### 설정 (`app/_layout.tsx`)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5분간 캐시 신선 유지
      retry: 1,                    // 실패 시 최대 1회 재시도
      refetchOnWindowFocus: false, // 앱 포커스 복귀 시 재요청 안 함
    },
  },
});
```

### 훅별 쿼리 패턴

각 데이터 훅은 React Query를 통해 Supabase 데이터를 가져온다.

```typescript
// 예시: useCalendarData
const { data, isLoading } = useQuery({
  queryKey: ['calendar', coupleId, year, month],
  queryFn: () => getEventsByMonth(coupleId, year, month),
  enabled: !!coupleId,
});
```

### 낙관적 업데이트

사용자 액션 후 즉각적인 UI 반응을 위해 `onMutate`에서 캐시를 먼저 업데이트한다.

```typescript
useMutation({
  mutationFn: addEvent,
  onMutate: async (newEvent) => {
    await queryClient.cancelQueries({ queryKey: ['calendar', ...] });
    const previous = queryClient.getQueryData(['calendar', ...]);
    queryClient.setQueryData(['calendar', ...], (old) => [...old, newEvent]);
    return { previous };
  },
  onError: (err, newEvent, context) => {
    queryClient.setQueryData(['calendar', ...], context.previous); // 롤백
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['calendar', ...] }); // 서버 동기화
  },
});
```

---

## 두 도구의 경계

**Zustand를 쓰는 경우:**
- 여러 화면에서 동시에 필요한 데이터
- 서버와 동기화할 필요 없이 클라이언트에서만 관리하는 상태
- 현재: 인증 세션 하나만 해당

**React Query를 쓰는 경우:**
- Supabase에서 가져오는 모든 데이터
- 여러 화면에서 공유하더라도 서버 상태면 React Query로 처리

**React Query를 쓰지 않는 경우:**
- 사용자 입력 중인 폼 값 (`useState`)
- 모달 열림/닫힘 상태 (`useState`)
- 애니메이션 값

---

## AuthGate 분기 로직

`app/_layout.tsx`의 `AuthGate` 컴포넌트:

```typescript
useEffect(() => {
  if (!initialized) return;

  const inAuth = segments[0] === '(auth)';

  // 로그인 안 됨
  if (!session) {
    if (!inAuth) router.replace('/(auth)/login');
    return;
  }

  // 프로필 확인 중
  if (profileComplete === null) return;

  // 로그인 됨, 인증 화면에 있음
  if (inAuth) {
    router.replace(profileComplete ? '/(tabs)/home' : '/(onboarding)');
  }
}, [session, initialized, profileComplete, segments]);
```

`profileComplete === null`은 DB 확인 중인 상태이므로, 이 시점에서는 어떤 리다이렉트도 하지 않는다.
