import { exec, queryFirst, queryAll, enqueueWrite } from '@/db/database';
import type { ActivityLog } from '@/types';

export async function insertActivity(a: ActivityLog): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO activity_logs (id, user_id, user_name, action, record_type, record_id, message, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [a.id, a.user_id, a.user_name, a.action, a.record_type, a.record_id, a.message, a.created_at]
    )
  );
}

export async function getActivity(limit = 100): Promise<ActivityLog[]> {
  return queryAll<ActivityLog>(
    `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function getActivityByType(recordType: string, limit = 50): Promise<ActivityLog[]> {
  return queryAll<ActivityLog>(
    `SELECT * FROM activity_logs WHERE record_type = ? ORDER BY created_at DESC LIMIT ?`,
    [recordType, limit]
  );
}

export async function getActivityById(id: string): Promise<ActivityLog | null> {
  return queryFirst<ActivityLog>(`SELECT * FROM activity_logs WHERE id = ?`, [id]);
}