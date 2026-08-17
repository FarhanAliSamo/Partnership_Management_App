import { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Screen, Card, MoneyText } from '@/components/ui';
import { BarChart } from '@/components/charts';
import { useTheme } from '@/theme/useTheme';
import { useEarnings, useExpenses, useInvestments, useLoans, useSettlements } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { getRoIAnalytics } from '@/services/financeService';
import { netPositionDisplay } from '@/services/calculation/loans';
import * as calc from '@/services/calculation';
import { currentMonthKey } from '@/utils/date';
import { canForUser } from '@/services/permissionService';
import type { RecoveryResult } from '@/services/calculation';

export default function ReportsScreen() {
  const palette = useTheme();
  const user = useAuthStore((s) => s.user);
  const { earnings } = useEarnings();
  const { expenses } = useExpenses();
  const { investments } = useInvestments();
  const { loans } = useLoans();
  const { settlements } = useSettlements();

  const [recovery, setRecovery] = useState<RecoveryResult | null>(null);

  useEffect(() => {
    getRoIAnalytics().then((r) => setRecovery(r as RecoveryResult)).catch(() => undefined);
  }, [settlements.length, investments.length]);

  const totalRevenue = earnings.reduce((s, e) => s + e.amount_minor, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount_minor, 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalInvestment = investments.reduce((s, i) => s + i.amount_minor, 0);

  const netLoan = netPositionDisplay(loans.map((l) => ({ borrower: l.borrower, remaining_minor: l.remaining_minor })));

  const monthKey = currentMonthKey();
  const monthEarning = earnings.filter((e) => e.business_date.startsWith(monthKey)).reduce((s, e) => s + e.amount_minor, 0);
  const openDayCount = new Set(earnings.filter((e) => e.business_date.startsWith(monthKey)).map((e) => e.business_date)).size;
  const avgDaily = openDayCount > 0 ? Math.round(monthEarning / openDayCount) : 0;

  const isAdmin = canForUser(user, 'report:view');

  // Monthly chart data (last 6 months)
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of earnings) {
      const key = e.business_date.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + e.amount_minor);
    }
    const keys = Array.from(map.keys()).sort().slice(-6);
    return keys.map((k) => ({ label: k.slice(5, 7), value: Math.round(map.get(k)! / 1000) }));
  }, [earnings]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        <Card>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Total Revenue</Text>
          <MoneyText minor={totalRevenue} style={{ fontSize: 24, fontWeight: '700' }} />
        </Card>

        {isAdmin ? (
          <Card>
            <View style={{ gap: 3 }}>
              <Row label="Total Expenses" value={<MoneyText minor={totalExpenses} />} />
              <Row label="Net Profit" value={<MoneyText minor={netProfit} />} />
              <Row label="Avg Daily (open days)" value={<MoneyText minor={avgDaily} />} />
            </View>
          </Card>
        ) : (
          <Card>
            <Row label="Current Month" value={<MoneyText minor={monthEarning} />} />
            <Row label="Avg Daily Earning" value={<MoneyText minor={avgDaily} />} />
          </Card>
        )}

        {isAdmin ? (
          <Card>
            <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Investment Recovery</Text>
            <MoneyText minor={totalInvestment} style={{ fontSize: 20, fontWeight: '700' }} />
            {recovery ? (
              <View style={{ gap: 3, marginTop: 4 }}>
                <Row label="Recovered" value={<MoneyText minor={recovery.recoveredMinor} />} />
                <Row label="Remaining" value={<MoneyText minor={recovery.remainingMinor} />} />
                <Row label="Recovery %" value={<Text>{recovery.recoveryPercent}%</Text>} />
                <Row label="ROI" value={<Text>{recovery.roiPercent}%</Text>} />
                {recovery.paybackMonthsEstimate !== null ? (
                  <Row label="Est. Payback" value={<Text>{recovery.paybackMonthsEstimate} months (estimate)</Text>} />
                ) : null}
              </View>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Outstanding Loans</Text>
          <Text style={{ color: palette.text, fontSize: 15, marginTop: 4 }}>
            {netLoan.kind === 'manager_owes_admin'
              ? `Manager Owes Admin ${calc.money.format(netLoan.amount, 'PKR', 2)}`
              : netLoan.kind === 'admin_owes_manager'
                ? `Admin Owes Manager ${calc.money.format(netLoan.amount, 'PKR', 2)}`
                : 'No outstanding loans.'}
          </Text>
        </Card>

        <Card>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Settlements</Text>
          <Text style={{ color: palette.text, fontSize: 15, marginTop: 4 }}>
            {settlements.filter((s) => s.status === 'paid').length} paid ·{' '}
            {settlements.filter((s) => s.status === 'partial').length} partial ·{' '}
            {settlements.filter((s) => s.status === 'pending').length} pending
          </Text>
        </Card>

        {monthlyData.length > 1 ? (
          <Card>
            <Text style={{ color: palette.textSecondary, fontSize: 13, marginBottom: 8 }}>Monthly Earnings (Rs. ~000s)</Text>
            <BarChart data={monthlyData} />
          </Card>
        ) : null}
      </ScrollView>
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