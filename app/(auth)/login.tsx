import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const setUser = useAuthStore((s) => s.setUser);

  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [focusField, setFocusField] = useState<'username' | 'password' | null>(null);

  useEffect(() => {
    deviceSupportsBiometric().then(setBioSupported).catch(() => setBioSupported(false));
    authService
      .hasAnyUser()
      .then((exists) => {
        if (!exists) router.replace('/(auth)/setup');
      })
      .catch(() => undefined);
  }, [router]);

  const submit = async () => {
    setError(null);
    if (!username.trim() || !passcode) {
      setError('Enter your email or username and password.');
      return;
    }
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

  const biometricLogin = async () => {
    setError(null);
    const ok = await authenticateWithBiometrics('Login with biometrics');
    if (!ok) return;
    const bioUser = await authService.getBiometricUser();
    if (!bioUser) {
      setError('Biometric login is not set up yet. Sign in with your password first.');
      return;
    }
    setUser(bioUser);
    router.replace('/(tabs)');
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

  const forgotPassword = () => {
    if (!username.trim()) {
      setError('Enter your username first, then tap Forgot Password.');
      return;
    }
    Alert.prompt(
      'Reset password',
      `Set a new password for "${username.trim()}" (min 4 characters)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async (newPass?: string) => {
            if (!newPass || newPass.trim().length < 4) {
              setError('Password must be at least 4 characters.');
              return;
            }
            try {
              await authService.resetPasscodeByUsername(username.trim(), newPass);
              Alert.alert('Password reset', 'Your password has been updated. Sign in now.');
            } catch (e) {
              setError(toUserMessage(e));
            }
          },
        },
      ],
      'secure-text',
      ''
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(139,92,246,0.10)',
                borderWidth: 1,
                borderColor: `${palette.info}55`,
                shadowColor: palette.info,
                shadowOpacity: 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              }}
            >
              <Text style={{ fontSize: 34 }}>🎮</Text>
            </View>
            <Text style={{ color: palette.text, fontSize: 30, fontWeight: '800', marginTop: 18, letterSpacing: 1 }}>
              GAMING <Text style={{ color: palette.info }}>ZONE</Text>
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '700', letterSpacing: 3, marginTop: 6 }}>
              PARTNER MANAGEMENT
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 10 }}>
              <Text style={{ color: palette.info, fontWeight: '600' }}>Manage</Text> smarter.{' '}
              <Text style={{ color: palette.info, fontWeight: '600' }}>Earn</Text> better.
            </Text>
          </View>

          {/* Welcome */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: palette.text, fontSize: 26, fontWeight: '700' }}>Welcome Back!</Text>
            <Text style={{ color: palette.textMuted, fontSize: 14, marginTop: 4 }}>
              Login to continue to your dashboard
            </Text>
          </View>

          {/* Login card */}
          <View
            style={{
              backgroundColor: palette.surface,
              borderRadius: 22,
              padding: 20,
              borderWidth: 1,
              borderColor: palette.border,
              shadowColor: palette.info,
              shadowOpacity: 0.12,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
          >
            {/* Username */}
            <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
              👤  Email or Username
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: palette.surfaceAlt,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: focusField === 'username' ? palette.info : palette.border,
                paddingHorizontal: 14,
                height: 56,
              }}
            >
              <Text style={{ color: palette.textMuted, fontSize: 16, marginRight: 10 }}>✉</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your email or username"
                placeholderTextColor={palette.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusField('username')}
                onBlur={() => setFocusField(null)}
                style={{ flex: 1, color: palette.text, fontSize: 16 }}
              />
            </View>

            {/* Password */}
            <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 18 }}>
              🔒  Password
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: palette.surfaceAlt,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: focusField === 'password' ? palette.info : palette.border,
                paddingHorizontal: 14,
                height: 56,
              }}
            >
              <Text style={{ color: palette.textMuted, fontSize: 16, marginRight: 10 }}>🔒</Text>
              <TextInput
                value={passcode}
                onChangeText={setPasscode}
                placeholder="Enter your password"
                placeholderTextColor={palette.textMuted}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField(null)}
                style={{ flex: 1, color: palette.text, fontSize: 16 }}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} accessibilityLabel="Toggle password visibility">
                <Text style={{ color: palette.textMuted, fontSize: 18 }}>{showPassword ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>

            {/* Remember + Forgot */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <Pressable onPress={() => setRemember((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: remember ? palette.info : palette.textMuted,
                    backgroundColor: remember ? palette.info : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {remember ? <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>✓</Text> : null}
                </View>
                <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Remember me</Text>
              </Pressable>
              <Pressable onPress={forgotPassword}>
                <Text style={{ color: palette.info, fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
              </Pressable>
            </View>

            {error ? (
              <View
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  borderWidth: 1,
                  borderColor: `${palette.danger}55`,
                }}
              >
                <Text style={{ color: palette.danger, fontSize: 13, textAlign: 'center' }}>{error}</Text>
              </View>
            ) : null}

            {/* Login button */}
            <Pressable
              onPress={submit}
              disabled={loading}
              accessibilityRole="button"
              style={({ pressed }) => ({
                marginTop: 22,
                height: 56,
                borderRadius: 16,
                backgroundColor: palette.info,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: palette.info,
                shadowOpacity: 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 5,
                opacity: loading ? 0.7 : pressed ? 0.92 : 1,
              })}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>Logging in…</Text>
                </View>
              ) : (
                <>
                  <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>Login</Text>
                  <View
                    style={{
                      position: 'absolute',
                      right: 8,
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.22)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>→</Text>
                  </View>
                </>
              )}
            </Pressable>
          </View>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
            <Text style={{ color: palette.textMuted, fontSize: 13, marginHorizontal: 12 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
          </View>

          {/* Biometric */}
          {bioSupported ? (
            <Pressable
              onPress={biometricLogin}
              accessibilityRole="button"
              style={({ pressed }) => ({
                marginTop: 20,
                borderRadius: 16,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.border,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(139,92,246,0.12)',
                  borderWidth: 1,
                  borderColor: `${palette.info}44`,
                }}
              >
                <Text style={{ fontSize: 22, color: palette.info }}>🖐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>Login with Fingerprint</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>Use your device biometrics to login</Text>
              </View>
            </Pressable>
          ) : null}

          {/* Security */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <Text style={{ color: palette.success, fontSize: 15 }}>🛡</Text>
            <View>
              <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                Your data is 100% secure
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: 11, textAlign: 'center', marginTop: 1 }}>
                Encrypted & protected
              </Text>
            </View>
          </View>

          {/* Bottom illustration */}
          <View style={{ alignItems: 'flex-end', marginTop: 24, opacity: 0.85 }}>
            <Text style={{ fontSize: 40 }}>🏦</Text>
            <View style={{ flexDirection: 'row', marginTop: -6 }}>
              <Text style={{ fontSize: 16 }}>💰</Text>
              <Text style={{ fontSize: 16, marginLeft: 4 }}>💰</Text>
              <Text style={{ fontSize: 16, marginLeft: 4 }}>💰</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}