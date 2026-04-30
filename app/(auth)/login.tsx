import * as WebBrowser from 'expo-web-browser';
import { Image, Text, TouchableOpacity, View } from 'react-native';

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

export default function LoginScreen() {
  const handleSocialLogin = async (provider: Provider) => {
    const redirectTo = 'moa://auth/callback';

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

    if (error || !data.url) return;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
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
        {PROVIDERS.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            onPress={() => handleSocialLogin(provider.id)}
            style={{
              backgroundColor: provider.bg,
              borderWidth: provider.border ? 1 : 0,
              borderColor: '#E5E5E5',
            }}
            className="h-12 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Text style={{ color: provider.textColor }} className="text-sm font-medium">
              {provider.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
