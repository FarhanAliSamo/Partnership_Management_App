import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);
  const restoring = useAuthStore((s) => s.restoring);

  if (!restoring && user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="lock" />
    </Stack>
  );
}