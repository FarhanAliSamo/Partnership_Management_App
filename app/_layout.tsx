import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { seedDatabase } from '@/services/seedService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSyncStore } from '@/stores/useSyncStore';
import { subscribeData } from '@/lib/dataEvents';
import { ToastHost } from '@/components/ToastHost';
import { requestNotificationPermissions, scheduleDailyReminderIfNeeded } from '@/services/notificationService';

const queryClient = new QueryClient();

export default function RootLayout() {
  const restore = useAuthStore((s) => s.restore);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // Hard timeout: never let the gate hang on a white screen.
    const failSafe = setTimeout(() => {
      if (mounted && !ready) {
        console.warn('[F CRM] init timed out, proceeding anyway');
        setReady(true);
      }
    }, 5000);

    (async () => {
      try {
        await seedDatabase();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[F CRM] seed failed', msg);
        setInitError('Could not initialize local database.');
      }
      if (!mounted) return;
      try {
        await restore();
        const notificationsAllowed = await requestNotificationPermissions().catch(() => false);
        if (notificationsAllowed) await scheduleDailyReminderIfNeeded().catch(() => undefined);
      } catch {
        // best-effort
      }
      if (mounted) {
        clearTimeout(failSafe);
        setReady(true);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(failSafe);
    };
  }, [restore]);

  // Auto-sync on start and whenever local data changes (online-aware).
  useEffect(() => {
    if (!ready) return;
    const sync = useSyncStore.getState();
    sync.autoSync();
    const unsubscribe = subscribeData(() => {
      useSyncStore.getState().syncNow();
    });
    return unsubscribe;
  }, [ready]);

  if (!ready) {
    // Brief loading surface while seed + restore run.
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {initError ? (
          <>
            <Text style={{ padding: 16, textAlign: 'center' }}>{initError}</Text>
            <Pressable onPress={() => setReady(true)}>
              <Text style={{ padding: 12, color: '#0EA5E9' }}>Continue anyway</Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ padding: 16 }}>Loading…</Text>
        )}
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="earning/add" options={{ presentation: 'modal', headerShown: true, title: 'Add Earning' }} />
        <Stack.Screen name="earning/edit" options={{ presentation: 'modal', headerShown: true, title: 'Edit Earning' }} />
        <Stack.Screen name="earning/close-day" options={{ presentation: 'modal', headerShown: true, title: 'Shop Closed' }} />
        <Stack.Screen name="expense/add" options={{ presentation: 'modal', headerShown: true, title: 'Add Expense' }} />
        <Stack.Screen name="expense/edit" options={{ presentation: 'modal', headerShown: true, title: 'Edit Expense' }} />
      </Stack>
      <ToastHost />
    </QueryClientProvider>
  );
}
