import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Button } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';

export default function MoreScreen() {
  const palette = useTheme();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Signed in as</Text>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600', marginTop: 4 }}>
          {user?.display_name} ({user?.role_key})
        </Text>
      </Card>

      <Card style={{ marginBottom: 12 }} onPress={() => router.push('/(tabs)/more/activity')}>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>Activity</Text>
        <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 2 }}>Full audit timeline</Text>
      </Card>

      <Card style={{ marginBottom: 12 }} onPress={() => router.push('/(tabs)/more/settings')}>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>Settings</Text>
        <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 2 }}>Business, security, appearance & sync</Text>
      </Card>

      <Button title="Log Out" variant="secondary" onPress={async () => { await logout(); router.replace('/(auth)/login'); }} />
    </Screen>
  );
}