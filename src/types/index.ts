/**
 * Shared domain types for F CRM.
 * Money values are always integer minor units (paisa) unless noted.
 */

export type ID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISOTimestamp = string; // ISO-8601

export type SyncState = 'synced' | 'pending' | 'failed' | 'conflict';

export type RoleKey = 'admin' | 'manager';

export type Partner = 'admin' | 'manager';

export type DayState = 'open' | 'open_zero' | 'closed';

export interface Audited {
  created_by: ID;
  updated_by: ID;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface Syncable extends Audited {
  sync_state: SyncState;
  local_version: number;
  remote_version: number;
  deleted_at: ISOTimestamp | null;
}

export interface User {
  id: ID;
  username: string;
  display_name: string;
  role_key: RoleKey;
}

export interface Role {
  id: ID;
  key: RoleKey;
  name: string;
  permissions: Record<string, boolean>;
}

export interface Earning extends Syncable {
  id: ID;
  business_date: ISODate;
  amount_minor: number;
  note: string | null;
}

export interface DailyBusinessStatus extends Syncable {
  id: ID;
  business_date: ISODate;
  status: DayState;
  reason: string | null;
}

export interface Expense extends Syncable {
  id: ID;
  business_date: ISODate;
  amount_minor: number;
  category: string;
  description: string;
  notes: string | null;
  is_wifi: boolean;
}

export interface Investment extends Syncable {
  id: ID;
  item_name: string;
  amount_minor: number;
  business_date: ISODate;
  category: string;
  description: string;
  contributor: Partner | 'both';
}

export type LoanStatus = 'active' | 'paid';

export interface Loan extends Syncable {
  id: ID;
  lender: Partner;
  borrower: Partner;
  amount_minor: number;
  business_date: ISODate;
  reason: string;
  notes: string | null;
  status: LoanStatus;
  remaining_minor: number;
}

export interface LoanRepayment extends Syncable {
  id: ID;
  loan_id: ID;
  amount_minor: number;
  business_date: ISODate;
  note: string | null;
  source: 'manual' | 'settlement';
  settlement_id: ID | null;
}

export type SettlementStatus = 'pending' | 'partial' | 'paid';

export interface MonthlySettlement extends Syncable {
  id: ID;
  month: string; // YYYY-MM
  total_earning_minor: number;
  shared_expense_minor: number;
  net_profit_minor: number;
  admin_share_minor: number;
  manager_share_minor: number;
  admin_expense_minor: number;
  admin_due_minor: number;
  manager_due_minor: number;
  status: SettlementStatus;
}

export type AllocationType = 'received' | 'loan_payment' | 'expense' | 'other';

export interface SettlementAllocation extends Syncable {
  id: ID;
  settlement_id: ID;
  partner: Partner;
  allocation_type: AllocationType;
  amount_minor: number;
  loan_id: ID | null;
  note: string | null;
}

export interface Payment extends Syncable {
  id: ID;
  settlement_id: ID;
  partner: Partner;
  amount_minor: number;
  business_date: ISODate;
  status: 'released' | 'received';
  note: string | null;
}

export interface Attachment extends Syncable {
  id: ID;
  entity_type: 'earning' | 'expense' | 'investment' | 'daily_status';
  entity_id: ID;
  local_uri: string;
  remote_uri: string | null;
  mime_type: string;
  size_bytes: number;
  upload_state: 'pending' | 'uploaded' | 'failed';
}

export interface ActivityLog {
  id: ID;
  user_id: ID;
  user_name: string;
  action: string;
  record_type: string;
  record_id: ID;
  message: string;
  created_at: ISOTimestamp;
}

export interface BusinessSettings {
  businessName: string;
  adminName: string;
  managerName: string;
  currency: string;
  currencyMinorUnits: number;
  adminSharePercent: number;
  managerSharePercent: number;
  wifiExpenseTreatment: 'shared' | 'admin';
  adminBearsNonWifiExpenses: boolean;
  expenseCategories: string[];
  investmentCategories: string[];
  investmentRecoveryBasis: 'admin_net_share' | 'net_profit';
  settlementDay: number; // day of month
  closedReasonRequired: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:mm
  settlementRemindersEnabled: boolean;
}

export interface EntityMap {
  earning: Earning;
  expense: Expense;
  investment: Investment;
  loan: Loan;
  repayment: LoanRepayment;
  settlement: MonthlySettlement;
  allocation: SettlementAllocation;
  payment: Payment;
  daily_status: DailyBusinessStatus;
}