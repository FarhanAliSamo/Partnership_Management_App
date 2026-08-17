import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Button, EmptyState, TextField } from '@/components/ui';
import { SettlementCard } from '@/components/domain';
import { useTheme } from '@/theme/useTheme';
import { useSettlements } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { generateSettlement } from '@/services/financeService';
import { canForUser } from '@/services/permissionService';
import { currentMonthKey, addMonths } from '@/utils/date';
import { toUserMessage } from '@/services/errors';

export default function SettlementsScreen() {
  const palette = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { settlements, reload } = useSettlements();

  const [month, setMonth] = useState(addMonths(currentMonthKey(), -1));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = canForUser(user, 'settlement:manage');

  const handleGenerate = async () => {
    if (!user) return;
    setError(null);
    setGenerating(true);
    try {
      await generateSettlement(user, month);
      await reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Screen>
      {settlements.length === 0 ? (
        <EmptyState title="No settlements yet." />
      ) : (
        <FlatList
          data={settlements}
          keyExtractor={(s) => s.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <SettlementCard
              settlement={item}
              onPress={() => router.push({ pathname: '/(tabs)/finance/settlement-detail', params: { id: item.id } })}
            />
          )}
        />
      )}

      {canManage ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Generate Settlement
          </Text>
          <TextField label="Month (YYYY-MM)" value={month} onChangeText={setMonth} placeholder="2026-08" />
          {error ? <Text style={{ color: palette.danger, marginBottom: 8 }}>{error}</Text> : null}
          <Button title={generating ? 'Generating…' : 'Generate'} onPress={handleGenerate} disabled={generating} />
        </Card>
      ) : null}
    </Screen>
  );
}