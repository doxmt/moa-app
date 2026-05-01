import { Tabs } from 'expo-router';

import Header from '@/components/features/layout/Header';
import TabBar from '@/components/features/layout/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ header: () => <Header /> }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="recommend" />
      <Tabs.Screen name="story" />
      <Tabs.Screen name="question" />
    </Tabs>
  );
}
