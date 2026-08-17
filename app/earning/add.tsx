import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TextField, Button } from '@/components/ui';
import { DateField, MoneyField } from '@/components/fields';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { addEarning } from '@/services/financeService';
import { toUserMessage } from '@/services/errors';
import { parseIntAmount } from '@/services/calculation/money';
import { getAllSettings } from '@/repositories/settingsRepository';
import { todayISO } from '@/utils/date';

export default function AddEarningScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setError(null);
    const major = parseFloat(amount);
    if (!amount || isNaN(major) || major < 0) {
      setError('Enter a valid earning amount.');
      return;
    }
    let units = 2;
    try {
      const s = await getAllSettings();
      units = s.currencyMinorUnits;
    } catch {
      // default 2
    }
    setSaving(true);
    try {
      await addEarning(user, {
        business_date: date,
        amount_minor: parseIntAmount(major, units),
        note: note || null,
      });
      showToast('Earning added');
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
        Total earning is split automatically 50/50.
      </Text>
      <DateField label="Date" value={date} onChange={setDate} />
      <MoneyField label="Total Earning" value={amount} onChangeText={setAmount} placeholder="8500" />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="Optional note" multiline />
      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={saving ? 'Saving…' : 'Save Earning'} onPress={submit} disabled={saving} />
    </Screen>
  );
}