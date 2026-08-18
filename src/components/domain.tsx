import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Card, Badge, MoneyText } from './ui';
import { useTheme } from '@/theme/useTheme';
import { spacing, radii } from '@/theme';
import {
  DAY_LABELS,
  SYNC_LABELS,
  LOAN_STATUS_LABELS,
  SETTLEMENT_STATUS_LABELS,
} from '@/constants/enums';
import { formatDateDisplay, formatMonthDisplay } from '@/utils/date';
import { usePartnerNames } from '@/hooks/usePartnerNames';
import type { Expense, Investment, Loan, MonthlySettlement, Partner } from '@/types';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const palette = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ color: palette.textSecondary, fontSize: 14 }}>{label}</Text>
      <View>{value}</View>
    </View>
  );
}

function ViewDetails() {
  const palette = useTheme();
  return <Text style={{ color: palette.info, fontSize: 13, fontWeight: '600', marginTop: 8 }}>View details →</Text>;
}

function SyncBadge({ syncState }: { syncState: string }) {
  const tone =
    syncState === 'pending'
      ? 'warning'
      : syncState === 'failed' || syncState === 'conflict'
        ? 'danger'
        : 'success';
  return <Badge label={SYNC_LABELS[syncState] ?? syncState} tone={tone} />;
}

export function SyncIndicator({ syncState }: { syncState: string }) {
  return <SyncBadge syncState={syncState} />;
}

/** Human label: "Friend owes you" direction depends on who the borrower is from
 *  the current viewer's perspective. We report both directions explicitly. */
export function loanDirectionLabel(
  loan: Pick<Loan, 'borrower' | 'lender'>,
  viewer: Partner = 'admin'
): string {
  return loan.borrower === viewer ? 'You owe friend' : 'Friend owes you';
}

export function EarningCard({
  date,
  totalMinor,
  adminMinor,
  managerMinor,
  status,
  reason,
  syncState,
  onPress,
}: {
  date: string;
  totalMinor: number;
  adminMinor: number;
  managerMinor: number;
  status?: string;
  reason?: string | null;
  syncState: string;
  onPress?: () => void;
}) {
  const palette = useTheme();
  const { adminName, managerName } = usePartnerNames();
  const closed = status === 'closed';
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>
          {formatDateDisplay(date)}
        </Text>
        {closed ? <Badge label="Closed" tone="warning" /> : <SyncIndicator syncState={syncState} />}
      </View>
      {closed ? (
        <View style={{ marginTop: 6 }}>
          <Text style={{ color: palette.textMuted, fontSize: 14 }}>{DAY_LABELS.closed}</Text>
          {reason ? (
            <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 2 }}>{reason}</Text>
          ) : null}
        </View>
      ) : (
        <View style={{ marginTop: 8, gap: 2 }}>
          <Row label="Daily total" value={<MoneyText minor={totalMinor} style={{ fontWeight: '700' }} />} />
          <Row label={`${adminName} share`} value={<MoneyText minor={adminMinor} style={{ color: palette.textSecondary }} />} />
          <Row label={`${managerName} share`} value={<MoneyText minor={managerMinor} style={{ color: palette.textSecondary }} />} />
        </View>
      )}
      {onPress ? <ViewDetails /> : null}
    </Card>
  );
}

export function ExpenseCard({ expense, onPress }: { expense: Expense; onPress?: () => void }) {
  const palette = useTheme();
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>{expense.category}</Text>
        <MoneyText minor={expense.amount_minor} style={{ fontWeight: '700', color: palette.danger }} />
      </View>
      <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 4 }}>{expense.description}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{formatDateDisplay(expense.business_date)}</Text>
        {expense.is_wifi ? <Badge label="WiFi (separate)" tone="info" /> : <Badge label="Affects your share" tone="warning" />}
      </View>
      {onPress ? <ViewDetails /> : null}
    </Card>
  );
}

export function InvestmentCard({ investment, onPress }: { investment: Investment; onPress?: () => void }) {
  const palette = useTheme();
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>{investment.item_name}</Text>
        <MoneyText minor={investment.amount_minor} style={{ fontWeight: '700' }} />
      </View>
      <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 4 }}>
        {investment.category} · {formatDateDisplay(investment.business_date)}
      </Text>
      {onPress ? <ViewDetails /> : null}
    </Card>
  );
}

