# 프리미엄 기능 1.1 복원 계획

## 배경

1.0 출시는 App Store 첫 심사 통과를 우선한다.
결제 기능은 1.0에 포함하지 않고, 결제/구독/프리미엄으로 보이는 문구도 사용자에게 노출하지 않는다.

현재 스토리 기능에는 프리미엄 정책을 위한 내부 구조가 일부 남아 있다.
다만 UI에서는 유료 기능처럼 보이지 않도록 문구를 숨겨둔 상태다.

## 1.0 정책

- 결제 기능 없음
- 구독 버튼 없음
- 구매 복원 버튼 없음
- 프리미엄/무제한/유료 문구 노출 없음
- 무료 정책 유지
  - 스토리 하루 3장 업로드 제한
  - 7일 이전 스토리 잠금

## 1.1에서 복원할 프리미엄 혜택

- 스토리 무제한 업로드
- 7일 이전 스토리 열람
- 구매 복원
- 구독 상태 동기화

## 결제 구현 후보

1.1 설계 시점에 최종 결정한다.
현재 문서는 RevenueCat을 확정안으로 두지 않고, 후보별 장단점과 선택 기준을 기록한다.

### 후보 A: RevenueCat

RevenueCat SDK와 entitlement를 사용해 프리미엄 상태를 관리한다.
직접 StoreKit 영수증 검증을 구현하지 않아도 된다.

장점:

- 구현 속도가 빠르다.
- 구독 상태, 구매 복원, 갱신, 만료, 환불 이벤트 처리가 쉽다.
- App Store와 Google Play를 나중에 함께 관리하기 좋다.
- 대시보드와 webhook을 제공한다.
- Expo/React Native 사례가 많다.

단점:

- 외부 서비스 의존성이 생긴다.
- 장기적으로 비용, 정책 변경, 데이터 락인을 고려해야 한다.
- RevenueCat 대시보드 설정도 별도로 관리해야 한다.

적합한 경우:

- 1.1에서 빠르게 결제 MVP를 내고 싶다.
- 결제 서버/영수증 검증을 직접 운영할 여력이 적다.
- iOS 이후 Android 구독까지 확장할 가능성이 있다.

권장 entitlement 후보:

```text
premium
```

권장 App Store Connect 상품 ID 후보:

```text
moa_premium_monthly
moa_premium_yearly
```

처음에는 월간 구독 하나만 열어도 된다.

### 후보 B: expo-iap 또는 react-native-iap + 자체 검증

앱에서는 StoreKit/Google Play Billing SDK를 직접 호출하고, Supabase Edge Function에서 영수증 검증과 구독 상태 저장을 처리한다.

장점:

- 결제 상태와 서버 데이터를 직접 통제할 수 있다.
- 외부 결제 관리 서비스 의존성이 낮다.
- Supabase의 `profiles` 또는 `subscriptions` 테이블과 직접 맞물리기 좋다.

단점:

- 구현 범위가 크다.
- 구매, 복원, 갱신, 만료, 환불, 유예 기간, 영수증 재검증을 직접 설계해야 한다.
- App Store Server API 또는 영수증 검증 로직을 안정적으로 운영해야 한다.
- Android까지 확장하면 Google Play Billing 검증도 별도로 필요하다.

적합한 경우:

- 결제 인프라를 장기적으로 직접 소유하고 싶다.
- 구독 상태를 Supabase 기준으로 엄격하게 관리해야 한다.
- 결제 관련 서버 운영 비용을 감수할 수 있다.

### 후보 C: Stripe 등 외부 결제

앱 밖 웹 결제에는 사용할 수 있지만, iOS 앱 내부에서 프리미엄 기능을 해제하는 용도로는 기본 후보에서 제외한다.

이유:

- 앱 안에서 디지털 기능을 유료로 해제하면 Apple In-App Purchase를 사용해야 한다.
- 외부 결제만으로 앱 기능을 여는 구조는 App Store 심사 리스크가 크다.
- 지역별 외부 결제 링크 정책이 달라 운영 복잡도가 커진다.

### 1.1 결정 기준

1.1 구현 시작 전에 아래 기준으로 최종 선택한다.

- 출시 속도가 더 중요한가, 결제 인프라 소유가 더 중요한가
- iOS만 먼저 낼 것인가, Android까지 빠르게 확장할 것인가
- Supabase에 구독 상태를 반드시 서버 기준으로 저장해야 하는가
- 환불/만료/갱신 이벤트를 직접 운영할 수 있는가
- 외부 서비스 비용과 락인을 감수할 수 있는가

현재 기준의 1순위 후보는 RevenueCat이다.
다만 확정은 아니며, 1.1 작업 시작 시 다시 비교한다.

## 필요한 외부 설정

### App Store Connect

- 자동 갱신 구독 그룹 생성
- 구독 상품 생성
- 가격 설정
- 심사용 스크린샷/설명 입력
- 앱 버전 심사 정보에 구독 테스트 방법 작성

### RevenueCat 선택 시

- iOS 앱 생성
- App Store Connect API 연동
- Products 등록
- Entitlement `premium` 생성
- Offering 생성
- Paywall 또는 앱 자체 결제 화면 구성

### 자체 검증 선택 시

- App Store Server API 연동 방식 결정
- Supabase Edge Function에서 영수증 검증 구현
- `subscriptions` 테이블 설계
- 구독 갱신/만료/환불 이벤트 동기화 방식 결정
- 구매 복원 시 서버 상태 재검증

### 환경 변수

