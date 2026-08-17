import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'More' }} />
      <Stack.Screen name="activity" options={{ title: 'Activity' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}