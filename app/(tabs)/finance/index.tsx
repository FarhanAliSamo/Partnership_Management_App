import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, MoneyText } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { useInvestments, useLoans } from '@/hooks';
import { useSettlements } from '@/hooks';
import { useSyncStore } from '@/stores/useSyncStore';
import { useEffect } from 'react';
import { relativeTimeFrom } from '@/utils/date';

function HubCard({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  const palette = useTheme();
  return (
    <Card onPress={onPress} style={{ marginBottom: 12 }}>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: palette.textSecondary, fontSize: 14, marginTop: 2 }}>{subtitle}</Text>
    </Card>
  );
}

export default function FinanceHub() {
  const router = useRouter();
  const palette = useTheme();
  const { investments } = useInvestments();
  const { loans } = useLoans();
  const { settlements } = useSettlements();
  const { pendingCount, lastSyncedAt, refresh } = useSyncStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalInvestment = investments.reduce((s, i) => s + i.amount_minor, 0);

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Total Investment</Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            Sync {pendingCount > 0 ? `· ${pendingCount} pending` : '· up to date'}
          </Text>
        </View>
        <MoneyText minor={totalInvestment} style={{ fontSize: 26, fontWeight: '700' }} />
        {lastSyncedAt ? (
          <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>
            Last synced {relativeTimeFrom(lastSyncedAt)}
          </Text>
        ) : null}
      </Card>

      <HubCard
        title="Investments"
        subtitle={`${investments.length} item(s) tracked`}
        onPress={() => router.push('/(tabs)/finance/investments')}
      />
      <HubCard
        title="Loans"
        subtitle={`${loans.filter((l) => l.status === 'active').length} active`}
        onPress={() => router.push('/(tabs)/finance/loans')}
      />
      <HubCard
        title="Settlements"
        subtitle={`${settlements.length} month(s)`}
        onPress={() => router.push('/(tabs)/finance/settlements')}
      />
      <HubCard
        title="Reports"
        subtitle="Revenue, profit, recovery & trends"
        onPress={() => router.push('/(tabs)/finance/reports')}
      />
    </Screen>
  );
}