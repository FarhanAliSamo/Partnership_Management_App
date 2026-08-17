import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Screen, Card, TextField, Button, ToggleRow } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSyncStore } from '@/stores/useSyncStore';
import { useUiStore } from '@/stores/useUiStore';
import { getAllSettings, setManySettings } from '@/repositories/settingsRepository';
import { canForUser } from '@/services/permissionService';
import { relativeTimeFrom } from '@/utils/date';
import * as authService from '@/services/authService';
import {
  deviceSupportsBiometric,
  authenticateWithBiometrics,
} from '@/services/biometricService';
import { getBiometricEnabled, setBiometricEnabled } from '@/repositories/userRepository';
import type { BusinessSettings } from '@/types';
import type { ThemeMode } from '@/theme';

export default function SettingsScreen() {
  const palette = useTheme();
  const user = useAuthStore((s) => s.user);
  const { pendingCount, lastSyncedAt, syncNow, syncing, refresh } = useSyncStore();
  const { theme, setTheme } = useUiStore();

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [adminPercent, setAdminPercent] = useState('50');
  const [managerPercent, setManagerPercent] = useState('50');
  const [saved, setSaved] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  const canBusiness = canForUser(user, 'settings:business');

  useEffect(() => {
    refresh();
    getAllSettings().then((s) => {
      setSettings(s);
      setBusinessName(s.businessName);
      setAdminPercent(String(s.adminSharePercent));
      setManagerPercent(String(s.managerSharePercent));
    });
    (async () => {
      const supported = await deviceSupportsBiometric();
      setBioSupported(supported);
      if (user) setBioEnabled(await getBiometricEnabled(user.id));
    })();
  }, [refresh, user]);

  const saveBusiness = async () => {
    const admin = parseInt(adminPercent, 10);
    const manager = parseInt(managerPercent, 10);
    if (isNaN(admin) || isNaN(manager) || admin + manager !== 100) {
      setSaved(false);
      return;
    }
    await setManySettings({ businessName, adminSharePercent: admin, managerSharePercent: manager });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleBiometric = async (value: boolean) => {
    if (!user) return;
    if (value) {
      const ok = await authenticateWithBiometrics('Enable biometric lock');
      if (!ok) return;
      await authService.enableBiometric(user.id);
      setBioEnabled(true);
    } else {
      await authService.disableBiometric(user.id);
      setBioEnabled(false);
    }
  };

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        {canBusiness ? (
          <Card>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Business</Text>
            <TextField label="Business Name" value={businessName} onChangeText={setBusinessName} />
            <TextField label="Admin Split %" value={adminPercent} onChangeText={setAdminPercent} keyboardType="number-pad" />
            <TextField label="Manager Split %" value={managerPercent} onChangeText={setManagerPercent} keyboardType="number-pad" />
            <Button title={saved ? 'Saved ✓' : 'Save Business Settings'} onPress={saveBusiness} />
          </Card>
        ) : null}

        <Card>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Sync</Text>
          <Text style={{ color: palette.textSecondary, fontSize: 14 }}>
            {pendingCount > 0 ? `${pendingCount} item(s) pending sync` : 'Everything is synced.'}
          </Text>
          {lastSyncedAt ? (
            <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
              Last synced {relativeTimeFrom(lastSyncedAt)}
            </Text>
          ) : null}
          <View style={{ marginTop: 8 }}>
            <Button title={syncing ? 'Syncing…' : 'Sync Now'} onPress={syncNow} disabled={syncing} />
          </View>
        </Card>

        <Card>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Appearance</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {themeOptions.map((o) => (
              <Button
                key={o.key}
                title={o.label}
                variant={theme === o.key ? 'primary' : 'secondary'}
                onPress={() => setTheme(o.key)}
                style={{ flex: 1, paddingVertical: 8 }}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Security</Text>
          {bioSupported ? (
            <ToggleRow
              label="Face ID / Fingerprint lock"
              value={bioEnabled}
              onChange={toggleBiometric}
            />
          ) : (
            <Text style={{ color: palette.textSecondary, fontSize: 14 }}>
              Biometric unlock is not available on this device.
            </Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}