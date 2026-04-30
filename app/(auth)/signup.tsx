import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAuthStore } from '@/stores/authStore';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { signUp, loading } = useAuthStore();

  const handleSignup = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirm) {
      setErrorMsg('비밀번호가 일치하지 않아요.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('비밀번호는 6자 이상이어야 해요.');
      return;
    }

    const { error } = await signUp(email.trim(), password);
    if (error) {
      setErrorMsg(error);
    } else {
      setSuccessMsg('이메일을 확인해 인증을 완료해주세요!');
    }
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
        className="border border-gray-200 rounded-xl px-4 py-3 mb-3 text-base"
        placeholder="비밀번호 (6자 이상)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-base"
        placeholder="비밀번호 확인"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />

      {errorMsg ? <Text className="text-red-500 text-sm mb-3">{errorMsg}</Text> : null}
      {successMsg ? <Text className="text-green-600 text-sm mb-3">{successMsg}</Text> : null}

      <TouchableOpacity
        className="bg-rose-500 rounded-xl py-4 items-center mb-4"
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">회원가입</Text>
        )}
      </TouchableOpacity>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity className="items-center">
          <Text className="text-gray-500 text-sm">
            이미 계정이 있으신가요? <Text className="text-rose-500 font-medium">로그인</Text>
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
