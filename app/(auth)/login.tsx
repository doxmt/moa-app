import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Image, Platform, Text, TouchableOpacity, View } from 'react-native';

import { supabase } from '@/lib/supabase/client';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'kakao' | 'google' | 'apple';

const PROVIDERS: {
  id: Provider;
  label: string;
  bg: string;
  textColor: string;
  border?: boolean;
}[] = [
  { id: 'kakao', label: '카카오로 계속하기', bg: '#FEE500', textColor: '#191919' },
  { id: 'google', label: 'Google로 계속하기', bg: '#FFFFFF', textColor: '#222222', border: true },
  { id: 'apple', label: 'Apple로 계속하기', bg: '#222222', textColor: '#FFFFFF' },
];

const visibleProviders = PROVIDERS.filter(
  (p) => p.id !== 'apple' || Platform.OS === 'ios'
);

export default function LoginScreen() {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);

  const handleSocialLogin = async (provider: Provider) => {
    if (loadingProvider) return;
    setLoadingProvider(provider);

    try {
      const redirectTo = Linking.createURL('auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes:
            provider === 'kakao'
              ? 'profile_nickname profile_image account_email'
              : undefined,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('OAuth URL을 받지 못했습니다.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success') return;

      const { queryParams } = Linking.parse(result.url);
      const accessToken = queryParams?.access_token as string | undefined;
      const refreshToken = queryParams?.refresh_token as string | undefined;

      if (!accessToken || !refreshToken) throw new Error('토큰을 받지 못했습니다.');

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) throw sessionError;
    } catch (e) {
      Alert.alert('로그인 실패', e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <View className="items-center mb-12">
        <Image
          source={require('../../assets/images/icon.png')}
          style={{ width: 120, height: 120 }}
          resizeMode="contain"
        />
        <Text className="text-sm text-gray-500 mt-3">우리의 순간을 모아요</Text>
      </View>

      <View className="gap-3">
        {visibleProviders.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            onPress={() => handleSocialLogin(provider.id)}
            disabled={!!loadingProvider}
            style={{
              backgroundColor: provider.bg,
              borderWidth: provider.border ? 1 : 0,
              borderColor: '#E5E5E5',
              opacity: loadingProvider && loadingProvider !== provider.id ? 0.5 : 1,
            }}
            className="h-12 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Text style={{ color: provider.textColor }} className="text-sm font-medium">
              {loadingProvider === provider.id ? '로그인 중...' : provider.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
