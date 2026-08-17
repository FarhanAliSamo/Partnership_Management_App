import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TextField, Button } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { toUserMessage } from '@/services/errors';
import { useAuthStore } from '@/stores/useAuthStore';
import * as authService from '@/services/authService';
import {
  deviceSupportsBiometric,
  authenticateWithBiometrics,
} from '@/services/biometricService';

export default function LoginScreen() {
  const palette = useTheme();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await login(username, passcode);
      await offerBiometric(user.id);
      router.replace('/(tabs)');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const offerBiometric = async (userId: string) => {
    try {
      const supported = await deviceSupportsBiometric();
      if (!supported) return;
      Alert.alert(
        'Enable Face ID / Fingerprint?',
        'Use your device biometric to unlock the app quickly next time.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const ok = await authenticateWithBiometrics('Enable biometric unlock');
              if (ok) await authService.enableBiometric(userId);
            },
          },
        ]
      );
    } catch {
      // optional — never block sign-in on biometric setup
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ color: palette.text, fontSize: 30, fontWeight: '700', marginBottom: 8 }}>
          F CRM
        </Text>
        <Text style={{ color: palette.textSecondary, fontSize: 16, marginBottom: 32 }}>
          Sign in to your partnership account
        </Text>

        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="admin / manager"
          autoCapitalize="none"
        />
        <TextField
          label="Passcode"
          value={passcode}
          onChangeText={setPasscode}
          placeholder="••••••"
          secureTextEntry
        />

        {error ? (
          <Text style={{ color: palette.danger, fontSize: 14, marginBottom: 16 }}>{error}</Text>
        ) : null}

        <Button title={loading ? 'Signing in…' : 'Sign In'} onPress={submit} disabled={loading} />
      </View>
    </Screen>
  );
}