RevenueCat 선택 시 `.env.example`에 추가:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_revenuecat_ios_api_key
```

실제 `.env`에도 같은 키를 추가한다.

자체 검증 선택 시 필요한 서버 환경 변수는 별도 설계한다.

## 앱 코드 변경 계획

### 1. SDK 설치

pnpm을 사용한다.

RevenueCat 선택 시:

```bash
pnpm add react-native-purchases
```

자체 검증 선택 시:

```bash
pnpm add expo-iap
```

Expo 개발 빌드/EAS 빌드에서 테스트한다. Expo Go만으로는 실제 결제 플로우 검증이 제한된다.

### 2. 프리미엄 상태 훅 추가

예상 파일:

```text
src/hooks/usePremium.ts
```

역할:

- 결제 SDK 초기화
- customer info 조회
- 프리미엄 활성 여부 확인
- 구매 처리
- 구매 복원 처리

반환값 예시:

```typescript
type PremiumState = {
  isPremium: boolean;
  loading: boolean;
  purchasing: boolean;
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
};
```

### 3. 스토리 데이터 연결

현재 파일:

```text
src/hooks/useStoryData.ts
```

현재 1.0용 고정값:

```typescript
const isPremium = false; // TODO: 결제 시스템 연동 시 교체
```

1.1에서는 이 값을 제거하고 `usePremium()`에서 받은 값을 사용한다.

주의:

- `getStories(couple.coupleId, isPremium)` 호출은 이미 프리미엄 값을 받을 수 있다.
- `uploadLimitReached = !isPremium && todayUploadCount >= FREE_DAILY_LIMIT` 로직도 이미 준비돼 있다.

### 4. 업로드 제한 서버 로직 확인

현재 파일:

```text
src/lib/supabase/stories.ts
```

현재 `addStory()`는 항상 무료 제한을 적용한다.

```typescript
if ((count ?? 0) >= FREE_DAILY_LIMIT) throw new Error('DAILY_LIMIT_EXCEEDED');
```

1.1에서는 이 제한도 프리미엄 상태에 따라 우회해야 한다.

선택지:

- 클라이언트에서 `addStory(coupleId, uri, caption, isPremium)` 형태로 전달
- Supabase `profiles` 또는 별도 `subscriptions` 테이블에 premium 상태 저장 후 서버/RLS 기준으로 제한

권장 방향:

- RevenueCat 선택 시: RevenueCat webhook으로 Supabase에 구독 상태를 동기화하고, DB 기준으로 제한을 판단한다.
- 자체 검증 선택 시: Supabase Edge Function에서 검증한 `subscriptions` 테이블 기준으로 제한을 판단한다.

다만 1.1 MVP에서는 클라이언트의 결제 SDK 상태로 먼저 시작할 수 있다.

### 5. 숨겨둔 UI 문구 복원

#### `app/(tabs)/story.tsx`

1.0에서 숨긴 문구:

```typescript
{todayUploadCount}/{dailyLimit}
```

1.1에서 복원할 문구:

```typescript
{isPremium ? '무제한' : `${todayUploadCount}/${dailyLimit}`}
```

1.0에서 바꾼 잠금 토스트:

```typescript
showToast('7일 이전 기록은 현재 볼 수 없어요');
```

1.1에서 복원할 문구:

```typescript
showToast('7일 이전 기록은 프리미엄 이용자만 볼 수 있어요');
```

#### `src/components/features/story/StoryUploadModal.tsx`

1.0에서 숨긴 문구:

```typescript
{subtitle ?? `오늘 ${todayUploadCount}/${dailyLimit}장`}
```

1.1에서 복원할 문구:

```typescript
{subtitle ?? (isPremium ? '무제한 업로드' : `오늘 ${todayUploadCount}/${dailyLimit}장`)}
```

1.0에서 제거한 prop:

```typescript
isPremium: boolean;
```

1.1에서 다시 추가한다.

1.0에서 바꾼 남은 장수 표시:

```typescript
{showRemaining && <Text className="text-xs text-moa-sub text-center">{remaining}장 남음</Text>}
```

1.1에서 복원할 조건:

```typescript
{showRemaining && !isPremium && <Text className="text-xs text-moa-sub text-center">{remaining}장 남음</Text>}
```

#### `src/components/features/story/StoryViewer.tsx`

스토리 수정 모달에서 1.0에 제거한 prop:

```typescript
isPremium
```

`StoryUploadModal`에 `isPremium` prop을 다시 추가하면 이 위치도 함께 복원한다.

## 추가할 화면

예상 파일:

```text
app/settings/premium.tsx
```

설정 화면에 추가:

```text
모아 프리미엄
```

화면 구성:

- 혜택
  - 스토리 무제한 업로드
  - 지난 스토리 모두 보기
- 구독 버튼
- 구매 복원 버튼
- 약관/개인정보 처리방침 링크

## App Store 심사 주의사항

- 앱 안에서 디지털 기능을 유료로 해제하면 Apple In-App Purchase를 사용해야 한다.
- 외부 결제 링크나 Stripe 결제만으로 프리미엄을 해제하면 심사 리스크가 크다.
- 구독 화면에는 가격, 기간, 자동 갱신 여부, 해지 방법을 명확히 보여줘야 한다.
- 구매 복원 버튼을 제공해야 한다.

## 출시 순서

1. `1.0.0`: 결제 없이 출시
2. 실사용 QA 및 핵심 기능 안정화
3. RevenueCat과 자체 검증 방식을 비교해 결제 방식 확정
4. `1.1.0`: 프리미엄 기능 구현
5. 샌드박스 계정으로 구매/복원 테스트
6. EAS production build
7. App Store 재심사 제출
