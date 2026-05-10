import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  confirmText: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  subtitle,
  confirmText,
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center" style={styles.overlay}>
        <View className="bg-white rounded-2xl mx-6 w-full p-6 gap-4">
          <Text className="text-sm font-semibold text-moa-text text-center">{title}</Text>
          {subtitle && (
            <Text className="text-xs text-moa-muted text-center">{subtitle}</Text>
          )}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 py-2.5 rounded-xl items-center"
              style={styles.cancelBtn}
            >
              <Text className="text-sm text-moa-sub">취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className={`flex-1 py-2.5 rounded-xl items-center ${destructive ? 'bg-red-500' : 'bg-moa-text'}`}
            >
              <Text className="text-sm text-white font-medium">{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(0,0,0,0.5)' },
  cancelBtn: { borderWidth: 1, borderColor: '#E0E0E0' },
});
