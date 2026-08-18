import { useMemo, useState, useEffect } from 'react';
import { View, FlatList, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, EmptyState, SegmentedControl, LoadingState, Card, MoneyText } from '@/components/ui';
import { DateField } from '@/components/fields';
import { EarningCard } from '@/components/domain';
import { useTheme } from '@/theme/useTheme';
import { useEarnings } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePartnerNames } from '@/hooks/usePartnerNames';
import { canForUser } from '@/services/permissionService';
import * as calc from '@/services/calculation';
import { todayISO, addMonths, daysInMonth, currentMonthKey, formatMonthDisplay } from '@/utils/date';
import { getAllSettings } from '@/repositories/settingsRepository';
import type { BusinessSettings } from '@/types';

type FilterKey = 'today' | 'week' | 'month' | 'previous' | 'custom' | 'all';

export default function EarningsScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { adminName, managerName } = usePartnerNames();
  const { earnings, statuses, loading } = useEarnings();
  const [filter, setFilter] = useState<FilterKey>('month');
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const canEdit = canForUser(user, 'earning:edit');

  useEffect(() => {
    getAllSettings().then(setSettings);
  }, []);

  const today = todayISO();
  const monthKey = currentMonthKey();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartISO = weekStart.toISOString().slice(0, 10);
  const monthStart = `${monthKey}-01`;
  const previousMonth = addMonths(monthKey, -1);
  const previousMonthStart = `${previousMonth}-01`;
  const previousMonthEnd = `${previousMonth}-${daysInMonth(previousMonth)}`;
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);

  const matchesFilter = (date: string) => {
    if (filter === 'today') return date === today;
    if (filter === 'week') return date >= weekStartISO && date <= today;
    if (filter === 'month') return date >= monthStart && date <= today;
    if (filter === 'previous') return date >= previousMonthStart && date <= previousMonthEnd;
    if (filter === 'custom') return date >= fromDate && date <= toDate;
    return true;
  };

  const splitOf = (totalMinor: number) =>
    settings
      ? calc.split.split({
          totalMinor,
          adminPercent: settings.adminSharePercent,
          managerPercent: settings.managerSharePercent,
        })
      : { adminMinor: 0, managerMinor: 0 };

  const summary = useMemo(() => {
    const thisMonth = earnings
      .filter((e) => e.business_date.startsWith(monthKey))
      .reduce((s, e) => s + e.amount_minor, 0);
    const lastMonth = earnings
      .filter((e) => e.business_date.startsWith(previousMonth))
      .reduce((s, e) => s + e.amount_minor, 0);
    return {
      thisMonth,
      thisMonthSplit: splitOf(thisMonth),
      lastMonth,
      lastMonthSplit: splitOf(lastMonth),
    };
  }, [earnings, monthKey, previousMonth, settings]);

  const filtered = useMemo(() => {
    return earnings.filter((earning) => matchesFilter(earning.business_date));
  }, [earnings, filter, today, weekStartISO, monthStart, previousMonthStart, previousMonthEnd, fromDate, toDate]);

  const days = useMemo(() => {
    const map = new Map<string, { total: number; entries: typeof filtered }>();
    for (const e of filtered) {
      const cur = map.get(e.business_date) ?? { total: 0, entries: [] as typeof filtered };
      cur.total += e.amount_minor;
      cur.entries.push(e);
      map.set(e.business_date, cur);
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((date) => {
      const grp = map.get(date)!;
      const status = statuses.find((s) => s.business_date === date);
      const split = splitOf(grp.total);
      return { date, ...grp, split, status };
    });
  }, [filtered, statuses, settings]);

  const allDays = useMemo(() => {
    const result = [...days];
    for (const s of statuses.filter((status) => matchesFilter(status.business_date))) {
      if (s.status === 'closed' && !result.some((d) => d.date === s.business_date)) {
        result.push({
          date: s.business_date,
          total: 0,
          entries: [],
          split: { adminMinor: 0, managerMinor: 0 },
          status: s,
        });
      }
    }
    return result.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [days, statuses, filter, today, weekStartISO, monthStart, previousMonthStart, previousMonthEnd, fromDate, toDate]);

  return (
    <Screen>
      {/* Summary: last month vs this month */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>{formatMonthDisplay(previousMonth)}</Text>
            <MoneyText minor={summary.lastMonth} style={{ fontSize: 16, fontWeight: '600', marginTop: 2 }} />
            <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 2 }}>
              {adminName} {calc.money.format(summary.lastMonthSplit.adminMinor, 'PKR', 2)}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 11 }}>
              {managerName} {calc.money.format(summary.lastMonthSplit.managerMinor, 'PKR', 2)}
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: palette.border, marginHorizontal: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.info, fontSize: 12, fontWeight: '700' }}>{formatMonthDisplay(monthKey)}</Text>
            <MoneyText minor={summary.thisMonth} style={{ fontSize: 16, fontWeight: '700', marginTop: 2 }} />
            <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 2 }}>
              {adminName} {calc.money.format(summary.thisMonthSplit.adminMinor, 'PKR', 2)}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 11 }}>
              {managerName} {calc.money.format(summary.thisMonthSplit.managerMinor, 'PKR', 2)}
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ marginBottom: 12 }}>
        <SegmentedControl<FilterKey>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'previous', label: 'Last' },
            { key: 'custom', label: 'Range' },
          ]}
        />
      </View>

      {filter === 'custom' ? (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1 }}><DateField label="From" value={fromDate} onChange={setFromDate} /></View>
          <View style={{ flex: 1 }}><DateField label="To" value={toDate} onChange={setToDate} /></View>
        </View>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : allDays.length === 0 ? (
        <EmptyState title="No earnings recorded yet." />
      ) : (
        <FlatList
          data={allDays}
          keyExtractor={(item) => item.date}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <EarningCard
              date={item.date}
              totalMinor={item.total}
              adminMinor={item.split.adminMinor}
              managerMinor={item.split.managerMinor}
              status={item.status?.status}
              reason={item.status?.reason}
              syncState={item.entries[0]?.sync_state ?? item.status?.sync_state ?? 'synced'}
              onPress={
                canEdit && item.entries[0]
                  ? () => router.push({ pathname: '/earning/edit', params: { id: item.entries[0]!.id } })
                  : undefined
              }
            />
          )}
        />
      )}

      <View style={{ marginTop: 12 }}>
        <Button title="Add Earning" onPress={() => router.push('/earning/add')} />
        <View style={{ height: 10 }} />
        <Button title="Shop Closed / No Earning" variant="secondary" onPress={() => router.push('/earning/close-day')} />
      </View>
    </Screen>
  );
}