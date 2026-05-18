# 기능 명세

각 기능을 `화면 → 컴포넌트 → 훅 → API` 순으로 정리한다.

---

## 홈

**화면:** `app/(tabs)/home.tsx`

커플의 현재 상태를 한 눈에 보여주는 메인 화면. D-Day, 최근 사진, 오늘의 밸런스 게임을 표시한다.

### 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| `BalanceGameCard` | `src/components/features/home/BalanceGameCard.tsx` | 오늘의 질문과 A/B 선택지, 본인/파트너 선택 결과 표시 |
| `PolaroidCard` | `src/components/features/home/PolaroidCard.tsx` | 최신 커플 사진을 폴라로이드 스타일로 표시 |

### 훅

**`useHomeData`** (`src/hooks/useHomeData.ts`)

```typescript
{
  // 데이터
  myNickname, partnerNickname, coupleId, dDay, latestPhotoUrl, balanceGame,
  // 로딩
  isLoading,
  // 액션
  submitAnswer(option: 'A' | 'B'): void   // 밸런스 게임 선택
  uploadPhoto(uri: string): Promise<void>  // 커플 사진 업로드
}
```

### API
- `src/lib/supabase/profile.ts` — `fetchCoupleBasic()` 커플 정보
- `src/lib/supabase/photo.ts` — `uploadCouplePhoto()`, `getLatestPhotoUrl()`

---

## 캘린더

**화면:** `app/(tabs)/calendar.tsx`

월별 달력으로 이벤트와 기념일을 관리한다. 생일/기념일에서 마일스톤이 자동 생성된다.

### 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| `CalendarGrid` | `src/components/features/calendar/CalendarGrid.tsx` | 월별 그리드, 이벤트 아이콘/아바타 표시 |
| `EventForm` | `src/components/features/calendar/EventForm.tsx` | 이벤트 생성/수정 모달, 색상/날짜/시간 선택 |
| `MilestoneList` | `src/components/features/calendar/MilestoneList.tsx` | 기념일, 생일 등 마일스톤 목록 |

### 훅

**`useCalendarData`** (`src/hooks/useCalendarData.ts`)

```typescript
{
  // 상태
  year, month, eventsByDate, milestones,
  myNickname, partnerNickname, myAvatar, partnerAvatar,
  // 월 이동
  goToPrevMonth(), goToNextMonth(),
  // 이벤트 CRUD
  createEvent(data), editEvent(id, data), removeEvent(id),
}
```

**자동 생성 이벤트:**
- 두 사람의 생일 (매년 반복)
- 기념일 (매년 반복)
- 마일스톤: 100일, 200일, 1주년, 2주년, 3주년 (기념일 기준 자동 계산)
- 한국 공휴일 (`src/utils/holidays.ts`)

### API
- `src/lib/supabase/calendar.ts` — `getEventsByMonth()`, `addEvent()`, `updateEvent()`, `deleteEvent()`

### 이벤트 타입

```typescript
type CalendarEvent = {
  id: string;
  couple_id: string;
  title: string;
  color: string;           // 8가지 색상 중 선택
  is_all_day: boolean;
  start_date: string;      // "YYYY-MM-DD"
  end_date: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  created_by: string;
  created_at: string;
}
```

---

## 스토리

**화면:** `app/(tabs)/story.tsx`

커플이 사진을 업로드하고 갤러리 형태로 감상하는 기능. 무료 사용자는 일일 3장 제한, 7일 이후 잠금.

### 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| `StoryViewer` | `src/components/features/story/StoryViewer.tsx` | 모달 기반 풀스크린 뷰어, 좌우 스와이프 |
| `StoryUploadModal` | `src/components/features/story/StoryUploadModal.tsx` | 사진 선택 + 캡션 입력 |

**StoryViewer 상세:**
- 내 스토리: 캡션 수정, 삭제 가능
- 파트너 스토리: 갤러리 저장 가능
- 잠긴 스토리(7일 초과): 흐리게 처리, 자물쇠 아이콘

### 훅

**`useStoryData`** (`src/hooks/useStoryData.ts`)

```typescript
{
  stories: Story[],
  isLoading,
  dailyCount: number,            // 오늘 업로드한 장 수
  FREE_DAILY_LIMIT: 3,           // 무료 일일 한도
  uploadStory(uri, caption),
  editCaption(id, caption),
  removeStory(id),
}
```

### API
- `src/lib/supabase/stories.ts` — `getStories()`, `addStory()`, `updateCaption()`, `deleteStory()`

### 스토리 타입

```typescript
type Story = {
  id: string;
  couple_id: string;
  created_by: string;
  storage_path: string;
  caption?: string;
  created_at: string;
  signed_url: string;   // 60분 유효 서명 URL
  locked: boolean;      // 7일 초과 여부
}
```

---

## 오늘의 질문

**화면:** `app/(tabs)/question.tsx`

