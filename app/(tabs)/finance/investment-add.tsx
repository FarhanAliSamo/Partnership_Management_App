import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TextField, Button } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { addInvestment } from '@/services/financeService';
import { DateField, MoneyField } from '@/components/fields';
import { toUserMessage } from '@/services/errors';
import { parseIntAmount } from '@/services/calculation/money';
import { getAllSettings } from '@/repositories/settingsRepository';
import { todayISO } from '@/utils/date';

export default function InvestmentAddScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [categories, setCategories] = useState<string[]>(['Gaming PC', 'AC', 'Furniture', 'Monitor', 'Networking', 'Renovation', 'Other']);
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [contributor, setContributor] = useState<'admin' | 'manager' | 'both'>('admin');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllSettings().then((s) => {
      if (s.investmentCategories?.length) setCategories(s.investmentCategories);
    });
  }, []);

  const submit = async () => {
    if (!user) return;
    setError(null);
    if (!itemName.trim()) { setError('Item name is required.'); return; }
    const major = parseFloat(amount);
    if (!amount || isNaN(major) || major <= 0) { setError('Enter a valid amount.'); return; }
    let units = 2;
    try { units = (await getAllSettings()).currencyMinorUnits; } catch {}

    setSaving(true);
    try {
      await addInvestment(user, {
        item_name: itemName.trim(),
        amount_minor: parseIntAmount(major, units),
        business_date: date,
        category,
        description: description || category,
        contributor,
      });
      showToast('Investment added');
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <TextField label="Item Name" value={itemName} onChangeText={setItemName} placeholder="Gaming PC" />
      <MoneyField label="Amount" value={amount} onChangeText={setAmount} placeholder="250000" />
      <DateField label="Date" value={date} onChange={setDate} />

      <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {categories.map((c) => (
          <Button key={c} title={c} variant={category === c ? 'primary' : 'secondary'} onPress={() => setCategory(c)} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
        ))}
      </View>

      <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Contributor</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Button title="Admin" variant={contributor === 'admin' ? 'primary' : 'secondary'} onPress={() => setContributor('admin')} />
        <Button title="Manager" variant={contributor === 'manager' ? 'primary' : 'secondary'} onPress={() => setContributor('manager')} />
        <Button title="Both" variant={contributor === 'both' ? 'primary' : 'secondary'} onPress={() => setContributor('both')} />
      </View>

      <TextField label="Description" value={description} onChangeText={setDescription} placeholder="Description" multiline />
      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={saving ? 'Saving…' : 'Save Investment'} onPress={submit} disabled={saving} />
    </Screen>
  );
}