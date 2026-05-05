import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import { useNotificationSetup } from '@/hooks/useNotificationSetup';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized, profileComplete, initialize } = useAuthStore();
  useNotificationSetup();

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

    if (profileComplete === null) return;

    if (inAuth) {
      router.replace(profileComplete ? '/(tabs)/home' : '/(onboarding)');
    }
  }, [session, initialized, profileComplete, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="settings" />
      </Stack>
    </QueryClientProvider>
  );
}
