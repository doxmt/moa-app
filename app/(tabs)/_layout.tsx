import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="calendar" options={{ title: '캘린더' }} />
      <Tabs.Screen name="question" options={{ title: '질문' }} />
      <Tabs.Screen name="recommend" options={{ title: '추천' }} />
      <Tabs.Screen name="story" options={{ title: '스토리' }} />
    </Tabs>
  );
}
