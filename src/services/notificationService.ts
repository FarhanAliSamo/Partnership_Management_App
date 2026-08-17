import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getAllSettings } from '@/repositories/settingsRepository';
import { getEarningsForDate, getDailyStatusForDate } from '@/repositories/financialRepository';
import { todayISO } from '@/utils/date';

// Configure notification handler (app foreground behaviour)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedules the daily earning reminder if enabled and no earning/closed
 * status exists for today.
 */
export async function scheduleDailyReminderIfNeeded(): Promise<void> {
  if (Platform.OS === 'web') return;
  const settings = await getAllSettings();
  if (!settings.dailyReminderEnabled) return;

  const today = todayISO();
  const [earnings, status] = await Promise.all([
    getEarningsForDate(today),
    getDailyStatusForDate(today),
  ]);
  if (earnings.length > 0 || status) return; // already recorded

  await Notifications.cancelAllScheduledNotificationsAsync();

  const [h, m] = settings.dailyReminderTime.split(':').map((n) => parseInt(n, 10));
  const trigger = new Date();
  trigger.setHours(h ?? 21, m ?? 0, 0, 0);
  if (trigger.getTime() <= Date.now()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Today's earning",
      body: "Today's earning hasn't been added. Don't forget to record business activity.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

/** Immediate local notification helper (offline-safe). */
export async function showLocalNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}