export function LoanCard({ loan, onPress, viewer = 'admin' }: { loan: Loan; onPress?: () => void; viewer?: Partner }) {
  const palette = useTheme();
  const { adminName, managerName } = usePartnerNames();
  const friendName = viewer === 'manager' ? adminName : managerName;
  const label = loan.borrower === viewer ? `You owe ${friendName}` : `${friendName} owes you`;
  const statusLabel = LOAN_STATUS_LABELS[loan.status] ?? loan.status;
  const owesMe = loan.borrower !== viewer;
  const paid = Math.max(0, loan.amount_minor - loan.remaining_minor);
  const progress = loan.amount_minor > 0 ? paid / loan.amount_minor : 0;
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>{label}</Text>
        <Badge
          label={statusLabel}
          tone={loan.status === 'paid' ? 'success' : owesMe ? 'success' : 'danger'}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ color: palette.textMuted, fontSize: 13 }}>Remaining</Text>
        <MoneyText minor={loan.remaining_minor} style={{ fontWeight: '700', color: loan.remaining_minor > 0 ? (owesMe ? palette.success : palette.danger) : palette.text }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ color: palette.textMuted, fontSize: 13 }}>Original</Text>
        <MoneyText minor={loan.amount_minor} style={{ color: palette.textSecondary }} />
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.surfaceAlt, marginTop: 12, overflow: 'hidden' }}>
        <View
          style={{
            height: 6,
            borderRadius: 3,
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: loan.status === 'paid' ? palette.success : palette.info,
          }}
        />
      </View>
      {onPress ? <ViewDetails /> : null}
    </Card>
  );
}

export function SettlementCard({
  settlement,
  onPress,
}: {
  settlement: MonthlySettlement;
  onPress?: () => void;
}) {
  const palette = useTheme();
  const { adminName, managerName } = usePartnerNames();
  const tone =
    settlement.status === 'paid' ? 'success' : settlement.status === 'partial' ? 'warning' : 'neutral';
  const statusLabel = SETTLEMENT_STATUS_LABELS[settlement.status] ?? settlement.status;
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>
          {formatMonthDisplay(settlement.month)}
        </Text>
        <Badge label={statusLabel} tone={tone} />
      </View>
      <Row label={`${adminName} final due`} value={<MoneyText minor={settlement.admin_due_minor} />} />
      <Row label={`${managerName} final due`} value={<MoneyText minor={settlement.manager_due_minor} />} />
      {onPress ? <ViewDetails /> : null}
    </Card>
  );
}

export function AllocationBreakdown({
  allocations,
  totalMinor,
}: {
  allocations: { allocation_type: string; amount_minor: number }[];
  totalMinor: number;
}) {
  const palette = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {allocations.map((a, i) => {
        const label =
          a.allocation_type === 'received'
            ? 'Amount received'
            : a.allocation_type === 'loan_payment'
              ? 'Loan paid from share'
              : a.allocation_type;
        return <Row key={i} label={label} value={<MoneyText minor={a.amount_minor} />} />;
      })}
      <View style={{ height: 1, backgroundColor: palette.border, marginVertical: 6 }} />
      <Row label="Total allocated" value={<MoneyText minor={totalMinor} style={{ fontWeight: '700' }} />} />
    </View>
  );
}

export function DailyReminderBanner({ onAdd, onClosed }: { onAdd: () => void; onClosed: () => void }) {
  const palette = useTheme();
  return (
    <View
      style={{
        backgroundColor: `${palette.info}18`,
        borderRadius: radii.md,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.text, fontWeight: '600' }}>Today's earning not added</Text>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Add it now or mark shop closed.</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <PressableButton title="Add" onPress={onAdd} />
        <PressableButton title="Closed" variant="ghost" onPress={onClosed} />
      </View>
    </View>
  );
}

function PressableButton({
  title,
  onPress,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
}) {
  const palette = useTheme();
  const bg = variant === 'primary' ? palette.info : 'transparent';
  const fg = variant === 'primary' ? '#FFFFFF' : palette.info;
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: bg,
        borderRadius: radii.sm,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: fg, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}
