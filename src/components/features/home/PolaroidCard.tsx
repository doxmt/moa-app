import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ImageIcon, Link2 } from 'lucide-react-native';

interface Props {
  photoUrl: string | null | undefined;
  uploading: boolean;
  onPress: () => void;
  notConnected?: boolean;
}

export default function PolaroidCard({ photoUrl, uploading, onPress, notConnected }: Props) {
  return (
    <View className="flex-1 items-center justify-center w-full mt-3">
      <TouchableOpacity onPress={onPress} style={styles.polaroid} activeOpacity={0.9}>
        {notConnected ? (
          <View className="flex-1 bg-moa-bg items-center justify-center gap-3 px-6">
            <Link2 size={36} color="#CCCCCC" strokeWidth={1.5} />
            <Text className="text-xs text-moa-muted text-center leading-5">
              연결하면 함께{'\n'}사진과 추억을 기록할 수 있어요
            </Text>
            <View className="px-4 py-2 rounded-full bg-moa-text">
              <Text className="text-xs text-white font-medium">연결하기</Text>
            </View>
          </View>
        ) : photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View className="flex-1 bg-moa-border items-center justify-center gap-2">
            <ImageIcon size={40} color="#CCCCCC" strokeWidth={1.5} />
            <Text className="text-xs text-moa-placeholder">사진을 추가해보세요</Text>
          </View>
        )}
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator color="white" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  polaroid: {
    backgroundColor: 'white',
    padding: 12,
    paddingBottom: 40,
    transform: [{ rotate: '1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    aspectRatio: 3 / 4,
    maxHeight: 384,
    width: '75%',
  },
  image: {
    flex: 1,
    width: '100%',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
