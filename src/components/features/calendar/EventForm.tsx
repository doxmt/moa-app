import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScrollDatePicker from '@/components/ui/ScrollDatePicker';
import DateTimeWheelPicker, { DateTimeVal } from '@/components/ui/DateTimeWheelPicker';
import { toDateStr } from '@/utils/date';

const COLORS = ['#222222', '#FF6B6B', '#FF9F43', '#FECA57', '#1DD1A1', '#54A0FF', '#A29BFE', '#FD79A8'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type DateVal = { year: number; month: number; day: number };

export type EventData = {
  title: string;
  color: string;
  isAllDay: boolean;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  description?: string;
};

function dateValToStr(d: DateVal) {
  return toDateStr(d.year, d.month, d.day);
}

function strToDateVal(s: string): DateVal {
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
}

function formatDateTimeDisplay(dt: DateTimeVal): string {
  const d = new Date(`${dt.date}T00:00:00`);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = WEEKDAYS[d.getDay()];
  const ampm = dt.hour < 12 ? '오전' : '오후';
  const h12 = dt.hour === 0 ? 12 : dt.hour > 12 ? dt.hour - 12 : dt.hour;
  const min = String(dt.minute).padStart(2, '0');
  return `${m}월 ${day}일 ${wd} ${ampm} ${h12}:${min}`;
}

function formatDateOnlyDisplay(dv: DateVal): string {
  return `${dv.year}년 ${dv.month}월 ${dv.day}일`;
}

interface Props {
  visible: boolean;
  initialDate: string;
  submitting: boolean;
  initialData?: EventData;
  onClose: () => void;
  onSubmit: (data: EventData) => Promise<void>;
}

export default function EventForm({ visible, initialDate, submitting, initialData, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const today = new Date();

  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDateTime, setStartDateTime] = useState<DateTimeVal>({ date: initialDate, hour: 9, minute: 0 });
  const [endDateTime, setEndDateTime] = useState<DateTimeVal>({ date: initialDate, hour: 10, minute: 0 });
  const [startDateOnly, setStartDateOnly] = useState<DateVal>(strToDateVal(initialDate));
  const [endDateOnly, setEndDateOnly] = useState<DateVal>(strToDateVal(initialDate));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [description, setDescription] = useState('');

  const reset = () => {
    if (initialData) {
      setTitle(initialData.title);
      setColor(initialData.color);
      setIsAllDay(initialData.isAllDay);
      if (initialData.isAllDay) {
        setStartDateOnly(strToDateVal(initialData.startDate));
        setEndDateOnly(strToDateVal(initialData.endDate));
      } else {
        const [sh, sm] = (initialData.startTime ?? '09:00').split(':').map(Number);
        const [eh, em] = (initialData.endTime ?? '10:00').split(':').map(Number);
        setStartDateTime({ date: initialData.startDate, hour: sh, minute: sm });
        setEndDateTime({ date: initialData.endDate, hour: eh, minute: em });
      }
      setDescription(initialData.description ?? '');
    } else {
      const dv = strToDateVal(initialDate);
      setTitle('');
      setColor(COLORS[0]);
      setIsAllDay(false);
      setStartDateTime({ date: initialDate, hour: 9, minute: 0 });
      setEndDateTime({ date: initialDate, hour: 10, minute: 0 });
      setStartDateOnly(dv);
      setEndDateOnly(dv);
      setDescription('');
    }
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  useEffect(() => {
    if (visible) reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialDate]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      color,
      isAllDay,
      startDate: isAllDay ? dateValToStr(startDateOnly) : startDateTime.date,
      endDate: isAllDay ? dateValToStr(endDateOnly) : endDateTime.date,
      startTime: isAllDay ? undefined : `${String(startDateTime.hour).padStart(2, '0')}:${String(startDateTime.minute).padStart(2, '0')}`,
      endTime: isAllDay ? undefined : `${String(endDateTime.hour).padStart(2, '0')}:${String(endDateTime.minute).padStart(2, '0')}`,
      description: description.trim() || undefined,
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents={submitting ? 'none' : 'auto'}
      >
        {/* 상단바 */}
        <View style={[styles.navBar, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={handleClose} style={styles.navBtn}>
            <Text style={styles.navCancel}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>{initialData ? '일정 수정' : '일정 추가'}</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !title.trim()}
            style={styles.navBtn}
          >
            <Text style={[styles.navSave, (submitting || !title.trim()) && styles.navSaveDisabled]}>
              {submitting ? '저장 중' : initialData ? '수정' : '저장'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        >
          {/* 제목 */}
          <View style={styles.section}>
            <TextInput
              placeholder="일정 제목"
              placeholderTextColor="#CCCCCC"
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
            />
          </View>

          {/* 색상 */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>색상</Text>
              <View style={styles.colorRow}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                  >
                    {color === c && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* 시작 / 종료 / 하루종일 */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => { setShowStartPicker((v) => !v); setShowEndPicker(false); }}
            >
              <Text style={styles.rowLabel}>시작</Text>
              <Text style={styles.rowValue}>
                {isAllDay ? formatDateOnlyDisplay(startDateOnly) : formatDateTimeDisplay(startDateTime)}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <View style={styles.pickerBox}>
                {isAllDay ? (
                  <ScrollDatePicker
                    value={startDateOnly}
                    onChange={(v) => {
                      setStartDateOnly(v);
                      if (dateValToStr(v) > dateValToStr(endDateOnly)) setEndDateOnly(v);
                    }}
                    minYear={2020}
                    maxYear={today.getFullYear() + 5}
                  />
                ) : (
                  <DateTimeWheelPicker
                    value={startDateTime}
                    onChange={(v) => {
                      setStartDateTime(v);
                      const startMs = new Date(`${v.date}T${String(v.hour).padStart(2, '0')}:${String(v.minute).padStart(2, '0')}`).getTime();
                      const endMs = new Date(`${endDateTime.date}T${String(endDateTime.hour).padStart(2, '0')}:${String(endDateTime.minute).padStart(2, '0')}`).getTime();
                      if (endMs <= startMs) {
                        const newEnd = new Date(startMs + 60 * 60 * 1000);
                        setEndDateTime({
                          date: newEnd.toISOString().slice(0, 10),
                          hour: newEnd.getHours(),
                          minute: Math.round(newEnd.getMinutes() / 5) * 5 % 60,
                        });
                      }
                    }}
                    baseDate={initialDate}
                  />
                )}
              </View>
            )}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={() => { setShowEndPicker((v) => !v); setShowStartPicker(false); }}
            >
              <Text style={styles.rowLabel}>종료</Text>
              <Text style={styles.rowValue}>
                {isAllDay ? formatDateOnlyDisplay(endDateOnly) : formatDateTimeDisplay(endDateTime)}
              </Text>
            </TouchableOpacity>
            {showEndPicker && (
              <View style={styles.pickerBox}>
                {isAllDay ? (
                  <ScrollDatePicker
                    value={endDateOnly}
                    onChange={(v) => {
                      if (dateValToStr(v) < dateValToStr(startDateOnly)) setEndDateOnly(startDateOnly);
                      else setEndDateOnly(v);
                    }}
                    minYear={2020}
                    maxYear={today.getFullYear() + 5}
                  />
                ) : (
                  <DateTimeWheelPicker
                    value={endDateTime}
                    onChange={(v) => {
                      const endMs = new Date(`${v.date}T${String(v.hour).padStart(2, '0')}:${String(v.minute).padStart(2, '0')}`).getTime();
                      const startMs = new Date(`${startDateTime.date}T${String(startDateTime.hour).padStart(2, '0')}:${String(startDateTime.minute).padStart(2, '0')}`).getTime();
                      if (endMs <= startMs) {
                        const adjusted = new Date(startMs + 60 * 60 * 1000);
                        setEndDateTime({
                          date: adjusted.toISOString().slice(0, 10),
                          hour: adjusted.getHours(),
                          minute: Math.round(adjusted.getMinutes() / 5) * 5 % 60,
                        });
                      } else {
                        setEndDateTime(v);
                      }
                    }}
                    baseDate={initialDate}
                  />
                )}
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>하루종일</Text>
              <Switch
                value={isAllDay}
                onValueChange={(v) => {
                  setIsAllDay(v);
                  setShowStartPicker(false);
                  setShowEndPicker(false);
                }}
                trackColor={{ false: '#E0E0E0', true: '#222222' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* 메모 */}
          <View style={styles.section}>
            <TextInput
              placeholder="메모"
              placeholderTextColor="#CCCCCC"
              value={description}
              onChangeText={setDescription}
              style={styles.memoInput}
              multiline
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  navBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C8C8C8',
  },
  navBtn: { minWidth: 56, paddingVertical: 8 },
  navTitle: { fontSize: 17, fontWeight: '600', color: '#222222' },
  navCancel: { fontSize: 16, color: '#888888' },
  navSave: { fontSize: 16, fontWeight: '600', color: '#222222', textAlign: 'right' },
  navSaveDisabled: { opacity: 0.3 },
  scrollContent: { padding: 16, gap: 12 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, minHeight: 50,
  },
  rowLabel: { fontSize: 15, color: '#222222' },
  rowValue: { fontSize: 14, color: '#888888', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8E8E8', marginLeft: 16 },
  titleInput: { fontSize: 17, color: '#222222', paddingHorizontal: 16, paddingVertical: 14, minHeight: 50 },
  memoInput: { fontSize: 15, color: '#222222', paddingHorizontal: 16, paddingVertical: 14, minHeight: 80 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  colorDotSelected: { transform: [{ scale: 1.25 }] },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pickerBox: {
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA', paddingVertical: 4,
  },
});
