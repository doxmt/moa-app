import { Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CELL_SIZE = SCREEN_WIDTH / 3;

export const styles = StyleSheet.create({
  cell: { width: CELL_SIZE, height: CELL_SIZE * (4 / 3) },
  uploadPreview: { width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40, borderRadius: 16 },
  uploadInput: { backgroundColor: 'rgba(255,255,255,0.1)' },
  uploadCancelBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  uploadBtnDisabled: { opacity: 0.5 },
  viewerImageWrap: { flex: 1, maxHeight: SCREEN_HEIGHT * 0.7 },
  viewerImage: { width: SCREEN_WIDTH, flex: 1 },
  navBtn: { backgroundColor: 'rgba(0,0,0,0.4)' },
  captionArea: { minHeight: 80, maxHeight: 160 },
  captionInput: { backgroundColor: 'rgba(255,255,255,0.1)' },
  captionCancelBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  dialogOverlay: { backgroundColor: 'rgba(0,0,0,0.5)' },
  dialogCancelBtn: { borderWidth: 1, borderColor: '#E0E0E0' },
});
