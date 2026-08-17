import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, MoneyText, Button, TextField, SheetModal } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { useLoanDetail } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { addRepayment } from '@/services/financeService';
import { loanDirectionLabel } from '@/components/domain';
import { MoneyField } from '@/components/fields';
import { toUserMessage } from '@/services/errors';
import { parseIntAmount } from '@/services/calculation/money';
import { getAllSettings } from '@/repositories/settingsRepository';
import { formatDateDisplay } from '@/utils/date';
import { canForUser } from '@/services/permissionService';
import { todayISO } from '@/utils/date';

export default function LoanDetailScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const { loan, repayments, loading, reload } = useLoanDetail(id ?? null);

  const [showRepay, setShowRepay] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRepay = canForUser(user, 'repayment:create');

  const submitRepay = async () => {
    if (!user || !loan) return;
    setError(null);
    const major = parseFloat(amount);
    if (!amount || isNaN(major) || major <= 0) { setError('Enter a valid amount.'); return; }
    let units = 2;
    try { units = (await getAllSettings()).currencyMinorUnits; } catch {}
    setSaving(true);
    try {
      await addRepayment(user, {
        loan_id: loan.id,
        amount_minor: parseIntAmount(major, units),
        business_date: todayISO(),
      });
      setAmount('');
      setShowRepay(false);
      showToast('Repayment recorded');
      await reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!loan) {
    return (
      <Screen>
        <Text style={{ color: palette.textSecondary }}>Loan not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Original Amount</Text>
        <MoneyText minor={loan.amount_minor} style={{ fontSize: 26, fontWeight: '700' }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            {loanDirectionLabel(loan)}
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>{loan.status}</Text>
        </View>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Remaining Balance</Text>
        <MoneyText minor={loan.remaining_minor} style={{ fontSize: 22, fontWeight: '700' }} />
      </Card>

      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Repayments</Text>
      {repayments.length === 0 ? (
        <Text style={{ color: palette.textMuted, fontSize: 14 }}>No repayments yet.</Text>
      ) : (
        <FlatList
          data={repayments}
          keyExtractor={(r) => r.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <MoneyText minor={item.amount_minor} style={{ fontWeight: '600' }} />
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>{formatDateDisplay(item.business_date)}</Text>
              </View>
            </Card>
          )}
        />
      )}

      {canRepay && loan.status === 'active' ? (
        <View style={{ marginTop: 12 }}>
          <Button title="Add Repayment" onPress={() => setShowRepay(true)} />
        </View>
      ) : null}

      <SheetModal visible={showRepay} onClose={() => setShowRepay(false)} title="Record Repayment">
        <MoneyField label="Amount" value={amount} onChangeText={setAmount} placeholder="5000" />
        {error ? <Text style={{ color: palette.danger, marginBottom: 12 }}>{error}</Text> : null}
        <Button title={saving ? 'Saving…' : 'Record Repayment'} onPress={submitRepay} disabled={saving} />
      </SheetModal>
    </Screen>
  );
}