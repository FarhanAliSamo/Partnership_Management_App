import { exec, queryFirst, queryAll, enqueueWrite } from '@/db/database';
import { DEFAULT_SETTINGS } from '@/constants/defaults';
import type { BusinessSettings } from '@/types';

export async function getAllSettings(): Promise<BusinessSettings> {
  const rows = await queryAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      map[row.key] = JSON.parse(row.value);
    } catch {
      map[row.key] = row.value;
    }
  }
  return { ...DEFAULT_SETTINGS, ...map } as BusinessSettings;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await queryFirst<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, JSON.stringify(value)]
    )
  );
}

/**
 * Writes multiple settings in a single serialized write. IMPORTANT: this must
 * NOT call `setSetting` here (that would nest `enqueueWrite` calls and deadlock
 * the write queue).
 */
export async function setManySettings(settings: Partial<BusinessSettings>): Promise<void> {
  await enqueueWrite(async () => {
    for (const [key, value] of Object.entries(settings)) {
      await exec(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, JSON.stringify(value)]
      );
    }
  });
}

export async function resetSettings(): Promise<void> {
  await enqueueWrite(() => exec('DELETE FROM settings'));
  await setManySettings(DEFAULT_SETTINGS);
}