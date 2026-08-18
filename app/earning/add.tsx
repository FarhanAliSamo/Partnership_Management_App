import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TextField, Button } from '@/components/ui';
import { DateField, MoneyField, PhotoPicker } from '@/components/fields';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { addEarning } from '@/services/financeService';
import { toUserMessage } from '@/services/errors';
import { parseIntAmount } from '@/services/calculation/money';
import { getAllSettings } from '@/repositories/settingsRepository';
import { todayISO } from '@/utils/date';
import { persistPickedPhoto, type PickedPhoto } from '@/services/fileService';

export default function AddEarningScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [cashHolder, setCashHolder] = useState<'split' | 'admin' | 'manager'>('split');
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
      const earning = await addEarning(user, {
        business_date: date,
        amount_minor: parseIntAmount(major, units),
        note: note || null,
        cash_holder: cashHolder,
      });
      await Promise.all(photos.map((photo) => persistPickedPhoto(user, 'earning', earning.id, photo)));
      showToast(photos.length ? 'Earning and photos saved' : 'Earning added');
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
      <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Who kept today’s cash?</Text>
      <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 8 }}>If one person kept the full amount, the other person’s 50% is automatically added as a loan.</Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        <Button title="Both received their own share" variant={cashHolder === 'split' ? 'primary' : 'secondary'} onPress={() => setCashHolder('split')} style={{ paddingVertical: 10 }} />
        <Button title="Manager kept the full cash" variant={cashHolder === 'manager' ? 'primary' : 'secondary'} onPress={() => setCashHolder('manager')} style={{ paddingVertical: 10 }} />
        <Button title="Admin kept the full cash" variant={cashHolder === 'admin' ? 'primary' : 'secondary'} onPress={() => setCashHolder('admin')} style={{ paddingVertical: 10 }} />
      </View>
      <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="Optional note" multiline />
      <PhotoPicker photos={photos} onChange={setPhotos} label="Daily calculation photos (optional)" />
      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={saving ? 'Saving…' : 'Save Earning'} onPress={submit} disabled={saving} />
    </Screen>
  );
}
