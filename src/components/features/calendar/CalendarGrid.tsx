import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DisplayEvent } from '@/hooks/useCalendarData';
import { toDateStr } from '@/utils/date';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  rows: (number | null)[][];
  loading: boolean;
  eventsByDate: Record<string, DisplayEvent[]>;
  selectedDate: string | null;
  todayStr: string;
  userId: string;
  myAvatar: string;
  partnerAvatar: string;
  onDayPress: (date: string) => void;
  year: number;
  month: number;
}

export default function CalendarGrid({
  rows, loading, eventsByDate, selectedDate, todayStr,
  userId, myAvatar, partnerAvatar, onDayPress, year, month,
}: Props) {
  const getIcon = (ev: DisplayEvent) => {
    if (ev.id.startsWith('holiday-')) return '⚪';
    if (ev.id === 'bday-anniversary' || ev.id.startsWith('milestone-')) return '💕';
    if (ev.id === 'bday-my') return myAvatar;
    if (ev.id === 'bday-partner') return partnerAvatar;
    return ev.created_by === userId ? myAvatar : partnerAvatar;
  };

  return (
    <>
      {/* 요일 헤더 */}
      <View className="flex-row mb-1">
        {WEEKDAYS.map((d, i) => (
          <View key={d} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                i === 0 ? styles.sundayText : i === 6 ? styles.saturdayText : styles.weekdayDefault,
              ]}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* 달력 그리드 */}
      {loading ? (
        <View className="items-center justify-center py-6">
          <ActivityIndicator color="#CCCCCC" />
        </View>
      ) : (
        <View className="mb-2">
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} className="flex-row">
              {row.map((day, colIdx) => {
                if (day === null) {
                  return <View key={`e-${rowIdx}-${colIdx}`} style={[styles.cell, styles.dayBtn]} />;
                }

                const dateStr = toDateStr(year, month, day);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayEvents = eventsByDate[dateStr] ?? [];
                const isHoliday = dayEvents.some((e) => e.id.startsWith('holiday-'));
                const isSunday = colIdx === 0;
                const isSaturday = colIdx === 6;

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={styles.dayBtn}
                    onPress={() => onDayPress(dateStr)}
                  >
                    <View style={styles.cell}>
                      <View
                        style={[
                          styles.dayBadge,
                          isSelected ? styles.dayBadgeSelected : isToday ? styles.dayBadgeToday : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected
                              ? styles.dayTextSelected
                              : isToday
                                ? styles.dayTextToday
                                : isHoliday || isSunday
                                  ? styles.sundayText
                                  : isSaturday
                                    ? styles.saturdayText
                                    : styles.dayTextNormal,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                      <View style={styles.eventDots}>
                        {dayEvents.slice(0, 2).map((ev) => (
                          <View key={ev.id} style={[styles.eventChip, { backgroundColor: ev.color }]}>
                            <Text style={styles.eventIcon}>{getIcon(ev)}</Text>
                            <Text style={styles.eventChipText} numberOfLines={1}>{ev.title}</Text>
                          </View>
                        ))}
                        {dayEvents.length > 2 && (
                          <Text style={styles.moreEvents}>+{dayEvents.length - 2}</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  weekdayCell: { flex: 1, alignItems: 'center' },
  weekdayText: { fontSize: 11, fontWeight: '500', paddingBottom: 4 },
  weekdayDefault: { color: '#AAAAAA' },
  sundayText: { color: '#F87171' },
  saturdayText: { color: '#60A5FA' },
  dayBtn: { flex: 1 },
  cell: { minHeight: 56, alignItems: 'center', paddingTop: 4, paddingBottom: 6 },
  dayBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayBadgeSelected: { backgroundColor: '#222222' },
  dayBadgeToday: { borderWidth: 1, borderColor: '#222222' },
  dayText: { fontSize: 13 },
  dayTextNormal: { color: '#222222' },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  dayTextToday: { color: '#222222', fontWeight: '600' },
  eventDots: { width: '100%', paddingHorizontal: 2, gap: 2, marginTop: 2 },
  eventChip: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 3,
    paddingHorizontal: 3, paddingVertical: 1, gap: 2, overflow: 'hidden',
  },
  eventIcon: { fontSize: 7, lineHeight: 9 },
  eventChipText: { fontSize: 8, lineHeight: 11, color: '#FFFFFF', fontWeight: '500', flex: 1 },
  moreEvents: { fontSize: 8, lineHeight: 11, color: '#AAAAAA', paddingHorizontal: 3 },
});
