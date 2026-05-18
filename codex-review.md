# Codex Adversarial Review

- **실행일:** 2026-05-13
- **대상:** 전체 프로젝트 (working tree)
- **Verdict:** needs-attention

---

## 🔴 High

### 1. `balance_games` / `game_answers` 스키마 오류
**위치:** `docs/backend.md:99-120` (→ 수정 완료)

- `balance_games` 테이블에 `day_number` 컬럼 누락 — 앱은 이 컬럼으로 오늘의 질문을 선택함
- `game_answers.picked` 으로 문서화했지만 실제 코드는 `selected_option` 컬럼을 읽고 씀 (값도 `'a'|'b'` 소문자)
- 이 문서를 기준으로 DB 설정/마이그레이션/RLS를 만들면 질문 화면과 답변 저장이 실패함

**수정:** `day_number integer` 추가, `picked` → `selected_option text` 변경

---

### 2. `couple_photos` 스키마 컬럼명 오류
**위치:** `docs/backend.md:148-156` (→ 수정 완료)

- 문서에 `uploaded_by` 컬럼으로 정의했으나 `uploadCouplePhoto()`는 `user_id`를 insert함
- 이 문서로 테이블/RLS 생성 시 사진 업로드 실패 또는 소유권 체크 오류

**수정:** `uploaded_by` → `user_id`

---

## 🟡 Medium

### 3. 스토리 Storage 버킷 이름 오류
**위치:** `docs/backend.md:225-230` (→ 수정 완료)

- 문서에 `stories` 버킷이라고 썼으나 실제 `getStories()` / `addStory()` / `deleteStory()` 모두 `couple-photos` 버킷의 `{couple_id}/stories/` 경로를 사용
- 스토리지 정책/정리 스크립트를 이 문서 기준으로 만들면 잘못된 버킷을 건드림

**수정:** `couple-photos` 단일 버킷 + 경로 구조로 문서 재작성

---

## 조치 결과

| 이슈 | 상태 |
|------|------|
| `balance_games.day_number` 누락 | ✅ 수정 완료 |
| `game_answers.picked` → `selected_option` | ✅ 수정 완료 |
| `couple_photos.uploaded_by` → `user_id` | ✅ 수정 완료 |
| Storage 버킷 `stories` → `couple-photos` | ✅ 수정 완료 |
