# 개선 사항

코드베이스 전체 탐색에서 발견된 문제점과 개선 필요 항목을 심각도별로 정리한다.

---

## 🔴 고우선순위

현재 고우선순위 항목은 코드 또는 설정에 반영 완료됐다. 아래 내용은 변경 배경과 확인 기준으로 남긴다.

### 1. AsyncStorage → expo-secure-store 교체 — 완료

**파일:** `src/lib/supabase/client.ts`

**문제:** 기존 Supabase 클라이언트가 `AsyncStorage`로 세션을 저장했다. `AsyncStorage`는 암호화되지 않아 iOS Keychain / Android Keystore 수준의 보안을 제공하지 않는다.

**규칙:** `.claude/rules/supabase.md`에서 `expo-secure-store` 기반 storage 어댑터를 명시적으로 요구한다.

**반영 내용:**
```typescript
import * as SecureStore from 'expo-secure-store';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
auth: { storage: secureStorage }
```

---

### 2. `eas.json` 없음 — iOS 출시 불가 — 완료

**문제:** 앱의 1차 목표가 "iOS 앱스토어 출시"인데, EAS Build에 필수인 `eas.json` 파일이 없었다.

**반영 내용:**
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

이후 `eas build --platform ios --profile production` 으로 빌드.

---

## 🟡 중우선순위

### 3. `src/types/` 폴더 비어있음

**문제:** `src/types/` 폴더가 존재하지만 비어있다. 현재 모든 타입이 각 파일에 로컬로 정의돼 있어, 여러 모듈에서 같은 타입을 쓸 때 중복 정의가 발생하거나 불일치가 생길 수 있다.

**영향 있는 타입들:**
- `CalendarEvent` — `src/lib/supabase/calendar.ts`에 정의
- `Story` — `src/lib/supabase/stories.ts`에 정의
- `AppNotification`, `NotificationType` — `src/lib/supabase/notifications.ts`에 정의
- `GameItem`, `HomeData` — 각 훅 파일에 정의

**수정 방향:** 여러 파일에서 import하는 타입만 `src/types/index.ts` 또는 도메인별 파일(`src/types/calendar.ts` 등)로 이동.

---

### 4. 프리미엄 결제 시스템 미구현

**파일:** `src/hooks/useStoryData.ts`

**문제:**
```typescript
const isPremium = false; // TODO: 결제 시스템 연동
```

스토리 7일 잠금 기능과 일일 3장 제한이 `isPremium` 플래그에 따라 동작하도록 코드가 작성돼 있으나, 실제 결제 시스템과 연동되지 않았다.

**수정 방향:** RevenueCat, Expo IAP 등 인앱결제 라이브러리 연동 또는 Supabase `profiles` 테이블에 `is_premium` 컬럼 추가 후 서버에서 관리.

---

### 5. 공통 에러 핸들링 패턴 없음

**문제:** 각 훅과 API 함수에서 `try-catch` 패턴이 제각각이다. 일부는 에러를 `console.warn`으로만 처리하고, 일부는 토스트를 직접 호출하고, 일부는 에러를 무시한다.

**수정 방향:** 공통 에러 핸들러 유틸 함수 작성 또는 React Query의 `onError` 콜백을 전역 QueryClient 레벨에서 처리.

```typescript
// 예시: QueryClient에 전역 에러 핸들러
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        showToast(getErrorMessage(error));
      },
    },
  },
});
```

---

### 6. `app.json`과 `package.json` 버전 불일치

**상태:** 완료

`app.json`과 `package.json` 모두 `"version": "1.0.0"`으로 통일했다.

두 버전이 다르면 EAS Build 시 혼란이 생길 수 있으므로 앱스토어 출시 기준 버전으로 맞췄다.

---

## 🟢 개선 제안

### 7. 기본 UI 컴포넌트 부재

**현황:** `src/components/ui/`에 날짜/시간 선택기, 다이얼로그, 로딩/빈 상태 컴포넌트만 있다. `Button`, `Input`, `Card` 같은 기본 컴포넌트가 없어, 각 화면에서 같은 스타일의 버튼/입력 필드를 반복 구현한다.

**제안:** 앱 전반에서 반복되는 패턴을 추출해 공통 컴포넌트로 만든다.
- `Button` — primary / secondary / destructive 변형
- `TextInput` — 기본 스타일 포함
- `Card` — 카드 컨테이너

---

### 8. 테스트 코드 없음

**현황:** 테스트 파일이 하나도 없다.

**제안:** 최소한 핵심 유틸 함수부터 시작.
- `src/utils/date.ts` — `toDateStr`, `formatTime` 등 순수 함수
- `src/utils/questionDay.ts` — `getTodayDayNumber` 날짜 계산 로직
- `src/utils/holidays.ts` — 공휴일 데이터

---

### 9. 알림 폴링 방식

**현황:** `useNotificationData`가 30초 간격으로 알림을 폴링한다.

**제안:** Supabase Realtime을 이용한 구독 방식으로 교체하면 실시간성이 개선되고 불필요한 요청이 줄어든다.

```typescript
// 폴링 대신 Realtime 구독
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  })
  .subscribe();
```

---

### 10. 날짜 유틸 외 공통 유틸 부족

**현황:** `src/utils/`에 날짜 관련 유틸만 있다.

**제안:** 필요한 경우에만 추가:
- 숫자 포맷 (`1000` → `1,000`)
- 파일 크기 포맷
- 문자열 자르기 (말줄임표)
