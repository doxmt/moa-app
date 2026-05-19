---
paths:
  - "app/**/*.{ts,tsx}"
  - "src/components/**/*.{ts,tsx}"
---

# React Native 스타일 규칙

## 코딩 규칙

- 함수형 컴포넌트만 사용 (class 컴포넌트 금지)
- 들여쓰기: 2칸
- 네이밍: 컴포넌트는 PascalCase, 함수/변수는 camelCase
- import 순서: React → React Native → 외부 라이브러리 → 내부 모듈 (`@/`)

## 스타일

- NativeWind className 우선 사용
- NativeWind 미지원 속성(일부 grid, flex 변형 등)은 `StyleSheet.create()` 로 보완
- 인라인 스타일 금지

## 웹→RN 대응

- `div`, `span` 금지 → `View`, `Text` 사용
- `localStorage` 금지 → `AsyncStorage` 사용
- CSS 금지 → NativeWind className 사용
- `next/router` → `expo-router`의 `useRouter`, `<Link>`, `<Redirect>`
- `window`, `document` 사용 금지
