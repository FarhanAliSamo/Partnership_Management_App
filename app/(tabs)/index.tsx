import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, MoneyText, Button, SheetModal, Badge } from '@/components/ui';
import { Sparkline } from '@/components/charts';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSyncStore } from '@/stores/useSyncStore';
import { useEarnings, useLoans, useSettlements, useInvestments } from '@/hooks';
import { usePartnerNames } from '@/hooks/usePartnerNames';
import { useToastStore } from '@/stores/useToastStore';
import * as calc from '@/services/calculation';
import { addEarning } from '@/services/financeService';
import { toUserMessage } from '@/services/errors';
import {
  todayISO,
  currentMonthKey,
  greeting,
  addMonths,
  formatMonthDisplay,
  daysInMonth,
} from '@/utils/date';
import { netPositionDisplay } from '@/services/calculation/loans';
import { getAllSettings } from '@/repositories/settingsRepository';
import { parseIntAmount } from '@/services/calculation/money';
import type { BusinessSettings } from '@/types';
import * as SecureStore from 'expo-secure-store';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animate() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export default function HomeScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const { pendingCount, online } = useSyncStore();
  const { adminName, managerName } = usePartnerNames();
  const { earnings, statuses, loading } = useEarnings();
  const { loans } = useLoans();
  const { settlements } = useSettlements();
  const { investments } = useInvestments();

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reminderResolved, setReminderResolved] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  useEffect(() => {
    getAllSettings().then(setSettings);
  }, []);

  const today = todayISO();
  const monthKey = currentMonthKey();
  const lastMonthKey = addMonths(monthKey, -1);
  const isManager = user?.role_key === 'manager';

  useEffect(() => {
    setReminderResolved(false);
    SecureStore.getItemAsync(`daily-reminder-dismissed:${today}`)
      .then((value) => setDismissed(value === '1'))
      .catch(() => setDismissed(false))
      .finally(() => setReminderResolved(true));
  }, [today]);

  const todayRecorded = useMemo(() => {
    const hasEarning = earnings.some((e) => e.business_date === today);
    const hasStatus = statuses.some((s) => s.business_date === today);
    return { hasEarning, hasStatus, status: statuses.find((s) => s.business_date === today) };
  }, [earnings, statuses, today]);

  useEffect(() => {
    if (reminderResolved && !loading && !todayRecorded.hasEarning && !todayRecorded.hasStatus && !dismissed) {
      const t = setTimeout(() => {
        animate();
        setShowReminder(true);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [loading, todayRecorded, dismissed, reminderResolved]);

  const dismissReminder = () => {
    setShowReminder(false);
    setDismissed(true);
    SecureStore.setItemAsync(`daily-reminder-dismissed:${today}`, '1').catch(() => undefined);
  };

  const splitOf = (totalMinor: number) =>
    settings
      ? calc.split.split({
          totalMinor,
          adminPercent: settings.adminSharePercent,
          managerPercent: settings.managerSharePercent,
        })
      : { adminMinor: 0, managerMinor: 0 };

  const todayEarning = earnings
    .filter((e) => e.business_date === today)
    .reduce((s, e) => s + e.amount_minor, 0);
  const todaySplit = splitOf(todayEarning);

  // Month metrics
  const monthEarning = earnings
    .filter((e) => e.business_date.startsWith(monthKey))
    .reduce((s, e) => s + e.amount_minor, 0);
  const monthSplit = splitOf(monthEarning);

  const monthOpenDays = useMemo(() => {
    const dates = new Set<string>();
    for (const e of earnings) if (e.business_date.startsWith(monthKey)) dates.add(e.business_date);
    for (const s of statuses) if (s.business_date.startsWith(monthKey) && s.status !== 'closed') dates.add(s.business_date);
    return dates.size;
  }, [earnings, statuses, monthKey]);

  const monthClosedDays = useMemo(
    () => statuses.filter((s) => s.business_date.startsWith(monthKey) && s.status === 'closed').length,
    [statuses, monthKey]
  );

  const avgDaily = monthOpenDays > 0 ? Math.round(monthEarning / monthOpenDays) : 0;
  const runRate = avgDaily * (daysInMonth(monthKey) - monthClosedDays);

  const lastMonthEarning = earnings
    .filter((e) => e.business_date.startsWith(lastMonthKey))
    .reduce((s, e) => s + e.amount_minor, 0);

  // Sparkline: last 7 open-day totals (chronological)
  const spark = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of earnings) {
      map.set(e.business_date, (map.get(e.business_date) ?? 0) + e.amount_minor);
    }
    const days = Array.from(map.keys()).sort().slice(-7);
    return days.map((d) => map.get(d) ?? 0);
  }, [earnings]);

  const netLoan = netPositionDisplay(
    loans.map((l) => ({ borrower: l.borrower, remaining_minor: l.remaining_minor }))
  );

  const totalInvestment = investments.reduce((s, i) => s + i.amount_minor, 0);
  const recovered = settlements.reduce((s, st) => s + st.admin_due_minor, 0);
  const recoveryPercent = totalInvestment > 0 ? Math.round((recovered / totalInvestment) * 100) : 0;

  const friendName = isManager ? adminName : managerName;
  const loanSentence = useMemo(() => {
    if (netLoan.kind === 'manager_owes_admin') {
      const amount = calc.money.format(netLoan.amount, 'PKR', 2);
      return isManager ? `You owe ${friendName} ${amount}` : `${friendName} owes you ${amount}`;
    }
    if (netLoan.kind === 'admin_owes_manager') {
      const amount = calc.money.format(netLoan.amount, 'PKR', 2);
      return isManager ? `${friendName} owes you ${amount}` : `You owe ${friendName} ${amount}`;
    }
    return `No outstanding loan between you and ${friendName}.`;
  }, [netLoan, isManager, friendName]);

  const latestSettlement = settlements[0] ?? null;

  const submitQuick = async () => {
    if (!user) return;
    setQuickError(null);
    const major = parseFloat(quickAmount);
    if (!quickAmount || isNaN(major) || major <= 0) {
      setQuickError('Enter today’s earning amount.');
      return;
    }
    let units = 2;
    try {
      units = (await getAllSettings()).currencyMinorUnits;
    } catch {
      // default paisa
    }
    setQuickSaving(true);
    try {
      await addEarning(user, { business_date: today, amount_minor: parseIntAmount(major, units) });
      setQuickAmount('');
      setQuickOpen(false);
      setDismissed(true);
      SecureStore.setItemAsync(`daily-reminder-dismissed:${today}`, '1').catch(() => undefined);
      showToast('Today’s earning saved');
    } catch (e) {
      setQuickError(toUserMessage(e));
    } finally {
      setQuickSaving(false);
    }
  };

  const showBanner = !todayRecorded.hasEarning && !todayRecorded.hasStatus && dismissed && !bannerHidden;

  return (
    <Screen>
      {/* Compact header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>{greeting()}</Text>
          <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700' }}>{user?.display_name ?? 'Partner'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge label="Gaming Zone" tone="info" />
          {pendingCount > 0 ? (
            <Text style={{ color: palette.warning, fontSize: 12, fontWeight: '600' }}>☁ {pendingCount} pending</Text>
          ) : online ? (
            <Text style={{ color: palette.success, fontSize: 12, fontWeight: '600' }}>☁ Synced</Text>
          ) : (
            <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: '600' }}>☁ Offline</Text>
          )}
        </View>
      </View>

      {/* Reminder banner */}
      {showBanner ? (
        <View style={{ marginTop: 12 }}>
          <View
            style={{
              backgroundColor: `${palette.info}12`,
              borderWidth: 1,
              borderColor: `${palette.info}30`,
              borderRadius: 16,
              padding: 16,
              shadowColor: palette.info,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(139,92,246,0.18)',
                  borderWidth: 1,
                  borderColor: `${palette.info}40`,
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 18 }}>📝</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700', lineHeight: 20 }}>
                  Today’s earning not added
                </Text>
                <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
                  Add it now or mark the shop closed.
                </Text>
              </View>
            </View>

            {quickOpen ? (
              <View style={{ marginTop: 14, gap: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: palette.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: palette.info,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ color: palette.textMuted, fontSize: 13, fontWeight: '600', marginRight: 8 }}>PKR</Text>
                  <TextInput
                    value={quickAmount}
                    onChangeText={setQuickAmount}
                    placeholder="8,500"
                    placeholderTextColor={palette.textMuted}
                    autoFocus
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    style={{ flex: 1, color: palette.text, fontSize: 18, fontWeight: '600', paddingVertical: 12 }}
                  />
                </View>
                {quickError ? <Text style={{ color: palette.danger, fontSize: 13 }}>{quickError}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button title={quickSaving ? 'Saving…' : 'Save earning'} onPress={submitQuick} disabled={quickSaving} style={{ paddingVertical: 12 }} />
                  </View>
                  <Button title="Cancel" variant="ghost" onPress={() => { setQuickOpen(false); setQuickAmount(''); setQuickError(null); }} style={{ paddingVertical: 12, paddingHorizontal: 16 }} />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Button title="Add earning" onPress={() => { animate(); setQuickOpen(true); }} style={{ paddingVertical: 11 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Shop closed" variant="secondary" onPress={() => router.push('/earning/close-day')} style={{ paddingVertical: 11 }} />
                </View>
                <Button title="Later" variant="ghost" onPress={() => { animate(); setBannerHidden(true); }} style={{ paddingVertical: 11, paddingHorizontal: 14 }} />
              </View>
            )}
          </View>
        </View>
      ) : null}

      {/* Today status card */}
      <Card
        style={{
          marginTop: 14,
          backgroundColor: todayRecorded.hasEarning ? `${palette.info}0E` : palette.surface,
          borderColor: todayRecorded.hasEarning ? `${palette.info}30` : palette.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '600' }}>Today’s earning</Text>
          {todayRecorded.hasStatus ? (
            <Badge label={todayRecorded.status?.status === 'closed' ? 'Closed' : 'Shop open'} tone={todayRecorded.status?.status === 'closed' ? 'warning' : 'success'} />
          ) : todayRecorded.hasEarning ? (
            <Badge label="Shop open" tone="success" />
          ) : (
            <Badge label="Not recorded" tone="neutral" />
          )}
        </View>

        {todayRecorded.hasStatus && todayRecorded.status?.status === 'closed' ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: palette.text, fontSize: 26, fontWeight: '700' }}>Closed, no earning</Text>
            {todayRecorded.status?.reason ? (
              <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 4 }}>{todayRecorded.status.reason}</Text>
            ) : null}
          </View>
        ) : (
          <>
            <MoneyText minor={todayEarning} style={{ fontSize: 32, fontWeight: '700', marginTop: 6 }} />
            <View style={{ height: 1, backgroundColor: palette.border, marginVertical: 14, opacity: 0.6 }} />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>{adminName} share</Text>
                <MoneyText minor={todaySplit.adminMinor} style={{ fontSize: 16, fontWeight: '700', color: palette.info, marginTop: 2 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>{managerName} share</Text>
                <MoneyText minor={todaySplit.managerMinor} style={{ fontSize: 16, fontWeight: '700', color: palette.infoSecondary, marginTop: 2 }} />
              </View>
            </View>
          </>
        )}
      </Card>

      {/* Quick actions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 12, paddingBottom: 4 }}>
        <QuickAction label="Add Earning" emoji="＋" tone={palette.success} onPress={() => router.push('/earning/add')} />
        <QuickAction label="Shop Closed" emoji="✕" tone={palette.danger} onPress={() => router.push('/earning/close-day')} />
        <QuickAction label="Add Expense" emoji="–" tone={palette.warning} onPress={() => router.push('/expense/add')} />
        <QuickAction label="Add Loan" emoji="↔" tone={palette.info} onPress={() => router.push('/(tabs)/finance/loan-add')} />
      </ScrollView>

      {/* Monthly overview */}
      <Card style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>This month</Text>
          <Text style={{ color: palette.info, fontSize: 13, fontWeight: '600' }}>{formatMonthDisplay(monthKey)}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Metric label="Total earning" value={<MoneyText minor={monthEarning} style={{ fontSize: 18, fontWeight: '700' }} />} />
          <Metric label="Avg daily" value={<MoneyText minor={avgDaily} style={{ fontSize: 18, fontWeight: '700' }} />} />
          <Metric label="Days open" value={<Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>{monthOpenDays}</Text>} />
          <Metric label="Days closed" value={<Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>{monthClosedDays}</Text>} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>Current run rate</Text>
            <MoneyText minor={runRate} style={{ fontSize: 20, fontWeight: '700', color: palette.info, marginTop: 2 }} />
            <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 2 }}>Estimated</Text>
          </View>
          <Sparkline data={spark.length >= 2 ? spark : [0, monthEarning]} width={120} height={40} color={palette.info} />
        </View>
        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 10 }}>
          {formatMonthDisplay(lastMonthKey)} {calc.money.format(lastMonthEarning, 'PKR', 2)}
        </Text>
      </Card>

      {/* Finance snapshot */}
      <Card style={{ marginTop: 12 }}>
        <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700', marginBottom: 12 }}>Finance snapshot</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 14 }}>{loanSentence}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1, backgroundColor: palette.surfaceAlt, borderRadius: 12, padding: 12 }}>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>Total investment</Text>
            <MoneyText minor={totalInvestment} style={{ fontSize: 16, fontWeight: '700', marginTop: 2 }} />
          </View>
          <View style={{ flex: 1, backgroundColor: palette.surfaceAlt, borderRadius: 12, padding: 12 }}>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>Recovery</Text>
            <Text style={{ color: palette.success, fontSize: 16, fontWeight: '700', marginTop: 2 }}>{recoveryPercent}%</Text>
          </View>
        </View>
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.border, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: palette.textSecondary, fontSize: 14 }}>My share this month</Text>
            <MoneyText
              minor={isManager ? monthSplit.managerMinor : monthSplit.adminMinor}
              style={{ fontWeight: '700', color: palette.info }}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: palette.textSecondary, fontSize: 14 }}>{friendName} share</Text>
            <MoneyText
              minor={isManager ? monthSplit.adminMinor : monthSplit.managerMinor}
              style={{ fontWeight: '700', color: palette.infoSecondary }}
            />
          </View>
        </View>
      </Card>

      {/* Latest settlement */}
      {latestSettlement ? (
        <Card
          style={{ marginTop: 12 }}
          onPress={() => router.push({ pathname: '/(tabs)/finance/settlement-detail', params: { id: latestSettlement.id } })}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>Latest settlement</Text>
            <Badge label={latestSettlement.status} tone={latestSettlement.status === 'paid' ? 'success' : latestSettlement.status === 'partial' ? 'warning' : 'neutral'} />
          </View>
          <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 4 }}>{formatMonthDisplay(latestSettlement.month)} · tap for full breakdown</Text>
        </Card>
      ) : null}

      {/* Daily reminder modal */}
      <SheetModal visible={showReminder} onClose={dismissReminder} title="Today’s earning">
        <Text style={{ color: palette.textSecondary, fontSize: 15, marginBottom: 16 }}>
          Have you added today’s earning?
        </Text>
        <View style={{ gap: 10 }}>
          <Button title="Add Earning" onPress={() => { dismissReminder(); router.push('/earning/add'); }} />
          <Button title="Shop Closed / No Earning" variant="secondary" onPress={() => { dismissReminder(); router.push('/earning/close-day'); }} />
          <Button title="Later" variant="ghost" onPress={dismissReminder} />
        </View>
      </SheetModal>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  const palette = useTheme();
  return (
    <View style={{ width: '50%', paddingVertical: 8 }}>
      <Text style={{ color: palette.textMuted, fontSize: 12 }}>{label}</Text>
      <View style={{ marginTop: 2 }}>{value}</View>
    </View>
  );
}

function QuickAction({ label, emoji, tone, onPress }: { label: string; emoji: string; tone: string; onPress: () => void }) {
  const palette = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: `${tone}1A`,
        borderRadius: 999,
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: `${tone}35`,
      }}
    >
      <Text style={{ color: tone, fontSize: 15, fontWeight: '700' }}>{emoji}</Text>
      <Text style={{ color: palette.text, fontWeight: '600', fontSize: 13 }} onPress={onPress}>{label}</Text>
    </View>
  );
}