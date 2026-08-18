/**
 * Centralized string enums and lookup maps.
 */

export const SYNC_STATES = {
  synced: 'synced',
  pending: 'pending',
  failed: 'failed',
  conflict: 'conflict',
} as const;

export const SYNC_LABELS: Record<string, string> = {
  synced: 'Synced',
  pending: 'Pending Sync',
  failed: 'Sync Failed',
  conflict: 'Conflict',
};

export const DAY_LABELS: Record<string, string> = {
  open: 'Open',
  open_zero: 'Open day, PKR 0',
  closed: 'Closed, no earning',
};

export const LOAN_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paid: 'Paid',
};

export const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  partial: 'Partially Paid',
  paid: 'Paid',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  released: 'Released',
  received: 'Received',
};

export const RECORD_TYPE_LABELS: Record<string, string> = {
  earning: 'Earning',
  expense: 'Expense',
  investment: 'Investment',
  loan: 'Loan',
  repayment: 'Repayment',
  settlement: 'Settlement',
  payment: 'Payment',
  daily_status: 'Business Day',
  attachment: 'Photo',
};

export const ACTION_LABELS: Record<string, string> = {
  created: 'added',
  updated: 'updated',
  deleted: 'deleted',
  repaid: 'repaid',
  marked_paid: 'marked paid',
  marked_released: 'marked released',
  closed_day: 'marked closed',
  synced: 'synced',
};