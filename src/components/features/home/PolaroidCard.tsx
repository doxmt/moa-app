import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ImageIcon } from 'lucide-react-native';

interface Props {
  photoUrl: string | null | undefined;
  uploading: boolean;
  onPress: () => void;
}

export default function PolaroidCard({ photoUrl, uploading, onPress }: Props) {
  return (
    <View className="flex-1 items-center justify-center w-full mt-3">
      <TouchableOpacity onPress={onPress} style={styles.polaroid} activeOpacity={0.9}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View className="flex-1 bg-[#F0F0F0] items-center justify-center gap-2">
            <ImageIcon size={40} color="#CCCCCC" strokeWidth={1.5} />
            <Text className="text-xs text-[#CCCCCC]">사진을 추가해보세요</Text>
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
