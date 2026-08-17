/**
 * SQLite schema DDL for F CRM. All amounts stored as integer minor units.
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role_key TEXT NOT NULL,
  passcode_hash TEXT,
  biometric_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS earnings (
  id TEXT PRIMARY KEY,
  business_date TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  note TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS daily_business_status (
  id TEXT PRIMARY KEY,
  business_date TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  business_date TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,
  is_wifi INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  business_date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  contributor TEXT NOT NULL DEFAULT 'admin',
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  lender TEXT NOT NULL,
  borrower TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  business_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  remaining_minor INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  business_date TEXT NOT NULL,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  settlement_id TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS monthly_settlements (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL UNIQUE,
  total_earning_minor INTEGER NOT NULL,
  shared_expense_minor INTEGER NOT NULL,
  net_profit_minor INTEGER NOT NULL,
  admin_share_minor INTEGER NOT NULL,
  manager_share_minor INTEGER NOT NULL,
  admin_expense_minor INTEGER NOT NULL,
  admin_due_minor INTEGER NOT NULL,
  manager_due_minor INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS settlement_allocations (
  id TEXT PRIMARY KEY,
  settlement_id TEXT NOT NULL,
  partner TEXT NOT NULL,
  allocation_type TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  loan_id TEXT,
  note TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  settlement_id TEXT NOT NULL,
  partner TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  business_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'released',
  note TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  remote_uri TEXT,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  upload_state TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  local_version INTEGER NOT NULL DEFAULT 1,
  remote_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_earnings_date ON earnings(business_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(business_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(business_date);
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_repayments_loan ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_settlements_month ON monthly_settlements(month);
CREATE INDEX IF NOT EXISTS idx_allocations_settlement ON settlement_allocations(settlement_id);
CREATE INDEX IF NOT EXISTS idx_payments_settlement ON payments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_activity_record ON activity_logs(record_type, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
`;