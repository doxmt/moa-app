# 백엔드 (Supabase)

## 클라이언트 초기화

**파일:** `src/lib/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

Supabase 세션은 `expo-secure-store` 기반 어댑터를 통해 iOS Keychain / Android Keystore에 저장한다.

---

## 환경변수

| 변수 | 설명 |
|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 공개 익명 키 (RLS로 접근 제어) |

`EXPO_PUBLIC_` 접두사를 가진 변수는 클라이언트 번들에 포함된다. 
`.env` 파일은 git에서 제외(`.gitignore`)되어 있다.

---

## DB 스키마 (추정)

코드에서 사용하는 테이블을 역으로 추정한 것이다. 실제 스키마는 Supabase 대시보드에서 확인.

### `profiles`
```sql
profiles (
  id           uuid  PK,
  user_id      uuid  FK → auth.users,
  name         text,           -- 닉네임 (없으면 프로필 미완성)
  avatar_url   text,
  birth_date   date,
  created_at   timestamptz
)
```

### `couples`
```sql
couples (
  id                     uuid  PK,
  user1_id               uuid  FK → auth.users,
  user2_id               uuid  FK → auth.users,
  anniversary_date       date,           -- 기념일
  question_refresh_minutes integer,      -- 질문 갱신 시간 (분 단위, 기본 0=자정)
  created_at             timestamptz
)
```

### `calendar_events`
```sql
calendar_events (
  id           uuid  PK,
  couple_id    uuid  FK → couples,
  title        text,
  color        text,           -- hex 색상
  is_all_day   boolean,
  start_date   date,
  end_date     date,
  start_time   time,
  end_time     time,
  description  text,
  created_by   uuid  FK → auth.users,
  created_at   timestamptz
)
```

### `stories`
```sql
stories (
  id             uuid  PK,
  couple_id      uuid  FK → couples,
  created_by     uuid  FK → auth.users,
  storage_path   text,          -- Supabase Storage 경로
  caption        text,
  created_at     timestamptz
)
```

### `balance_games`
```sql
balance_games (
  id          uuid  PK,
  question    text,
  option_a    text,
  option_b    text,
  day_number  integer,   -- 커플 연결 후 몇 번째 날에 보여줄지
  created_at  timestamptz
)
```

### `game_answers`
```sql
game_answers (
  id              uuid  PK,
  game_id         uuid  FK → balance_games,
  user_id         uuid  FK → auth.users,
  couple_id       uuid  FK → couples,
  selected_option text,   -- 'a' | 'b'
  reason          text,
  created_at      timestamptz
)
```

### `notifications`
```sql
notifications (
  id          uuid  PK,
  user_id     uuid  FK → auth.users,
  type        text,   -- NotificationType 참고
  title       text,
  body        text,
  data        jsonb,
  read        boolean,
  created_at  timestamptz
)
```

### `push_tokens`
```sql
push_tokens (
  id         uuid  PK,
  user_id    uuid  FK → auth.users,
  token      text,
  platform   text,   -- 'ios' | 'android'
  created_at timestamptz
)
```

### `couple_photos`
```sql
couple_photos (
  id           uuid  PK,
  couple_id    uuid  FK → couples,
  storage_path text,
  user_id      uuid  FK → auth.users,
  created_at   timestamptz
)
```

### `recommendations`
```sql
recommendations (
  id       uuid  PK,
  category text,   -- 'food' | 'activity' | 'location'
  genre    text,
  name     text
)
```

---

## API 모듈 (`src/lib/supabase/`)

### `profile.ts`

| 함수 | 설명 |
|------|------|
| `fetchCoupleBasic()` | 현재 사용자의 커플 ID, 닉네임, 파트너 닉네임 조회 |

### `calendar.ts`

| 함수 | 설명 |
|------|------|
| `getEventsByMonth(coupleId, year, month)` | 월별 이벤트 조회 |
| `addEvent(coupleId, data)` | 이벤트 생성 |
| `updateEvent(id, data)` | 이벤트 수정 |
| `deleteEvent(id)` | 이벤트 삭제 |

### `stories.ts`

| 함수 | 설명 |
|------|------|
| `getStories(coupleId, isPremium)` | 스토리 목록 조회, signed URL 포함, 프리미엄 여부로 잠금 처리 |
| `addStory(coupleId, base64, caption)` | Storage 업로드 + DB 저장 |
| `updateCaption(id, caption)` | 캡션 수정 |
| `deleteStory(id, storagePath)` | DB + Storage 동시 삭제 |

### `photo.ts`

| 함수 | 설명 |
|------|------|
| `uploadCouplePhoto(uri, coupleId)` | 사진 업로드 |
| `getLatestPhotoUrl(coupleId)` | 최신 사진 signed URL |
| `deleteOldCouplePhotos(coupleId)` | 최신 1장 제외 삭제 |

### `notifications.ts`

| 함수 | 설명 |
|------|------|
| `fetchNotifications(userId)` | 최근 50개 조회 |
| `markAllAsRead(userId)` | 전체 읽음 처리 |
| `markOneAsRead(id)` | 단건 읽음 처리 |
| `deleteAllNotifications(userId)` | 전체 삭제 |
| `deleteOneNotification(id)` | 단건 삭제 |
| `savePushToken(userId, token, platform)` | 푸시 토큰 저장 |

### `recommendations.ts`

| 함수 | 설명 |
|------|------|
| `getRecommendations(category)` | 카테고리별 추천 항목 |
| `getGenreImages(category)` | 장르별 대표 이미지 URL |

---

## Supabase Storage

| 버킷 | 경로 패턴 | 용도 |
|------|-----------|------|
| `couple-photos` | `{couple_id}/{photoId}.{ext}` | 커플 대표 사진 |
| `couple-photos` | `{couple_id}/stories/{storyId}.{ext}` | 스토리 사진 |

스토리와 대표 사진 모두 **`couple-photos` 단일 버킷**을 사용하며, 경로의 `stories/` 세그먼트로 구분한다.

이미지 접근은 signed URL(60분 유효)로만 한다.

---

## Edge Functions (`supabase/functions/`)

| 함수 | 경로 | 역할 |
|------|------|------|
| `delete-account` | `/delete-account` | 사용자 계정 + 관련 데이터 일괄 삭제 (service_role 필요) |
| `send-notification` | `/send-notification` | Expo Push API로 푸시 알림 발송 |
| `cleanup-couples` | `/cleanup-couples` | 연결 해제된 커플 관련 데이터 정리 (cron 등에서 호출) |

Edge Functions는 Deno 런타임에서 실행. `service_role` 키가 필요한 작업(타 사용자 데이터 삭제 등)은 Edge Function에서만 처리한다.

---

## DB 작업 방법

`.claude/rules/supabase.md` 기준:

- **Supabase MCP 연결 금지** — 모든 DB 변경(테이블, RLS, 트리거, Edge Function)은 SQL을 작성해서 사용자에게 전달
- 사용자가 Supabase 대시보드 SQL Editor에서 직접 실행
- SQL 작성 후 "SQL Editor에서 실행해주세요" 안내 필수
