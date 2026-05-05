---
paths:
  - "src/lib/supabase/**/*.{ts,tsx}"
---

# Supabase 규칙

- 클라이언트 초기화 시 `expo-secure-store` 기반 `secureStorage` 어댑터를 storage로 전달 (iOS Keychain / Android Keystore에 저장)
- 환경변수: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- 이미지 업로드 시 `expo-image-picker` 또는 `expo-file-system` 사용

## DB 작업 방식

- **Supabase MCP 연결 금지** — DB 변경(테이블 생성, RLS, 트리거, Edge Function 등)은 SQL을 작성해서 사용자에게 전달하고, 사용자가 Supabase 대시보드 SQL Editor에서 직접 실행한다
- SQL 작성 후 "SQL Editor에서 실행해주세요" 안내 필수
