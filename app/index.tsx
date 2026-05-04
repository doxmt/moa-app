import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { session, initialized, profileComplete } = useAuthStore();

  if (!initialized) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (profileComplete === null) return null;
  return <Redirect href={profileComplete ? '/(tabs)/home' : '/(onboarding)'} />;
}
