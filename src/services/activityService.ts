import { insertActivity } from '@/repositories/activityRepository';
import { generateId } from '@/utils/id';
import { nowISO } from '@/utils/date';
import type { ActivityLog, ID } from '@/types';

export async function logActivity(input: {
  userId: ID;
  userName: string;
  action: string;
  recordType: string;
  recordId: ID;
  message: string;
}): Promise<ActivityLog> {
  const entry: ActivityLog = {
    id: generateId(),
    user_id: input.userId,
    user_name: input.userName,
    action: input.action,
    record_type: input.recordType,
    record_id: input.recordId,
    message: input.message,
    created_at: nowISO(),
  };
  await insertActivity(entry);
  return entry;
}