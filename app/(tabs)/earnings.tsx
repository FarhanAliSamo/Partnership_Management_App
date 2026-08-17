import { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Button, EmptyState, SegmentedControl, LoadingState } from '@/components/ui';
import { EarningCard } from '@/components/domain';
import { useTheme } from '@/theme/useTheme';
import { useEarnings } from '@/hooks';
import * as calc from '@/services/calculation';
import { todayISO } from '@/utils/date';
import { getAllSettings } from '@/repositories/settingsRepository';
import { useEffect } from 'react';
import type { BusinessSettings } from '@/types';

type FilterKey = 'today' | 'week' | 'month' | 'all';

export default function EarningsScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { earnings, statuses, loading, reload } = useEarnings();
  const [filter, setFilter] = useState<FilterKey>('month');
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    getAllSettings().then(setSettings);
  }, []);

  const today = todayISO();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartISO = weekStart.toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const filtered = useMemo(() => {
    let list = earnings;
    if (filter === 'today') list = earnings.filter((e) => e.business_date === today);
    if (filter === 'week') list = earnings.filter((e) => e.business_date >= weekStartISO);
    if (filter === 'month') list = earnings.filter((e) => e.business_date >= monthStart);
    return list;
  }, [earnings, filter, today, weekStartISO, monthStart]);

  // Group by date
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
      const split = settings
        ? calc.split.split({
            totalMinor: grp.total,
            adminPercent: settings.adminSharePercent,
            managerPercent: settings.managerSharePercent,
          })
        : { adminMinor: 0, managerMinor: 0 };
      return { date, ...grp, split, status };
    });
  }, [filtered, statuses, settings]);

  // Merge closed days with no earnings
  const allDays = useMemo(() => {
    const result = [...days];
    for (const s of statuses) {
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
  }, [days, statuses]);

  return (
    <Screen>
      <View style={{ marginBottom: 12 }}>
        <SegmentedControl<FilterKey>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'all', label: 'All' },
          ]}
        />
      </View>

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