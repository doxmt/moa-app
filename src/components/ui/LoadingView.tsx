import { ActivityIndicator, Text, View } from 'react-native';

interface Props {
  message?: string;
  color?: string;
}

export default function LoadingView({ message, color = '#CCCCCC' }: Props) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color={color} />
      {message && <Text className="text-sm text-moa-placeholder mt-2">{message}</Text>}
    </View>
  );
}
