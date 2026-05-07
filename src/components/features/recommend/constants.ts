export type Category = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  genres: string[];
};

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    emoji: '🍽️',
    title: '뭐 먹지',
    subtitle: '메뉴 추천해드려요',
    genres: ['전체', '한식', '중식', '일식', '양식', '아시안', '분식'],
  },
  {
    id: 'activity',
    emoji: '📍',
    title: '뭐 하지',
    subtitle: '할 것 추천해드려요',
    genres: ['전체', '집에서', '실내', '야외'],
  },
  {
    id: 'location',
    emoji: '🚘',
    title: '어디 가지',
    subtitle: '갈 곳 추천해드려요',
    genres: ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '경북', '경남', '전북', '전남', '제주'],
  },
];

export const WHEEL_COLORS = [
  '#FF6B6B',
  '#FF9F43',
  '#FECA57',
  '#48DBFB',
  '#54A0FF',
  '#A29BFE',
  '#FD79A8',
  '#55EFC4',
];

export const SLIP_COLORS = [
  '#FF6B6B',
  '#FF9F43',
  '#FECA57',
  '#48DBFB',
  '#54A0FF',
  '#A29BFE',
  '#FD79A8',
  '#55EFC4',
];

export type SlipItem = { text: string; color: string };

export const LADDER_ROWS = 8;

export function generateLadder(n: number): { bridges: { row: number; col: number }[]; map: number[] } {
  const bridges: { row: number; col: number }[] = [];
  let prevRowCols = new Set<number>();

  for (let row = 0; row < LADDER_ROWS; row++) {
    const usedThisRow = new Set<number>();
    for (let col = 0; col < n - 1; col++) {
      if (usedThisRow.has(col - 1)) continue;   // 같은 행에 인접 bridge 금지
      if (prevRowCols.has(col)) continue;         // 직전 행과 같은 열 금지 (쌓임 방지)
      if (Math.random() > 0.55) continue;
      bridges.push({ row, col });
      usedThisRow.add(col);
    }
    prevRowCols = usedThisRow;
  }

  const map = Array.from({ length: n }, (_, start) => {
    let pos = start;
    for (let row = 0; row < LADDER_ROWS; row++) {
      if (bridges.some((b) => b.row === row && b.col === pos)) pos++;
      else if (bridges.some((b) => b.row === row && b.col === pos - 1)) pos--;
    }
    return pos;
  });
  return { bridges, map };
}