밸런스 게임 형태의 일일 질문. 커플이 시작한 날로부터 몇 번째 날인지 계산해 질문을 선택한다.

### 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| `QuestionCard` | `src/components/features/question/QuestionCard.tsx` | 질문, A/B 선택지, 선택 이유 입력, 파트너 답변 표시 |

**QuestionCard 상태:**
- 미답변: 선택지만 표시, 파트너 답변 숨김
- 선택 후: 내 선택 강조, 파트너 답변 공개
- 이유 작성: 인라인 텍스트 입력

### 훅

**`useQuestionData`** (`src/hooks/useQuestionData.ts`)

```typescript
{
  games: GameItem[],    // 오늘 것 첫 번째, 이후 역순
  isLoading,
  submitAnswer(gameId, option: 'A' | 'B'),
  saveReason(gameId, reason: string),
}

type GameItem = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  myPicked?: 'A' | 'B';
  myReason?: string;
  partnerPicked?: 'A' | 'B';    // myPicked 없으면 null
  partnerReason?: string;
  isToday: boolean;
}
```

**규칙:** 내가 먼저 답하기 전까지 파트너 답변은 노출되지 않는다.

---

## 추천 게임

**화면:** `app/(tabs)/recommend.tsx`

4가지 미니게임으로 커플이 함께 결정하기 어려운 것들을 재미있게 정한다.

### 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| `RoulettePage` | `src/components/features/recommend/RoulettePage.tsx` | SVG 회전 룰렛 (뭐 먹지/뭐 하지/어디 가지) |
| `LadderPage` | `src/components/features/recommend/LadderPage.tsx` | 사다리 게임 |
| `DrawPage` | `src/components/features/recommend/DrawPage.tsx` | 복권식 뽑기 |
| `DetailPage` | `src/components/features/recommend/DetailPage.tsx` | 카테고리별 추천 상세 검색 |
| `constants.ts` | `src/components/features/recommend/constants.ts` | 카테고리/장르 데이터, 사다리 알고리즘 |

**카테고리:**
- 음식 (`food`) — 장르: 한식, 일식, 중식, 양식, 분식, 카페
- 액티비티 (`activity`) — 장르: 영화, 보드게임, 운동, 드라이브
- 장소 (`location`) — 장르: 카페, 공원, 쇼핑몰, 테마파크

### API
- `src/lib/supabase/recommendations.ts` — `getRecommendations(category)`, `getGenreImages(category)`

---

## 알림

**화면:** 헤더 벨 아이콘 → 슬라이드 모달

### 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| `NotificationModal` | `src/components/features/notification/NotificationModal.tsx` | 알림 목록, 일괄 읽음, 일괄 삭제 |

### 훅

**`useNotificationData`** (`src/hooks/useNotificationData.ts`)
- 30초 간격 자동 갱신
- `unreadCount` 계산 → 헤더 배지 표시

**`useNotificationSetup`** (`src/hooks/useNotificationSetup.ts`)
- Expo Push Token 등록 → Supabase에 저장
- 로컬 알림 스케줄:
  - 매일 21:00 — "오늘의 질문" 리마인더
  - 기념일 7일 전, 1일 전, 당일
  - 파트너 생일 7일 전, 1일 전, 당일

### 알림 타입

```typescript
type NotificationType =
  | 'new_question'
  | 'partner_answer'
  | 'partner_reason'
  | 'story'
  | 'anniversary'
  | 'birthday'
  | 'question_reminder'
```

---

## 인증 / 온보딩 / 설정

### 로그인 (`app/(auth)/login.tsx`)
Supabase 이메일/비밀번호 인증. 회원가입도 같은 화면에서 처리.

### 온보딩 (`app/(onboarding)/index.tsx`)
최초 로그인 후 1회. 닉네임, 생일, 프로필 사진 등 프로필 정보 입력.

### 설정 (`app/settings/`)

| 화면 | 경로 | 기능 |
|------|------|------|
| 설정 메인 | `settings/index.tsx` | 하위 설정 목록 |
| 프로필 편집 | `settings/profile.tsx` | 닉네임, 생일, 아바타 변경 |
| 계정 관리 | `settings/account.tsx` | 비밀번호 변경, 로그아웃 |
| 커플 연결 | `settings/couple.tsx` | QR 코드로 커플 초대 |
| 연결 상태 | `settings/connect.tsx` | 현재 커플 연결 정보 |
| 캘린더 설정 | `settings/calendar.tsx` | 기념일 날짜 변경 |
| 질문 시간 | `settings/question-hour.tsx` | 질문 갱신 시간 설정 |
| 개인정보처리방침 | `settings/privacy.tsx` | 정책 텍스트 |
| 이용약관 | `settings/terms.tsx` | 약관 텍스트 |
| 계정 삭제 | `settings/delete-account.tsx` | 탈퇴 (Edge Function 호출) |
