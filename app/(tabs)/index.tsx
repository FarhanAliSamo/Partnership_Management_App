import { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, MoneyText, Button, SheetModal } from '@/components/ui';
import { DailyReminderBanner } from '@/components/domain';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEarnings } from '@/hooks';
import { useLoans } from '@/hooks';
import { useSettlements } from '@/hooks';
import * as calc from '@/services/calculation';
import { todayISO, currentMonthKey, greeting } from '@/utils/date';
import { netPositionDisplay } from '@/services/calculation/loans';
import { getAllSettings } from '@/repositories/settingsRepository';
import type { BusinessSettings } from '@/types';

export default function HomeScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { earnings, statuses, loading } = useEarnings();
  const { loans } = useLoans();
  const { settlements } = useSettlements();

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getAllSettings().then(setSettings);
  }, []);

  const today = todayISO();
  const monthKey = currentMonthKey();

  const todayRecorded = useMemo(() => {
    const hasEarning = earnings.some((e) => e.business_date === today);
    const hasStatus = statuses.some((s) => s.business_date === today);
    return { hasEarning, hasStatus, status: statuses.find((s) => s.business_date === today) };
  }, [earnings, statuses, today]);

  useEffect(() => {
    if (!loading && !todayRecorded.hasEarning && !todayRecorded.hasStatus && !dismissed) {
      const t = setTimeout(() => setShowReminder(true), 400);
      return () => clearTimeout(t);
    }
  }, [loading, todayRecorded, dismissed]);

  // Today's earning + share
  const todayEarning = earnings
    .filter((e) => e.business_date === today)
    .reduce((s, e) => s + e.amount_minor, 0);

  const split = settings
    ? calc.split.split({
        totalMinor: todayEarning,
        adminPercent: settings.adminSharePercent,
        managerPercent: settings.managerSharePercent,
      })
    : { adminMinor: 0, managerMinor: 0 };

  // Month total
  const monthEarning = earnings
    .filter((e) => e.business_date.startsWith(monthKey))
    .reduce((s, e) => s + e.amount_minor, 0);

  const netLoan = netPositionDisplay(
    loans.map((l) => ({ borrower: l.borrower, remaining_minor: l.remaining_minor }))
  );

  const latestSettlement = settlements[0] ?? null;

  const showBanner = !todayRecorded.hasEarning && !todayRecorded.hasStatus && dismissed;

  return (
    <Screen>
      <Text style={{ color: palette.textMuted, fontSize: 14 }}>
        {greeting()}
      </Text>
      <Text style={{ color: palette.text, fontSize: 26, fontWeight: '700', marginBottom: 16 }}>
        {user?.display_name ?? 'Partner'}
      </Text>

      {showBanner ? (
        <View style={{ marginBottom: 12 }}>
          <DailyReminderBanner
            onAdd={() => router.push('/earning/add')}
            onClosed={() => router.push('/earning/close-day')}
          />
        </View>
      ) : null}

      {/* Today's card */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13, marginBottom: 4 }}>
          Today's Earning
        </Text>
        {todayRecorded.hasStatus && todayRecorded.status?.status === 'closed' ? (
          <View>
            <Text style={{ color: palette.text, fontSize: 22, fontWeight: '700' }}>Closed — No Earning</Text>
            {todayRecorded.status?.reason ? (
              <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 4 }}>
                {todayRecorded.status.reason}
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <MoneyText minor={todayEarning} style={{ fontSize: 30, fontWeight: '700' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <View>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>Admin share</Text>
                <MoneyText minor={split.adminMinor} style={{ fontSize: 16, fontWeight: '600' }} />
              </View>
              <View>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>Manager share</Text>
                <MoneyText minor={split.managerMinor} style={{ fontSize: 16, fontWeight: '600' }} />
              </View>
            </View>
          </>
        )}
      </Card>

      {/* Current month */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Current Month Revenue</Text>
        <MoneyText minor={monthEarning} style={{ fontSize: 22, fontWeight: '700' }} />
      </Card>

      {/* Loans */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Outstanding Loans</Text>
        <Text style={{ color: palette.text, fontSize: 16, marginTop: 4 }}>
          {netLoan.kind === 'manager_owes_admin'
            ? `Manager Owes Admin ${calc.money.format(netLoan.amount, 'PKR', 2)}`
            : netLoan.kind === 'admin_owes_manager'
              ? `Admin Owes Manager ${calc.money.format(netLoan.amount, 'PKR', 2)}`
              : 'No outstanding loans between partners.'}
        </Text>
      </Card>

      {/* Settlement */}
      {latestSettlement ? (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Latest Settlement</Text>
          <Text style={{ color: palette.text, fontSize: 16, marginTop: 4 }}>
            {latestSettlement.month} · {latestSettlement.status}
          </Text>
        </Card>
      ) : null}

      {!todayRecorded.hasEarning && !todayRecorded.hasStatus ? (
        <Button
          title="Add Today's Earning"
          onPress={() => router.push('/earning/add')}
        />
      ) : null}

      {/* Daily reminder modal */}
      <SheetModal
        visible={showReminder}
        onClose={() => {
          setShowReminder(false);
          setDismissed(true);
        }}
        title="Today's Earning"
      >
        <Text style={{ color: palette.textSecondary, fontSize: 15, marginBottom: 16 }}>
          Have you added today's earning?
        </Text>
        <View style={{ gap: 10 }}>
          <Button
            title="Add Earning"
            onPress={() => {
              setShowReminder(false);
              router.push('/earning/add');
            }}
          />
          <Button
            title="Shop Closed / No Earning"
            variant="secondary"
            onPress={() => {
              setShowReminder(false);
              router.push('/earning/close-day');
            }}
          />
          <Button
            title="Later"
            variant="ghost"
            onPress={() => {
              setShowReminder(false);
              setDismissed(true);
            }}
          />
        </View>
      </SheetModal>
    </Screen>
  );
}