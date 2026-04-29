# moa-app

## 목표

1차 목표: iOS 앱스토어 출시 (Apple Developer 계정 등록 후 EAS Build로 빌드)

## 앱 소개

moa는 커플을 위한 React Native 앱입니다.
연인과 일상을 기록하고 공유할 수 있는 커플 전용 플랫폼으로,
기존 웹 서비스(Next.js)를 모바일 앱으로 전환한 프로젝트입니다.

## 기술 스택

- **Expo SDK 53** + React 19 + React Native 0.79
- **Expo Router v5** — 파일 기반 라우팅
- **Supabase** — 인증, DB, 스토리지
- **NativeWind v4** — Tailwind CSS 기반 스타일링
- **Zustand** — 상태관리
- **TypeScript**

## 프로젝트 구조

```
app/                    # Expo Router 라우팅
├── _layout.tsx
├── index.tsx           # 진입점 (홈으로 리다이렉트)
├── auth/               # 로그인, 인증
├── onboarding/         # 온보딩
├── tabs/               # 하단 탭 (홈, 캘린더, 질문, 추천, 스토리)
└── settings/           # 설정 화면들

src/
├── components/features/  # 기능 컴포넌트
├── components/ui/        # 공통 UI 컴포넌트
├── hooks/                # 커스텀 훅
├── lib/supabase/         # Supabase 클라이언트 & 모듈
├── stores/               # Zustand 스토어
├── types/                # TypeScript 타입
└── utils/                # 유틸리티 함수
```

## 패키지 매니저

**pnpm 사용** — npm, yarn 사용 금지

```bash
pnpm install          # 패키지 설치
pnpm add <패키지>     # 패키지 추가
pnpm remove <패키지>  # 패키지 제거
```

## 빌드 & 실행

```bash
pnpm start            # Expo 개발 서버 (Expo Go로 테스트)
pnpm run ios          # iOS 시뮬레이터
pnpm run android      # Android 에뮬레이터
pnpm run lint         # 린트
```

## 에이전트

- `architect` — 구조 설계 & 기술 결정 분석
- `planner` — 작업 계획 수립
- `debugger` — 버그 & 빌드 오류 해결
- `code-reviewer` — 코드 품질 리뷰
- `qa-tester` — QA 테스트
- `git-master` — 커밋 & 브랜치 관리
- `writer` — README & 문서 작성

## 워크플로우

- 작업 시작 전: GitHub 이슈 생성
- 이슈 번호로 브랜치 생성 (`feat/{번호}-{기능명}`)
- 작업 완료 후: PR 생성 (`develop` 브랜치로, 이슈 연결)
- 자세한 템플릿: `.claude/rules/github.md` 참고

## Rules

- `rn-style.md` — RN 코딩 규칙, 웹→RN 대응 (`app/**`, `src/components/**`)
- `supabase.md` — Supabase 설정 규칙 (`src/lib/supabase/**`)
- `github.md` — 이슈/PR 템플릿 & 브랜치 전략
