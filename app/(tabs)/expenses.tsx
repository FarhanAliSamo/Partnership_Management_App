import { useMemo, useState } from 'react';
import { View, FlatList, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, EmptyState, LoadingState, SegmentedControl, Card, MoneyText } from '@/components/ui';
import { ExpenseCard } from '@/components/domain';
import { useExpenses } from '@/hooks';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { canForUser } from '@/services/permissionService';
import { currentMonthKey, todayISO } from '@/utils/date';

type FilterKey = 'today' | 'month' | 'all';

export default function ExpensesScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { expenses, loading } = useExpenses();
  const [filter, setFilter] = useState<FilterKey>('month');
  const canEdit = canForUser(user, 'expense:edit');

  const today = todayISO();
  const monthStart = currentMonthKey() + '-01';

  const filtered = useMemo(() => {
    if (filter === 'today') return expenses.filter((e) => e.business_date === today);
    if (filter === 'month') return expenses.filter((e) => e.business_date >= monthStart);
    return expenses;
  }, [expenses, filter, today, monthStart]);

  const monthSummary = useMemo(() => {
    const monthExpenses = expenses.filter((e) => e.business_date >= monthStart);
    let wifi = 0;
    let other = 0;
    for (const e of monthExpenses) {
      if (e.is_wifi || e.category === 'WiFi') wifi += e.amount_minor;
      else other += e.amount_minor;
    }
    return { wifi, other, total: wifi + other };
  }, [expenses, monthStart]);

  return (
    <Screen>
      <View style={{ marginBottom: 12 }}>
        <SegmentedControl<FilterKey>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'today', label: 'Today' },
            { key: 'month', label: 'This Month' },
            { key: 'all', label: 'All' },
          ]}
        />
      </View>

      {filter === 'month' ? (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>This month’s expenses</Text>
          <MoneyText minor={monthSummary.total} style={{ fontSize: 22, fontWeight: '700', marginTop: 2 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>WiFi, shared</Text>
            <MoneyText minor={monthSummary.wifi} style={{ color: palette.textSecondary, fontSize: 13 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>Other, from your share</Text>
            <MoneyText minor={monthSummary.other} style={{ color: palette.danger, fontSize: 13 }} />
          </View>
        </Card>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState title="No expenses found." subtitle="Add an expense to start tracking." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <ExpenseCard
              expense={item}
              onPress={canEdit ? () => router.push({ pathname: '/expense/edit', params: { id: item.id } }) : undefined}
            />
          )}
        />
      )}

      <View style={{ marginTop: 12 }}>
        <Button title="Add Expense" onPress={() => router.push('/expense/add')} />
      </View>
    </Screen>
  );
}