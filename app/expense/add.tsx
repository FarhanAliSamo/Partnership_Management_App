import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TextField, Button } from '@/components/ui';
import { DateField, MoneyField } from '@/components/fields';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { addExpense } from '@/services/financeService';
import { toUserMessage } from '@/services/errors';
import { parseIntAmount } from '@/services/calculation/money';
import { getAllSettings } from '@/repositories/settingsRepository';
import { todayISO } from '@/utils/date';

export default function AddExpenseScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [categories, setCategories] = useState<string[]>(['Repair', 'Equipment', 'Purchase', 'Maintenance', 'WiFi', 'Other']);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllSettings().then((s) => {
      if (s.expenseCategories?.length) setCategories(s.expenseCategories);
    });
  }, []);

  const submit = async () => {
    if (!user) return;
    setError(null);
    const major = parseFloat(amount);
    if (!amount || isNaN(major) || major <= 0) {
      setError('Enter a valid expense amount.');
      return;
    }
    let units = 2;
    try {
      units = (await getAllSettings()).currencyMinorUnits;
    } catch {
      // default
    }
    setSaving(true);
    try {
      await addExpense(user, {
        business_date: date,
        amount_minor: parseIntAmount(major, units),
        category,
        description: description || category,
        notes: notes || null,
      });
      showToast('Expense added');
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <DateField label="Date" value={date} onChange={setDate} />
      <MoneyField label="Amount" value={amount} onChangeText={setAmount} placeholder="2000" />

      <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
        Category
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {categories.map((c) => (
          <Button
            key={c}
            title={c}
            variant={category === c ? 'primary' : 'secondary'}
            onPress={() => setCategory(c)}
            style={{ paddingVertical: 8, paddingHorizontal: 14 }}
          />
        ))}
      </View>

      {category === 'WiFi' ? (
        <Text style={{ color: palette.info, fontSize: 13, marginBottom: 12 }}>
          WiFi is handled separately (shared expense, deducted before the split).
        </Text>
      ) : null}

      <TextField label="Description" value={description} onChangeText={setDescription} placeholder="Description" />
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={saving ? 'Saving…' : 'Save Expense'} onPress={submit} disabled={saving} />
    </Screen>
  );
}