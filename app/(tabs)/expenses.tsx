import { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, EmptyState, LoadingState, SegmentedControl } from '@/components/ui';
import { ExpenseCard } from '@/components/domain';
import { useExpenses } from '@/hooks';
import { currentMonthKey } from '@/utils/date';

type FilterKey = 'month' | 'all';

export default function ExpensesScreen() {
  const router = useRouter();
  const { expenses, loading } = useExpenses();
  const [filter, setFilter] = useState<FilterKey>('month');
  const monthStart = currentMonthKey() + '-01';

  const filtered = useMemo(
    () => (filter === 'month' ? expenses.filter((e) => e.business_date >= monthStart) : expenses),
    [expenses, filter, monthStart]
  );

  return (
    <Screen>
      <View style={{ marginBottom: 12 }}>
        <SegmentedControl<FilterKey>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'month', label: 'This Month' },
            { key: 'all', label: 'All' },
          ]}
        />
      </View>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState title="No expenses this month." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => <ExpenseCard expense={item} />}
        />
      )}

      <View style={{ marginTop: 12 }}>
        <Button title="Add Expense" onPress={() => router.push('/expense/add')} />
      </View>
    </Screen>
  );
}