import { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Screen, Card, EmptyState, LoadingState } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { getActivity } from '@/repositories/activityRepository';
import { relativeTimeFrom } from '@/utils/date';
import type { ActivityLog } from '@/types';

export default function ActivityScreen() {
  const palette = useTheme();
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivity(200).then((list) => {
      setItems(list);
      setLoading(false);
    });
  }, []);

  return (
    <Screen>
      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState title="No activity yet." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ color: palette.text, fontSize: 15 }}>{item.message}</Text>
              <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>
                {item.user_name} · {relativeTimeFrom(item.created_at)}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}