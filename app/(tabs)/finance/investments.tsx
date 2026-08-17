import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, MoneyText, Button, EmptyState } from '@/components/ui';
import { InvestmentCard } from '@/components/domain';
import { useTheme } from '@/theme/useTheme';
import { useInvestments } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { canForUser } from '@/services/permissionService';

export default function InvestmentsScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { investments } = useInvestments();

  const total = investments.reduce((s, i) => s + i.amount_minor, 0);
  const adminTotal = investments.filter((i) => i.contributor !== 'manager').reduce((s, i) => s + i.amount_minor, 0);
  const managerTotal = investments.filter((i) => i.contributor === 'manager').reduce((s, i) => s + i.amount_minor, 0);
  const canAdd = canForUser(user, 'investment:create');

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Total Investment</Text>
        <MoneyText minor={total} style={{ fontSize: 26, fontWeight: '700' }} />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>Admin</Text>
            <MoneyText minor={adminTotal} style={{ fontSize: 18, fontWeight: '600' }} />
          </View>
          <View>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>Manager</Text>
            <MoneyText minor={managerTotal} style={{ fontSize: 18, fontWeight: '600' }} />
          </View>
        </View>
      </Card>

      {investments.length === 0 ? (
        <EmptyState title="No investments added yet." />
      ) : (
        <FlatList
          data={investments}
          keyExtractor={(i) => i.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => <InvestmentCard investment={item} />}
        />
      )}

      {canAdd ? (
        <View style={{ marginTop: 12 }}>
          <Button title="Add Investment" onPress={() => router.push('/(tabs)/finance/investment-add')} />
        </View>
      ) : null}
    </Screen>
  );
}