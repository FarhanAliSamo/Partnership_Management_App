/**
 * SQLite database singleton. Uses expo-sqlite (async API).
 * Holds a single write lock to serialize mutations (offline-first, race-safe).
 */
import { createTablesStatement, indexStatement } from './schema-config';
import type { SQLiteDatabase } from 'expo-sqlite';

let dbPromise: Promise<SQLiteDatabase> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase();
  }
  return dbPromise;
}

async function openDatabase(): Promise<SQLiteDatabase> {
  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync('f-crm.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(createTablesStatement());
  await db.execAsync(indexStatement());
  return db;
}

/**
 * Serialize all writes through a single queue to avoid races.
 */
export function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.catch(() => undefined);
  return result;
}

export async function exec(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  await db.runAsync(sql, params as any);
}

export async function queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params as any);
}

export async function queryFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params as any);
}

export async function runTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const db = await getDb();
  await db.execAsync('BEGIN');
  try {
    const result = await fn();
    await db.execAsync('COMMIT');
    return result;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

// Allow tests to reset the connection.
export function resetDb(): void {
  dbPromise = null;
  writeQueue = Promise.resolve();
}