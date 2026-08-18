import { useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, MoneyText, Button, SheetModal, TextField, Badge, ConfirmDialog } from '@/components/ui';
import { AllocationBreakdown } from '@/components/domain';
import { MoneyField } from '@/components/fields';
import { SETTLEMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/constants/enums';
import { useTheme } from '@/theme/useTheme';
import { useSettlementDetail } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { addPayment, allocateManagerShare, deleteSettlement } from '@/services/financeService';
import { canForUser } from '@/services/permissionService';
import { toUserMessage } from '@/services/errors';
import { parseIntAmount } from '@/services/calculation/money';
import { getAllSettings } from '@/repositories/settingsRepository';
import { formatMonthDisplay } from '@/utils/date';
import type { Payment } from '@/types';

type AllocationMode = 'take' | 'pay_loan' | 'split';

export default function SettlementDetailScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const { settlement, allocations, payments, reload } = useSettlementDetail(id ?? null);

  const [showAllocate, setShowAllocate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [mode, setMode] = useState<AllocationMode>('take');
  const [payLoan, setPayLoan] = useState('');
  const [paymentPartner, setPaymentPartner] = useState<Payment['partner']>('manager');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canAllocate = canForUser(user, 'allocation:manage_own');
  const canMarkPayment = canForUser(user, 'payment:mark');
  const canManage = canForUser(user, 'settlement:manage');
  const managerAllocated = allocations.some((allocation) => allocation.partner === 'manager');
  const isManager = user?.role_key === 'manager';
  const yourShare = isManager ? settlement?.manager_share_minor : settlement?.admin_share_minor;
  const friendShare = isManager ? settlement?.admin_share_minor : settlement?.manager_share_minor;
  const yourDue = isManager ? settlement?.manager_due_minor : settlement?.admin_due_minor;
  const friendDue = isManager ? settlement?.admin_due_minor : settlement?.manager_due_minor;

  const submitAllocation = async () => {
    if (!user || !settlement) return;
    setError(null);
    let units = 2;
    try { units = (await getAllSettings()).currencyMinorUnits; } catch { /* default paisa */ }
    const major = payLoan ? Number(payLoan) : 0;
    if (mode === 'split' && (!Number.isFinite(major) || major <= 0)) {
      setError('Enter the amount to use for loan repayment.');
      return;
    }
    setSaving(true);
    try {
      await allocateManagerShare(user, settlement.id, {
        mode,
        payLoanMinor: mode === 'split' ? parseIntAmount(major, units) : 0,
      });
      setShowAllocate(false);
      setPayLoan('');
      showToast('Manager share allocation saved');
      await reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const removeSettlement = async () => {
    if (!user || !settlement) return;
    setError(null);
    setSaving(true);
    try {
      await deleteSettlement(user, settlement.id);
      setConfirmDelete(false);
      showToast('Settlement deleted');
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async () => {
    if (!user || !settlement) return;
    setError(null);
    const major = Number(paymentAmount);
    if (!Number.isFinite(major) || major <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    let units = 2;
    try { units = (await getAllSettings()).currencyMinorUnits; } catch { /* default paisa */ }
    setSaving(true);
    try {
      await addPayment(user, {
        settlement_id: settlement.id,
        partner: paymentPartner,
        amount_minor: parseIntAmount(major, units),
        status: paymentPartner === 'manager' ? 'released' : 'received',
        note: paymentNote || null,
      });
      setShowPayment(false);
      setPaymentAmount('');
      setPaymentNote('');
      showToast('Payment recorded');
      await reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!settlement) return <Screen><Text style={{ color: palette.textSecondary }}>Settlement not found.</Text></Screen>;

  return (
    <Screen>
      <Card style={{ marginBottom: 12, backgroundColor: palette.info, borderColor: palette.info }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#E0F2FE', fontSize: 13, fontWeight: '600' }}>MONTHLY SETTLEMENT</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: 4 }}>{formatMonthDisplay(settlement.month)}</Text>
          </View>
          <Badge
            label={SETTLEMENT_STATUS_LABELS[settlement.status] ?? settlement.status}
            tone={settlement.status === 'paid' ? 'success' : settlement.status === 'partial' ? 'warning' : 'neutral'}
          />
        </View>
        <Text style={{ color: '#E0F2FE', fontSize: 13, marginTop: 20 }}>Total earning</Text>
        <MoneyText minor={settlement.total_earning_minor} style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '700', marginTop: 2 }} />
      </Card>

      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>How this month was calculated</Text>
      <Card style={{ marginBottom: 12 }}>
        <AmountRow label="Total earnings" value={settlement.total_earning_minor} />
        <AmountRow label="WiFi · shared before split" value={-settlement.shared_expense_minor} muted />
        <Line />
        <AmountRow label="Amount split between partners" value={settlement.net_profit_minor} strong />
        <AmountRow label={isManager ? 'Friend 50% share' : 'Your 50% share'} value={isManager ? settlement.admin_share_minor : settlement.admin_share_minor} />
        <AmountRow label={isManager ? 'Your 50% share' : 'Friend 50% share'} value={isManager ? settlement.manager_share_minor : settlement.manager_share_minor} />
        <AmountRow label="Other expenses from your share" value={-settlement.admin_expense_minor} muted />
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <DueCard label="YOUR SHARE" amount={yourShare ?? 0} tone={palette.info} />
        <DueCard label="FRIEND SHARE" amount={friendShare ?? 0} tone={palette.success} />
      </View>

      <Card style={{ marginBottom: 16 }}>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Final amount due</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 14 }}>You receive</Text>
          <MoneyText minor={yourDue ?? 0} style={{ fontWeight: '700', color: palette.success }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 14 }}>Friend receives</Text>
          <MoneyText minor={friendDue ?? 0} style={{ fontWeight: '700', color: palette.infoSecondary }} />
        </View>
      </Card>

      {allocations.length > 0 ? (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Manager share allocation</Text>
          <Text style={{ color: palette.textSecondary, fontSize: 13, marginBottom: 10 }}>Shows whether the share was taken or used against a loan.</Text>
          <AllocationBreakdown allocations={allocations} totalMinor={settlement.manager_share_minor} />
        </Card>
      ) : null}

      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: payments.length ? 8 : 0 }}>
          <View>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>Payments</Text>
            <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Mark each partner’s settlement payment.</Text>
          </View>
          {payments.length ? <Badge label={`${payments.length} recorded`} tone="info" /> : null}
        </View>
        {payments.length === 0 ? <Text style={{ color: palette.textMuted, fontSize: 14, marginTop: 8 }}>No payment recorded yet.</Text> : payments.map((payment) => (
          <View key={payment.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: palette.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{payment.partner === 'admin' ? 'Friend payment' : 'Your payment'}</Text>
              <MoneyText minor={payment.amount_minor} style={{ fontWeight: '700' }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Badge
                label={PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                tone={payment.status === 'received' ? 'success' : 'info'}
              />
              {payment.note ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>{payment.note}</Text> : null}
            </View>
          </View>
        ))}
      </Card>

      {canAllocate && !managerAllocated ? <Button title="Allocate Manager Share" onPress={() => { setError(null); setShowAllocate(true); }} /> : null}
      {canMarkPayment ? <Button title="Record Settlement Payment" variant="secondary" onPress={() => { setError(null); setShowPayment(true); }} style={{ marginTop: canAllocate && !managerAllocated ? 10 : 0 }} /> : null}
      {canManage ? <Button title="Delete Settlement" variant="danger" onPress={() => setConfirmDelete(true)} style={{ marginTop: 10 }} /> : null}

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete settlement?"
        message={`This deletes the ${formatMonthDisplay(settlement.month)} settlement. You can regenerate it after fixing any data.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={removeSettlement}
      />

      <SheetModal visible={showAllocate} onClose={() => setShowAllocate(false)} title="Manager Share">
        <Text style={{ color: palette.textSecondary, marginBottom: 12 }}>Manager share available: <MoneyText minor={settlement.manager_share_minor} /></Text>
        <OptionRow label="Take full share" caption="Manager receives the full amount" active={mode === 'take'} onPress={() => setMode('take')} />
        <OptionRow label="Pay loan first" caption="Use the share against manager loans" active={mode === 'pay_loan'} onPress={() => setMode('pay_loan')} />
        <OptionRow label="Split between cash and loan" caption="Choose how much goes to the loan" active={mode === 'split'} onPress={() => setMode('split')} />
        {mode === 'split' ? <MoneyField label="Amount for loan" value={payLoan} onChangeText={setPayLoan} placeholder="5000" /> : null}
        {error ? <Text style={{ color: palette.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button title={saving ? 'Saving…' : 'Save allocation'} onPress={submitAllocation} disabled={saving} />
      </SheetModal>

      <SheetModal visible={showPayment} onClose={() => setShowPayment(false)} title="Record Settlement Payment">
        <Text style={{ color: palette.textSecondary, fontSize: 13, marginBottom: 8 }}>Whose due amount was paid?</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <View style={{ flex: 1 }}><Button title="Manager" variant={paymentPartner === 'manager' ? 'primary' : 'secondary'} onPress={() => setPaymentPartner('manager')} /></View>
          <View style={{ flex: 1 }}><Button title="Admin" variant={paymentPartner === 'admin' ? 'primary' : 'secondary'} onPress={() => setPaymentPartner('admin')} /></View>
        </View>
        <MoneyField label="Amount paid" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="50000" />
        <TextField label="Note (optional)" value={paymentNote} onChangeText={setPaymentNote} placeholder="Cash transfer, bank transfer…" />
        {error ? <Text style={{ color: palette.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button title={saving ? 'Saving…' : 'Record payment'} onPress={submitPayment} disabled={saving} />
      </SheetModal>
    </Screen>
  );
}

function AmountRow({ label, value, muted = false, strong = false }: { label: string; value: number; muted?: boolean; strong?: boolean }) {
  const palette = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: muted ? palette.textMuted : palette.textSecondary, fontSize: 14, fontWeight: strong ? '700' : '400' }}>{label}</Text>
      <MoneyText minor={value} style={{ color: muted ? palette.danger : palette.text, fontWeight: strong ? '700' : '500' }} />
    </View>
  );
}

function DueCard({ label, amount, tone }: { label: string; amount: number; tone: string }) {
  const palette = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: `${tone}14`, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: `${tone}2B` }}>
      <Text style={{ color: tone, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>{label}</Text>
      <MoneyText minor={amount} style={{ color: palette.text, fontSize: 18, fontWeight: '700', marginTop: 4 }} />
    </View>
  );
}

function Line() {
  const palette = useTheme();
  return <View style={{ height: 1, backgroundColor: palette.border, marginVertical: 6 }} />;
}

function OptionRow({ label, caption, active, onPress }: { label: string; caption: string; active: boolean; onPress: () => void }) {
  const palette = useTheme();
  return (
    <Card onPress={onPress} style={{ marginBottom: 8, borderColor: active ? palette.info : palette.border, borderWidth: active ? 2 : 1, padding: 12 }}>
      <Text style={{ color: active ? palette.info : palette.text, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 2 }}>{caption}</Text>
    </Card>
  );
}
