import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, MoneyText, Button, EmptyState } from '@/components/ui';
import { LoanCard } from '@/components/domain';
import { useTheme } from '@/theme/useTheme';
import { useLoans } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePartnerNames } from '@/hooks/usePartnerNames';
import { netPositionDisplay } from '@/services/calculation/loans';
import * as calc from '@/services/calculation';
import { canForUser } from '@/services/permissionService';

export default function LoansScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { adminName, managerName } = usePartnerNames();
  const { loans } = useLoans();
  const viewer = user?.role_key === 'manager' ? 'manager' : 'admin';
  const friendName = viewer === 'manager' ? adminName : managerName;

  const net = netPositionDisplay(
    loans.map((l) => ({ borrower: l.borrower, remaining_minor: l.remaining_minor }))
  );

  // Direction split for the two summary cards
  const friendOwes = calc.loans.outstandingForBorrower(
    loans.map((l) => ({ borrower: l.borrower, remaining_minor: l.remaining_minor })),
    viewer === 'manager' ? 'admin' : 'manager'
  );
  const iOwe = calc.loans.outstandingForBorrower(
    loans.map((l) => ({ borrower: l.borrower, remaining_minor: l.remaining_minor })),
    viewer
  );

  const canAdd = canForUser(user, 'loan:create');
  const activeLoans = loans.filter((l) => l.status === 'active');

  return (
    <Screen>
      {/* Two summary cards */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <SummaryCard
          label={`${friendName} owes you`}
          minor={friendOwes}
          tone={palette.success}
        />
        <SummaryCard
          label={`You owe ${friendName}`}
          minor={iOwe}
          tone={palette.danger}
        />
      </View>

      <Card style={{ marginBottom: 12, backgroundColor: `${palette.info}10`, borderColor: `${palette.info}35` }}>
        <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>Net position</Text>
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700', marginTop: 6 }}>
          {net.kind === 'manager_owes_admin'
            ? viewer === 'manager'
              ? `You owe ${friendName} ${calc.money.format(net.amount, 'PKR', 2)}`
              : `${friendName} owes you ${calc.money.format(net.amount, 'PKR', 2)}`
            : net.kind === 'admin_owes_manager'
              ? viewer === 'admin'
                ? `You owe ${friendName} ${calc.money.format(net.amount, 'PKR', 2)}`
                : `${friendName} owes you ${calc.money.format(net.amount, 'PKR', 2)}`
              : 'You’re all settled up.'}
        </Text>
      </Card>

      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
        Active Loans
      </Text>
      {activeLoans.length === 0 ? (
        <EmptyState title="No active loans." subtitle="Add a loan when money changes hands." />
      ) : (
        <FlatList
          data={activeLoans}
          keyExtractor={(l) => l.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <LoanCard
              loan={item}
              viewer={viewer}
              onPress={() => router.push({ pathname: '/(tabs)/finance/loan-detail', params: { id: item.id } })}
            />
          )}
        />
      )}

      {/* Paid loans (compact) */}
      {loans.filter((l) => l.status === 'paid').length > 0 ? (
        <>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
            Settled
          </Text>
          <FlatList
            data={loans.filter((l) => l.status === 'paid')}
            keyExtractor={(l) => l.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <LoanCard
                loan={item}
                viewer={viewer}
                onPress={() => router.push({ pathname: '/(tabs)/finance/loan-detail', params: { id: item.id } })}
              />
            )}
          />
        </>
      ) : null}

      {canAdd ? (
        <View style={{ marginTop: 16 }}>
          <Button title="Add Loan" onPress={() => router.push('/(tabs)/finance/loan-add')} />
        </View>
      ) : null}
    </Screen>
  );
}

function SummaryCard({ label, minor, tone }: { label: string; minor: number; tone: string }) {
  const palette = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: `${tone}14`,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: `${tone}2B`,
      }}
    >
      <Text style={{ color: tone, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
      <MoneyText minor={minor} style={{ color: palette.text, fontSize: 20, fontWeight: '700', marginTop: 6 }} />
    </View>
  );
}