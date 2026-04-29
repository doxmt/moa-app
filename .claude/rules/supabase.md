---
paths:
  - "src/lib/supabase/**/*.{ts,tsx}"
---

# Supabase 규칙

- 클라이언트 초기화 시 `AsyncStorage`를 storage로 전달 필수
- 환경변수: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- 이미지 업로드 시 `expo-image-picker` 또는 `expo-file-system` 사용
