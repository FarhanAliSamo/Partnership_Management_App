import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from '@/theme/useTheme';

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 20, fontWeight: '600' }}>{label}</Text>;
}

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const restoring = useAuthStore((s) => s.restoring);
  const palette = useTheme();

  if (!restoring && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.info,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon label="⌂" color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color }) => <TabIcon label="₹" color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color }) => <TabIcon label="–" color={color} />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Finance',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon label="◈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabIcon label="…" color={color} />,
        }}
      />
    </Tabs>
  );
}