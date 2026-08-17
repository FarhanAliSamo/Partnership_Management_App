import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TextField, Button } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { markClosedDay } from '@/services/financeService';
import { toUserMessage } from '@/services/errors';
import { todayISO } from '@/utils/date';
import { DateField } from '@/components/fields';

export default function CloseDayScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setError(null);
    setSaving(true);
    try {
      await markClosedDay(user, { business_date: date, reason: reason || null });
      showToast('Marked as closed');
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Text style={{ color: palette.textSecondary, fontSize: 15, marginBottom: 16 }}>
        Record this day as closed / no earning.
      </Text>
      <DateField label="Date" value={date} onChange={setDate} />
      <TextField
        label="Reason for Closure"
        value={reason}
        onChangeText={setReason}
        placeholder="Maintenance, power issue, friend unavailable…"
        multiline
      />
      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={saving ? 'Saving…' : 'Mark as Closed'} onPress={submit} disabled={saving} />
    </Screen>
  );
}