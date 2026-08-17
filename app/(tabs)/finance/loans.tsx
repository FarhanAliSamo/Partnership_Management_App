import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, MoneyText, Button, EmptyState } from '@/components/ui';
import { LoanCard } from '@/components/domain';
import { useTheme } from '@/theme/useTheme';
import { useLoans } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { netPositionDisplay } from '@/services/calculation/loans';
import * as calc from '@/services/calculation';
import { canForUser } from '@/services/permissionService';

export default function LoansScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { loans } = useLoans();

  const net = netPositionDisplay(
    loans.map((l) => ({ borrower: l.borrower, remaining_minor: l.remaining_minor }))
  );
  const canAdd = canForUser(user, 'loan:create');

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Net position</Text>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700', marginTop: 4 }}>
          {net.kind === 'manager_owes_admin'
            ? `Friend owes you ${calc.money.format(net.amount, 'PKR', 2)}`
            : net.kind === 'admin_owes_manager'
              ? `You owe friend ${calc.money.format(net.amount, 'PKR', 2)}`
              : 'No outstanding loans between you.'}
        </Text>
      </Card>

      {loans.length === 0 ? (
        <EmptyState title="No outstanding loans." />
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(l) => l.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <LoanCard
              loan={item}
              onPress={() => router.push({ pathname: '/(tabs)/finance/loan-detail', params: { id: item.id } })}
            />
          )}
        />
      )}

      {canAdd ? (
        <View style={{ marginTop: 12 }}>
          <Button title="Add Loan" onPress={() => router.push('/(tabs)/finance/loan-add')} />
        </View>
      ) : null}
    </Screen>
  );
}