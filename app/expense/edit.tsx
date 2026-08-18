import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, TextField, Button, ConfirmDialog } from '@/components/ui';
import { DateField, MoneyField } from '@/components/fields';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { updateExpense, deleteExpense } from '@/services/financeService';
import { getExpenseById } from '@/repositories/financialRepository';
import { toUserMessage } from '@/services/errors';
import { parseIntAmount, toMajor } from '@/services/calculation/money';
import { getAllSettings } from '@/repositories/settingsRepository';
import type { Expense } from '@/types';

export default function EditExpenseScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const s = await getAllSettings().catch(() => null);
      if (s?.expenseCategories?.length) setCategories(s.expenseCategories);
      const units = s?.currencyMinorUnits ?? 2;
      const e = await getExpenseById(id);
      if (!e) return;
      setExpense(e);
      setDate(e.business_date);
      setAmount(String(toMajor(e.amount_minor, units)));
      setCategory(e.category);
      setDescription(e.description);
      setNotes(e.notes ?? '');
    })();
  }, [id]);

  const submit = async () => {
    if (!user || !expense) return;
    setError(null);
    const major = parseFloat(amount);
    if (!amount || isNaN(major) || major <= 0) { setError('Enter a valid expense amount.'); return; }
    let units = 2;
    try { units = (await getAllSettings()).currencyMinorUnits; } catch {}
    setSaving(true);
    try {
      await updateExpense(user, expense.id, {
        business_date: date,
        amount_minor: parseIntAmount(major, units),
        category,
        description: description || category,
        notes: notes || null,
      });
      showToast('Expense updated');
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!user || !expense) return;
    setError(null);
    setSaving(true);
    try {
      await deleteExpense(user, expense.id);
      showToast('Expense deleted');
      setConfirmDelete(false);
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!expense) {
    return <Screen><Text style={{ color: palette.textSecondary }}>Expense not found.</Text></Screen>;
  }

  return (
    <Screen>
      <DateField label="Date" value={date} onChange={setDate} />
      <MoneyField label="Amount" value={amount} onChangeText={setAmount} />
      <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {categories.map((c) => (
          <Button key={c} title={c} variant={category === c ? 'primary' : 'secondary'} onPress={() => setCategory(c)} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
        ))}
      </View>
      <TextField label="Description" value={description} onChangeText={setDescription} />
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={submit} disabled={saving} />
      <View style={{ height: 10 }} />
      <Button title="Delete Expense" variant="danger" onPress={() => setConfirmDelete(true)} />

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete expense?"
        message="This removes the expense record permanently."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </Screen>
  );
}