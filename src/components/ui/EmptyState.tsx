import { Text, View } from 'react-native';

interface Props {
  message: string;
}

export default function EmptyState({ message }: Props) {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-sm text-moa-placeholder">{message}</Text>
    </View>
  );
}
