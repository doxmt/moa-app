import React from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { supabase } from '@/lib/supabase/client';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'kakao' | 'google' | 'apple';

function KakaoIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={18} height={18} fill="#191919">
      <Path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.636 5.08 4.125 6.527L5.1 21l4.688-2.45A11.1 11.1 0 0 0 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={18} height={18}>
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={18} height={18} fill="#FFFFFF">
      <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.34.07 2.27.74 3.04.8 1.15-.24 2.26-.93 3.48-.84 1.48.12 2.6.72 3.32 1.84-3.03 1.82-2.31 5.84.48 6.96-.57 1.52-1.32 3.02-2.32 4.12zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

const PROVIDERS: {
  id: Provider;
  label: string;
  style: {
    bg: string;
    textColor: string;
    borderColor?: string;
    borderRadius: number;
    iconBg?: string;
  };
  Icon: () => React.ReactElement;
}[] = [
  {
    id: 'kakao',
    label: '카카오로 계속하기',
    style: {
      bg: '#FEE500',
      textColor: '#191919',
      borderRadius: 12,
    },
    Icon: KakaoIcon,
  },
  {
    id: 'google',
    label: 'Google로 계속하기',
    style: {
      bg: '#FFFFFF',
      textColor: '#1F1F1F',
      borderColor: '#DADCE0',
      borderRadius: 4,
      iconBg: '#FFFFFF',
    },
    Icon: GoogleIcon,
  },
  {
    id: 'apple',
    label: 'Apple로 계속하기',
    style: {
      bg: '#000000',
      textColor: '#FFFFFF',
      borderRadius: 8,
    },
    Icon: AppleIcon,
  },
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

      const parsed = Linking.parse(result.url);
      let accessToken = parsed.queryParams?.access_token as string | undefined;
      let refreshToken = parsed.queryParams?.refresh_token as string | undefined;
      let errorMsg = parsed.queryParams?.error_description as string | undefined;

      if (!accessToken && result.url.includes('#')) {
        const hash = result.url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        accessToken = params.get('access_token') ?? undefined;
        refreshToken = params.get('refresh_token') ?? undefined;
        errorMsg = errorMsg ?? params.get('error_description') ?? undefined;
      }

      if (errorMsg) throw new Error(errorMsg);
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
          style={styles.logo}
          resizeMode="contain"
        />
        <Text className="text-sm text-gray-500 mt-3">우리의 순간을 모아요</Text>
      </View>

      <View style={styles.buttonGroup}>
        {visibleProviders.map(({ id, label, style, Icon }) => (
          <TouchableOpacity
            key={id}
            onPress={() => handleSocialLogin(id)}
            disabled={!!loadingProvider}
            style={[
              styles.button,
              {
                backgroundColor: style.bg,
                borderRadius: style.borderRadius,
                borderWidth: style.borderColor ? 1 : 0,
                borderColor: style.borderColor,
                opacity: loadingProvider && loadingProvider !== id ? 0.5 : 1,
              },
            ]}
          >
            <View style={styles.iconWrapper}>
              <Icon />
            </View>
            <Text style={[styles.buttonText, { color: style.textColor }]}>
              {loadingProvider === id ? '로그인 중...' : label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    gap: 12,
  },
  button: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  iconWrapper: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
});
