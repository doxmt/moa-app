# 디자인 시스템

## 색상 토큰

`tailwind.config.js`에 `moa` 네임스페이스로 등록된 6개 토큰.

| 토큰 | 클래스 예시 | 값 | 용도 |
|------|------------|-----|------|
| `moa-text` | `text-moa-text` | `#222222` | 기본 텍스트 |
| `moa-sub` | `text-moa-sub` | `#888888` | 보조 텍스트, 날짜/부제목 |
| `moa-placeholder` | `text-moa-placeholder` | `#CCCCCC` | 플레이스홀더, 비활성 텍스트 |
| `moa-muted` | `text-moa-muted` | `#AAAAAA` | 비활성 탭, 힌트 |
| `moa-border` | `border-moa-border` | `#F0F0F0` | 카드 테두리, 구분선 |
| `moa-bg` | `bg-moa-bg` | `#FAFAFA` | 헤더 배경, 스플래시 배경 |

**규칙:** 하드코딩 색상(`text-[#222222]`) 대신 반드시 위 토큰을 사용한다.

### 이벤트 색상 (캘린더)

사용자가 이벤트에 지정할 수 있는 8가지 색상 (hex 값 직접 사용):

```
#FF6B6B  빨강
#FFA94D  주황
#FFD43B  노랑
#69DB7C  초록
#74C0FC  파랑
#DA77F2  보라
#F783AC  분홍
#A9E34B  라임
```

---

## 레이아웃 규칙

| 규칙 | 값 |
|------|-----|
| 좌우 패딩 | `px-5` (20px) |
| 상하 패딩 | `py-4` (16px) |
| 카드 모서리 | `rounded-2xl` |
| 카드 테두리 | `border border-moa-border` |
| 탭바 높이 | 64px |
| 탭바 아이콘 크기 | 24px |

---

## 공통 UI 컴포넌트

`src/components/ui/`에 위치한 도메인 무관 컴포넌트.

### ConfirmDialog

```typescript
type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;       // 기본: "확인"
  cancelText?: string;        // 기본: "취소"
  destructive?: boolean;      // true이면 확인 버튼 빨강
  onConfirm: () => void;
  onCancel: () => void;
}
```

모달 오버레이 위에 표시. `destructive` 플래그로 위험 액션(삭제 등) 구분.

### LoadingView

```typescript
type Props = {
  message?: string;           // 로딩 중 텍스트
  color?: string;             // ActivityIndicator 색상
}
```

### EmptyState

```typescript
type Props = {
  message: string;            // 빈 상태 안내 문구
}
```

### WheelColumn (기반 컴포넌트)

```typescript
type Props = {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  itemHeight?: number;        // 기본 44px
  visibleCount?: number;      // 기본 5개
}
```

스냅 스크롤 기반 휠 선택기. 아래 3개 컴포넌트가 이를 조합해 사용한다.

### ScrollDatePicker

년/월/일 각각 `WheelColumn`으로 구성. 월에 따라 일 수 동적 조정.

### ScrollTimePicker

시(0-23) / 분(0-59) 두 컬럼.

### DateTimeWheelPicker

날짜 + 시간 통합. 12시간 AM/PM 표시, 분은 5분 단위, ±30일 또는 ±90일 범위.

---

## 레이아웃 컴포넌트

### Header (`src/components/features/layout/Header.tsx`)

상단 고정 헤더. 탭 화면에서 공통으로 사용.

```
[ moa 로고 ]          [ 벨 아이콘 (미읽 배지) ]  [ 설정 아이콘 ]
```

- 벨 아이콘: `unreadCount > 0`이면 빨간 배지 표시
- 벨 클릭 → `NotificationModal` 열림

### TabBar (`src/components/features/layout/TabBar.tsx`)

하단 탭바. 5개 탭.

| 탭 | 아이콘 | 활성 색상 | 비활성 색상 |
|----|--------|----------|------------|
| 홈 | Home (채움/선) | `#222222` | `#AAAAAA` |
| 캘린더 | Calendar | `#222222` | `#AAAAAA` |
| 추천 | Star | `#222222` | `#AAAAAA` |
| 스토리 | Heart | `#222222` | `#AAAAAA` |
| 질문 | MessageCircle | `#222222` | `#AAAAAA` |

---

## NativeWind vs StyleSheet 사용 원칙

`.claude/rules/rn-style.md` 기준:

1. **NativeWind `className` 우선** — 대부분의 스타일은 Tailwind 클래스로 처리
2. **`StyleSheet.create()` 보완** — NativeWind가 지원하지 않는 속성(그림자, transform 일부 등)에만 사용
3. **인라인 스타일 금지** — `style={{ margin: 10 }}` 형태 금지

```tsx
// 올바른 패턴
<View className="px-5 py-4 rounded-2xl border border-moa-border bg-white">
  <Text className="text-moa-text text-base font-medium">{title}</Text>
</View>

// 잘못된 패턴
<View style={{ paddingHorizontal: 20, borderColor: '#F0F0F0' }}>
```

---

## 토스트

`src/hooks/useToast.tsx` — Context 기반.

```typescript
const { showToast } = useToast();
showToast('저장되었습니다.');     // 2.5초 후 자동 사라짐
```

화면 하단 `bottom: 80`(탭바 위)에 고정 표시. 배경색 `rgba(0,0,0,0.75)`.
