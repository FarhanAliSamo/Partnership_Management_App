import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, TextField, Button, ConfirmDialog } from '@/components/ui';
import { DateField, MoneyField } from '@/components/fields';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { updateEarning, deleteEarning } from '@/services/financeService';
import { getEarningById } from '@/repositories/financialRepository';
import { toUserMessage } from '@/services/errors';
import { parseIntAmount, toMajor } from '@/services/calculation/money';
import { getAllSettings } from '@/repositories/settingsRepository';
import type { Earning } from '@/types';

export default function EditEarningScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [earning, setEarning] = useState<Earning | null>(null);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getEarningById(id).then(async (e) => {
      if (!e) return;
      const units = await getAllSettings().then((s) => s.currencyMinorUnits).catch(() => 2);
      setEarning(e);
      setDate(e.business_date);
      setAmount(String(toMajor(e.amount_minor, units)));
      setNote(e.note ?? '');
    });
  }, [id]);

  const submit = async () => {
    if (!user || !earning) return;
    setError(null);
    const major = parseFloat(amount);
    if (!amount || isNaN(major) || major < 0) { setError('Enter a valid earning amount.'); return; }
    let units = 2;
    try { units = (await getAllSettings()).currencyMinorUnits; } catch {}
    setSaving(true);
    try {
      await updateEarning(user, earning.id, {
        business_date: date,
        amount_minor: parseIntAmount(major, units),
        note: note || null,
      });
      showToast('Earning updated');
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!user || !earning) return;
    setError(null);
    setSaving(true);
    try {
      await deleteEarning(user, earning.id);
      showToast('Earning deleted');
      setConfirmDelete(false);
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!earning) {
    return <Screen><Text style={{ color: palette.textSecondary }}>Earning not found.</Text></Screen>;
  }

  return (
    <Screen>
      <DateField label="Date" value={date} onChange={setDate} />
      <MoneyField label="Total Earning" value={amount} onChangeText={setAmount} />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline />
      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={submit} disabled={saving} />
      <View style={{ height: 10 }} />
      <Button title="Delete Earning" variant="danger" onPress={() => setConfirmDelete(true)} />

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete earning?"
        message="This removes the earning record permanently."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </Screen>
  );
}