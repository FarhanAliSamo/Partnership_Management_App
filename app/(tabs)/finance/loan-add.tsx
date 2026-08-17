import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TextField, Button } from '@/components/ui';
import { DateField, MoneyField } from '@/components/fields';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { addLoan } from '@/services/financeService';
import { toUserMessage } from '@/services/errors';
import { parseIntAmount } from '@/services/calculation/money';
import { getAllSettings } from '@/repositories/settingsRepository';
import { todayISO } from '@/utils/date';
import type { Partner } from '@/types';

export default function LoanAddScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [borrower, setBorrower] = useState<Partner>('manager'); // manager = "Friend"
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFriend = borrower === 'manager';

  const submit = async () => {
    if (!user) return;
    setError(null);
    const major = parseFloat(amount);
    if (!amount || isNaN(major) || major <= 0) { setError('Enter a valid loan amount.'); return; }
    let units = 2;
    try { units = (await getAllSettings()).currencyMinorUnits; } catch {}

    const lender: Partner = isFriend ? 'admin' : 'manager';
    setSaving(true);
    try {
      const loan = await addLoan(user, {
        lender,
        borrower,
        amount_minor: parseIntAmount(major, units),
        business_date: date,
        reason: reason || 'Loan',
        notes: notes || null,
      });
      showToast(isFriend ? 'Friend now owes you' : 'You now owe friend');
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
        Who borrowed?
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Button title="Friend" variant={isFriend ? 'primary' : 'secondary'} onPress={() => setBorrower('manager')} />
        <Button title="Me" variant={!isFriend ? 'primary' : 'secondary'} onPress={() => setBorrower('admin')} />
      </View>

      <View style={{ backgroundColor: `${palette.info}14`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>
          {isFriend ? 'Friend will owe you' : 'You will owe friend'}
        </Text>
      </View>

      <MoneyField label="Amount" value={amount} onChangeText={setAmount} placeholder="30000" />
      <DateField label="Date" value={date} onChange={setDate} />
      <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="Reason" />
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
      {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={saving ? 'Saving…' : 'Save Loan'} onPress={submit} disabled={saving} />
    </Screen>
  );
}