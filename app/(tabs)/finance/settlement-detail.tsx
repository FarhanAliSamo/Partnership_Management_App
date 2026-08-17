import { useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, MoneyText, Button, SheetModal, TextField } from '@/components/ui';
import { AllocationBreakdown } from '@/components/domain';
import { useTheme } from '@/theme/useTheme';
import { useSettlementDetail } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { allocateManagerShare } from '@/services/financeService';
import { canForUser } from '@/services/permissionService';
import { toUserMessage } from '@/services/errors';

export default function SettlementDetailScreen() {
  const palette = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const { settlement, allocations, payments, reload } = useSettlementDetail(id ?? null);

  const [showAllocate, setShowAllocate] = useState(false);
  const [mode, setMode] = useState<'take' | 'pay_loan' | 'split'>('take');
  const [payLoan, setPayLoan] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAllocate = canForUser(user, 'allocation:manage_own');

  const submit = async () => {
    if (!user || !settlement) return;
    setError(null);
    setSaving(true);
    try {
      await allocateManagerShare(user, settlement.id, {
        mode,
        payLoanMinor: mode === 'split' ? parseFloat(payLoan || '0') * 100 : 0,
      });
      setShowAllocate(false);
      showToast('Allocation saved');
      await reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!settlement) {
    return (
      <Screen>
        <Text style={{ color: palette.textSecondary }}>Settlement not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Total Earnings</Text>
        <MoneyText minor={settlement.total_earning_minor} style={{ fontSize: 24, fontWeight: '700' }} />
      </Card>

      {/* Breakdown */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ gap: 4 }}>
          <Row label="Total Earnings" value={<MoneyText minor={settlement.total_earning_minor} />} />
          <Row label="WiFi (shared)" value={<MoneyText minor={settlement.shared_expense_minor} />} />
          <Row label="Your share" value={<MoneyText minor={settlement.admin_share_minor} />} />
          <Row label="Friend share" value={<MoneyText minor={settlement.manager_share_minor} />} />
          <Row label="Expenses (your share)" value={<MoneyText minor={settlement.admin_expense_minor} />} />
          <Divider />
          <Row label="Your final due" value={<MoneyText minor={settlement.admin_due_minor} style={{ fontWeight: '700' }} />} />
          <Row label="Friend final due" value={<MoneyText minor={settlement.manager_due_minor} style={{ fontWeight: '700' }} />} />
        </View>
      </Card>

      {/* Allocations */}
      {allocations.length > 0 ? (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Where did the money go?
          </Text>
          <AllocationBreakdown allocations={allocations} totalMinor={settlement.manager_share_minor} />
        </Card>
      ) : null}

      {/* Payments */}
      {payments.length > 0 ? (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Payments</Text>
          {payments.map((p) => (
            <Row key={p.id} label={`${p.partner} · ${p.status}`} value={<MoneyText minor={p.amount_minor} />} />
          ))}
        </Card>
      ) : null}

      {canAllocate && allocations.length === 0 ? (
        <Button title="Allocate Manager Share" onPress={() => setShowAllocate(true)} />
      ) : null}

      <SheetModal visible={showAllocate} onClose={() => setShowAllocate(false)} title="Manager Share Allocation">
        <Text style={{ color: palette.textSecondary, marginBottom: 12 }}>
          Manager share: <MoneyText minor={settlement.manager_share_minor} />
        </Text>
        <OptionRow label="Take My Share" active={mode === 'take'} onPress={() => setMode('take')} />
        <OptionRow label="Pay Loan" active={mode === 'pay_loan'} onPress={() => setMode('pay_loan')} />
        <OptionRow label="Split Share" active={mode === 'split'} onPress={() => setMode('split')} />
        {mode === 'split' ? (
          <TextField label="Pay Loan Amount (Rs.)" value={payLoan} onChangeText={setPayLoan} keyboardType="decimal-pad" />
        ) : null}
        {error ? <Text style={{ color: palette.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button title={saving ? 'Saving…' : 'Save Allocation'} onPress={submit} disabled={saving} />
      </SheetModal>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const palette = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ color: palette.textSecondary, fontSize: 14 }}>{label}</Text>
      <View>{value}</View>
    </View>
  );
}

function Divider() {
  const palette = useTheme();
  return <View style={{ height: 1, backgroundColor: palette.border, marginVertical: 6 }} />;
}

function OptionRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const palette = useTheme();
  return (
    <Card onPress={onPress} style={{ marginBottom: 8, borderColor: active ? palette.info : undefined, borderWidth: active ? 1 : 0 }}>
      <Text style={{ color: active ? palette.info : palette.text, fontWeight: '600' }}>{label}</Text>
    </Card>
  );
}