import { useEffect, useState } from 'react';
import { Text, View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen, TextField, Button } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { toUserMessage } from '@/services/errors';
import { useAuthStore } from '@/stores/useAuthStore';
import * as authService from '@/services/authService';

/**
 * First-run setup: creates the initial admin account in the database
 * (no hardcoded credentials anywhere).
 */
export default function SetupScreen() {
  const palette = useTheme();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authService
      .hasAnyUser()
      .then((exists) => {
        if (exists) router.replace('/(auth)/login');
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const submit = async () => {
    setError(null);
    if (!username.trim() || !displayName.trim() || !passcode) {
      setError('Fill all fields.');
      return;
    }
    if (passcode.trim().length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (passcode !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const user = await authService.createFirstAdmin({
        username,
        display_name: displayName,
        passcode,
      });
      setUser(user);
      router.replace('/(tabs)');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.info} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: palette.text, fontSize: 26, fontWeight: '700' }}>
              Create your account
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 6 }}>
              Set up the Admin account to start using F CRM.
            </Text>
          </View>

          <TextField label="Username" value={username} onChangeText={setUsername} placeholder="e.g. farhan" autoCapitalize="none" />
          <TextField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="e.g. Farhan" />
          <TextField label="Password" value={passcode} onChangeText={setPasscode} placeholder="Min 4 characters" secureTextEntry />
          <TextField label="Confirm password" value={confirm} onChangeText={setConfirm} placeholder="Repeat password" secureTextEntry />

          {error ? <Text style={{ color: palette.danger, fontSize: 14, marginBottom: 12 }}>{error}</Text> : null}

          <Button title={loading ? 'Creating…' : 'Create Admin Account'} onPress={submit} disabled={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}