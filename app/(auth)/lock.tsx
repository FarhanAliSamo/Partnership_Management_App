import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, TextField } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import * as authService from '@/services/authService';
import {
  deviceSupportsBiometric,
  authenticateWithBiometrics,
} from '@/services/biometricService';

/**
 * App lock. If biometric is enabled for the signed-in user (and the device
 * supports it), it prompts Face ID / Touch ID first. Falls back to passcode.
 */
export default function LockScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [triedBio, setTriedBio] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bioUser = await authService.getBiometricUser();
        const supported = await deviceSupportsBiometric();
        if (!cancelled && bioUser && supported) {
          const ok = await authenticateWithBiometrics('Unlock F CRM');
          if (ok && !cancelled) {
            router.replace('/(tabs)');
            return;
          }
        }
      } catch {
        // fall through to passcode
      }
      if (!cancelled) setTriedBio(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const unlock = async () => {
    const defaultPass = user?.role_key === 'admin' ? 'admin123' : 'manager123';
    if (passcode === defaultPass || passcode === 'admin123' || passcode === 'manager123') {
      router.replace('/(tabs)');
    } else {
      setError('Incorrect passcode.');
    }
  };

  const retryBio = async () => {
    setError(null);
    const ok = await authenticateWithBiometrics('Unlock F CRM');
    if (ok) router.replace('/(tabs)');
    else setTriedBio(true);
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700', marginBottom: 8 }}>
          App Locked
        </Text>
        <Text style={{ color: palette.textSecondary, fontSize: 15, marginBottom: 20 }}>
          Unlock with biometric or your passcode.
        </Text>

        {triedBio ? (
          <>
            <TextField label="Passcode" value={passcode} onChangeText={setPasscode} secureTextEntry />
            {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
            <Button title="Unlock" onPress={unlock} />
            <View style={{ height: 10 }} />
            <Button title="Use Face ID / Fingerprint" variant="ghost" onPress={retryBio} />
          </>
        ) : (
          <Text style={{ color: palette.textSecondary, fontSize: 14 }}>Checking biometric…</Text>
        )}
      </View>
    </Screen>
  );
}