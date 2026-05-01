import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/stores/authStore';

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized, initialize, profile } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    const needsOnboarding = !profile?.name;

    if (needsOnboarding && !inOnboarding) {
      router.replace('/(onboarding)/onboarding');
    } else if (!needsOnboarding && (inAuth || inOnboarding)) {
      router.replace('/(tabs)/home');
    }
  }, [session, initialized, segments, profile]);

  return null;
}

export default function RootLayout() {
  return (
    <>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
      </Stack>
    </>
  );
}
