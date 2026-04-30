import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { signIn, loading } = useAuthStore();

  const handleLogin = async () => {
    setErrorMsg('');
    const { error } = await signIn(email.trim(), password);
    if (error) setErrorMsg(error);
  };

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-3xl font-bold text-center text-rose-500 mb-10">moa</Text>

      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-3 text-base"
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-base"
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {errorMsg ? (
        <Text className="text-red-500 text-sm mb-3">{errorMsg}</Text>
      ) : null}

      <TouchableOpacity
        className="bg-rose-500 rounded-xl py-4 items-center mb-4"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">로그인</Text>
        )}
      </TouchableOpacity>

      <Link href="/(auth)/signup" asChild>
        <TouchableOpacity className="items-center">
          <Text className="text-gray-500 text-sm">
            계정이 없으신가요? <Text className="text-rose-500 font-medium">회원가입</Text>
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
