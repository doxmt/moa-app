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

**Expo 패키지 설치 시 주의** — `pnpm add`로 직접 설치하면 SDK 버전 무시하고 최신 버전이 들어옴

```bash
# Expo 패키지는 반드시 이 순서로
npx expo install <패키지>   # SDK 호환 버전 확인 후
pnpm add <패키지>@<버전>    # 그 버전으로 설치
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
- `writer` — README & 문서 작성

## 워크플로우 명령어

| 명령어 | 설명 |
|---|---|
| `/start` | 세션 시작 — current_state.md 읽기 → 작업 확인 → git pull → 이슈 생성 → 브랜치 생성 → **코드 작성** (여기서 멈춤) |
| `/submit` | 제출 — 미커밋 변경사항 있으면 최종 커밋 → 푸시 → PR 생성 (base: develop) |
| `/review` | 코드 리뷰 — 현재 PR 변경사항 분석 → 리뷰 결과 반영 → 재커밋 & 재푸시 |
| `/finish` | 마무리 — PR 머지 → develop 브랜치 복귀 → git pull |
| `/wrap` | 세션 종료 — 작업 내용 정리 → current_state.md 업데이트 |

**각 명령어는 독립적으로 동작한다. 사용자가 명시적으로 호출한 명령어만 실행하고, 다음 단계로 자동 진행하지 않는다.**

git 작업(커밋/푸시/PR/머지)은 Codex가 shell로 직접 실행한다.

자세한 이슈/PR 템플릿: `.codex/rules/github.md` 참고

## 디자인 시스템

### 색상 (tailwind.config.js에 등록됨)

| 토큰 | 값 | 용도 |
|---|---|---|
| `moa-text` | `#222222` | 기본 텍스트 |
| `moa-sub` | `#888888` | 보조 텍스트 |
| `moa-placeholder` | `#CCCCCC` | 플레이스홀더, 비활성 |
| `moa-muted` | `#AAAAAA` | 비활성 탭, 힌트 |
| `moa-border` | `#F0F0F0` | 테두리, 구분선 |
| `moa-bg` | `#FAFAFA` | 헤더 배경 |

### 레이아웃

- 좌우 패딩: `px-5` (20px)
- 상하 패딩: `py-4` (16px)
- 카드 border-radius: `rounded-2xl`
- 카드 border: `border border-moa-border`

### 색상 하드코딩 금지

하드코딩 색상(`text-[#222222]` 등) 대신 위 토큰 사용.

## Rules

- `.codex/rules/rn-style.md` — RN 코딩 규칙, 웹→RN 대응 (`app/**`, `src/components/**`)
- `.codex/rules/supabase.md` — Supabase 설정 규칙 (`src/lib/supabase/**`)
- `.codex/rules/github.md` — 이슈/PR 템플릿 & 브랜치 전략
