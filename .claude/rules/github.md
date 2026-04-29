---
# 경로 조건 없음 — 항상 로드
---

# GitHub 워크플로우

## 작업 흐름

1. 이슈 생성 → 번호 확인
2. 이슈 번호로 브랜치 생성
3. 작업 & 커밋
4. PR 생성 (이슈 연결)
5. code-reviewer 호출 → 리뷰 결과 확인
6. 수정 후 커밋 & 푸시
7. 머지

## 이슈 생성

작업 시작 전 이슈를 생성한다:

```bash
gh issue create \
  --title "[feat] 기능명" \
  --body "## 작업 내용\n\n## 목표\n\n## 관련 화면"
```

제목 형식:
- 기능 추가: `[feat] 기능명`
- 버그 수정: `[fix] 버그명`
- 스타일: `[style] 내용`
- 리팩토링: `[refactor] 내용`

## 브랜치 생성

이슈 번호를 브랜치명에 포함:

```bash
git checkout -b feat/{이슈번호}-{기능명}
# 예: feat/1-홈화면
# 예: fix/2-로그인오류
```

## PR 생성

작업 완료 후 PR 생성, 반드시 `develop` 브랜치로:

```bash
gh pr create \
  --title "feat: 기능명" \
  --body "## 변경 사항\n\n## 테스트 방법\n\nCloses #{이슈번호}" \
  --base develop
```

본문에 `Closes #{이슈번호}` 필수 — PR 머지 시 이슈 자동 닫힘

## 코드 리뷰

PR 생성 후 Claude Code 안에서 code-reviewer 에이전트로 리뷰 진행:

- PR 올린 후 "코드리뷰 해줘" 요청
- code-reviewer가 변경된 파일 분석 후 리뷰 결과 출력
- 리뷰 내용 반영 후 수정 커밋 & 푸시
- 이상 없으면 머지
