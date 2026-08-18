import { exec, queryFirst, queryAll, enqueueWrite } from '@/db/database';
import { softDeleteById } from './base';
import type {
  Earning,
  DailyBusinessStatus,
  Expense,
  Investment,
  Loan,
  LoanRepayment,
  MonthlySettlement,
  SettlementAllocation,
  Payment,
  Attachment,
  DayState,
} from '@/types';

const now = () => new Date().toISOString();

/* ----------------------------- Earnings ----------------------------- */

export async function insertEarning(e: Earning): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO earnings (id, business_date, amount_minor, note, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        e.id, e.business_date, e.amount_minor, e.note,
        e.created_by, e.updated_by, e.created_at, e.updated_at,
        e.sync_state, e.local_version, e.remote_version, e.deleted_at,
      ]
    )
  );
}

export async function updateEarning(e: Earning): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `UPDATE earnings SET business_date=?, amount_minor=?, note=?, updated_by=?, updated_at=?, sync_state=?, local_version=?, remote_version=? WHERE id=?`,
      [
        e.business_date, e.amount_minor, e.note, e.updated_by, e.updated_at,
        e.sync_state, e.local_version, e.remote_version, e.id,
      ]
    )
  );
}

export async function getEarningsByRange(start: string, end: string): Promise<Earning[]> {
  return queryAll<Earning>(
    `SELECT * FROM earnings WHERE deleted_at IS NULL AND business_date >= ? AND business_date <= ? ORDER BY business_date ASC, created_at ASC`,
    [start, end]
  );
}

export async function getEarningsForDate(date: string): Promise<Earning[]> {
  return queryAll<Earning>(
    `SELECT * FROM earnings WHERE deleted_at IS NULL AND business_date = ? ORDER BY created_at ASC`,
    [date]
  );
}

export async function getAllEarnings(): Promise<Earning[]> {
  return queryAll<Earning>(
    `SELECT * FROM earnings WHERE deleted_at IS NULL ORDER BY business_date ASC, created_at ASC`
  );
}

export async function getEarningById(id: string): Promise<Earning | null> {
  return queryFirst<Earning>(`SELECT * FROM earnings WHERE id = ? AND deleted_at IS NULL`, [id]);
}

export async function deleteEarning(id: string): Promise<void> {
  await softDeleteById('earnings', id);
}

/* ----------------------- Daily Business Status ----------------------- */

export async function upsertDailyStatus(d: DailyBusinessStatus): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO daily_business_status (id, business_date, status, reason, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(business_date) DO UPDATE SET
         status=excluded.status, reason=excluded.reason, updated_by=excluded.updated_by,
         updated_at=excluded.updated_at, sync_state=excluded.sync_state, local_version=excluded.local_version`,
      [
        d.id, d.business_date, d.status, d.reason,
        d.created_by, d.updated_by, d.created_at, d.updated_at,
        d.sync_state, d.local_version, d.remote_version, d.deleted_at,
      ]
    )
  );
}

export async function getDailyStatusForDate(date: string): Promise<DailyBusinessStatus | null> {
  return queryFirst<DailyBusinessStatus>(
    `SELECT * FROM daily_business_status WHERE deleted_at IS NULL AND business_date = ?`,
    [date]
  );
}

export async function getDailyStatusByRange(start: string, end: string): Promise<DailyBusinessStatus[]> {
  return queryAll<DailyBusinessStatus>(
    `SELECT * FROM daily_business_status WHERE deleted_at IS NULL AND business_date >= ? AND business_date <= ? ORDER BY business_date ASC`,
    [start, end]
  );
}

export async function getAllDailyStatuses(): Promise<DailyBusinessStatus[]> {
  return queryAll<DailyBusinessStatus>(
    `SELECT * FROM daily_business_status WHERE deleted_at IS NULL ORDER BY business_date ASC`
  );
}

/* ----------------------------- Expenses ----------------------------- */

export async function insertExpense(e: Expense): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO expenses (id, business_date, amount_minor, category, description, notes, is_wifi, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        e.id, e.business_date, e.amount_minor, e.category, e.description, e.notes,
        e.is_wifi ? 1 : 0, e.created_by, e.updated_by, e.created_at, e.updated_at,
        e.sync_state, e.local_version, e.remote_version, e.deleted_at,
      ]
    )
  );
}

export async function updateExpense(e: Expense): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `UPDATE expenses SET business_date=?, amount_minor=?, category=?, description=?, notes=?, is_wifi=?, updated_by=?, updated_at=?, sync_state=?, local_version=?, remote_version=? WHERE id=?`,
      [
        e.business_date, e.amount_minor, e.category, e.description, e.notes,
        e.is_wifi ? 1 : 0, e.updated_by, e.updated_at, e.sync_state, e.local_version, e.remote_version, e.id,
      ]
    )
  );
}

export async function getExpensesByRange(start: string, end: string): Promise<Expense[]> {
  return queryAll<Expense>(
    `SELECT * FROM expenses WHERE deleted_at IS NULL AND business_date >= ? AND business_date <= ? ORDER BY business_date DESC`,
    [start, end]
  );
}

export async function getAllExpenses(): Promise<Expense[]> {
  return queryAll<Expense>(
    `SELECT * FROM expenses WHERE deleted_at IS NULL ORDER BY business_date DESC`
  );
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  return queryFirst<Expense>(`SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL`, [id]);
}

export async function deleteExpense(id: string): Promise<void> {
  await softDeleteById('expenses', id);
}

/* ---------------------------- Investments ---------------------------- */

export async function insertInvestment(i: Investment): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO investments (id, item_name, amount_minor, business_date, category, description, contributor, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        i.id, i.item_name, i.amount_minor, i.business_date, i.category, i.description, i.contributor,
        i.created_by, i.updated_by, i.created_at, i.updated_at, i.sync_state, i.local_version, i.remote_version, i.deleted_at,
      ]
    )
  );
}

export async function updateInvestment(i: Investment): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `UPDATE investments SET item_name=?, amount_minor=?, business_date=?, category=?, description=?, contributor=?, updated_by=?, updated_at=?, sync_state=?, local_version=?, remote_version=? WHERE id=?`,
      [
        i.item_name, i.amount_minor, i.business_date, i.category, i.description, i.contributor,
        i.updated_by, i.updated_at, i.sync_state, i.local_version, i.remote_version, i.id,
      ]
    )
  );
}

export async function getAllInvestments(): Promise<Investment[]> {
  return queryAll<Investment>(
    `SELECT * FROM investments WHERE deleted_at IS NULL ORDER BY business_date DESC`
  );
}

export async function getInvestmentById(id: string): Promise<Investment | null> {
  return queryFirst<Investment>(`SELECT * FROM investments WHERE id = ? AND deleted_at IS NULL`, [id]);
}

export async function deleteInvestment(id: string): Promise<void> {
  await softDeleteById('investments', id);
}

/* ------------------------------ Loans ------------------------------ */

export async function insertLoan(l: Loan): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO loans (id, lender, borrower, amount_minor, business_date, reason, notes, status, remaining_minor, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        l.id, l.lender, l.borrower, l.amount_minor, l.business_date, l.reason, l.notes,
        l.status, l.remaining_minor, l.created_by, l.updated_by, l.created_at, l.updated_at,
        l.sync_state, l.local_version, l.remote_version, l.deleted_at,
      ]
    )
  );
}

export async function updateLoan(l: Loan): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `UPDATE loans SET status=?, remaining_minor=?, reason=?, notes=?, updated_by=?, updated_at=?, sync_state=?, local_version=?, remote_version=? WHERE id=?`,
      [
        l.status, l.remaining_minor, l.reason, l.notes, l.updated_by, l.updated_at,
        l.sync_state, l.local_version, l.remote_version, l.id,
      ]
    )
  );
}

export async function getAllLoans(): Promise<Loan[]> {
  return queryAll<Loan>(
    `SELECT * FROM loans WHERE deleted_at IS NULL ORDER BY created_at DESC`
  );
}

export async function getActiveLoans(): Promise<Loan[]> {
  return queryAll<Loan>(
    `SELECT * FROM loans WHERE deleted_at IS NULL AND status = 'active' ORDER BY created_at DESC`
  );
}

export async function getLoanById(id: string): Promise<Loan | null> {
  return queryFirst<Loan>(`SELECT * FROM loans WHERE id = ? AND deleted_at IS NULL`, [id]);
}

export async function deleteLoan(id: string): Promise<void> {
  await softDeleteById('loans', id);
}

/* --------------------------- Repayments --------------------------- */

export async function insertRepayment(r: LoanRepayment): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO loan_repayments (id, loan_id, amount_minor, business_date, note, source, settlement_id, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        r.id, r.loan_id, r.amount_minor, r.business_date, r.note, r.source, r.settlement_id,
        r.created_by, r.updated_by, r.created_at, r.updated_at, r.sync_state, r.local_version, r.remote_version, r.deleted_at,
      ]
    )
  );
}

export async function getRepaymentsForLoan(loanId: string): Promise<LoanRepayment[]> {
  return queryAll<LoanRepayment>(
    `SELECT * FROM loan_repayments WHERE deleted_at IS NULL AND loan_id = ? ORDER BY created_at ASC`,
    [loanId]
  );
}

export async function getAllRepayments(): Promise<LoanRepayment[]> {
  return queryAll<LoanRepayment>(
    `SELECT * FROM loan_repayments WHERE deleted_at IS NULL ORDER BY created_at ASC`
  );
}

/* --------------------------- Settlements --------------------------- */

export async function insertSettlement(s: MonthlySettlement): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO monthly_settlements (id, month, total_earning_minor, shared_expense_minor, net_profit_minor, admin_share_minor, manager_share_minor, admin_expense_minor, admin_due_minor, manager_due_minor, status, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        s.id, s.month, s.total_earning_minor, s.shared_expense_minor, s.net_profit_minor,
        s.admin_share_minor, s.manager_share_minor, s.admin_expense_minor, s.admin_due_minor,
        s.manager_due_minor, s.status, s.created_by, s.updated_by, s.created_at, s.updated_at,
        s.sync_state, s.local_version, s.remote_version, s.deleted_at,
      ]
    )
  );
}

export async function updateSettlement(s: MonthlySettlement): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `UPDATE monthly_settlements SET status=?, admin_due_minor=?, manager_due_minor=?, updated_by=?, updated_at=?, sync_state=?, local_version=?, remote_version=? WHERE id=?`,
      [
        s.status, s.admin_due_minor, s.manager_due_minor, s.updated_by, s.updated_at,
        s.sync_state, s.local_version, s.remote_version, s.id,
      ]
    )
  );
}

export async function getSettlementByMonth(month: string): Promise<MonthlySettlement | null> {
  return queryFirst<MonthlySettlement>(
    `SELECT * FROM monthly_settlements WHERE deleted_at IS NULL AND month = ?`,
    [month]
  );
}

export async function getSettlementById(id: string): Promise<MonthlySettlement | null> {
  return queryFirst<MonthlySettlement>(
    `SELECT * FROM monthly_settlements WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
}

export async function deleteSettlement(id: string): Promise<void> {
  await softDeleteById('monthly_settlements', id);
}

export async function getAllSettlements(): Promise<MonthlySettlement[]> {
  return queryAll<MonthlySettlement>(
    `SELECT * FROM monthly_settlements WHERE deleted_at IS NULL ORDER BY month DESC`
  );
}

/* --------------------------- Allocations --------------------------- */

export async function insertAllocation(a: SettlementAllocation): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO settlement_allocations (id, settlement_id, partner, allocation_type, amount_minor, loan_id, note, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        a.id, a.settlement_id, a.partner, a.allocation_type, a.amount_minor, a.loan_id, a.note,
        a.created_by, a.updated_by, a.created_at, a.updated_at, a.sync_state, a.local_version, a.remote_version, a.deleted_at,
      ]
    )
  );
}

export async function getAllocationsForSettlement(settlementId: string): Promise<SettlementAllocation[]> {
  return queryAll<SettlementAllocation>(
    `SELECT * FROM settlement_allocations WHERE deleted_at IS NULL AND settlement_id = ? ORDER BY created_at ASC`,
    [settlementId]
  );
}

/* ----------------------------- Payments ----------------------------- */

export async function insertPayment(p: Payment): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO payments (id, settlement_id, partner, amount_minor, business_date, status, note, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        p.id, p.settlement_id, p.partner, p.amount_minor, p.business_date, p.status, p.note,
        p.created_by, p.updated_by, p.created_at, p.updated_at, p.sync_state, p.local_version, p.remote_version, p.deleted_at,
      ]
    )
  );
}

export async function getPaymentsForSettlement(settlementId: string): Promise<Payment[]> {
  return queryAll<Payment>(
    `SELECT * FROM payments WHERE deleted_at IS NULL AND settlement_id = ? ORDER BY created_at ASC`,
    [settlementId]
  );
}

/* ---------------------------- Attachments ---------------------------- */

export async function insertAttachment(a: Attachment): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `INSERT INTO attachments (id, entity_type, entity_id, local_uri, remote_uri, mime_type, size_bytes, upload_state, created_by, updated_by, created_at, updated_at, sync_state, local_version, remote_version, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        a.id, a.entity_type, a.entity_id, a.local_uri, a.remote_uri, a.mime_type, a.size_bytes, a.upload_state,
        a.created_by, a.updated_by, a.created_at, a.updated_at, a.sync_state, a.local_version, a.remote_version, a.deleted_at,
      ]
    )
  );
}

export async function updateAttachment(a: Attachment): Promise<void> {
  await enqueueWrite(() =>
    exec(
      `UPDATE attachments SET remote_uri=?, upload_state=?, sync_state=?, remote_version=?, updated_at=? WHERE id=?`,
      [a.remote_uri, a.upload_state, a.sync_state, a.remote_version, now(), a.id]
    )
  );
}

export async function getAttachmentsForEntity(entityType: string, entityId: string): Promise<Attachment[]> {
  return queryAll<Attachment>(
    `SELECT * FROM attachments WHERE deleted_at IS NULL AND entity_type = ? AND entity_id = ? ORDER BY created_at ASC`,
    [entityType, entityId]
  );
}

export async function getPendingAttachments(): Promise<Attachment[]> {
  return queryAll<Attachment>(
    `SELECT * FROM attachments WHERE deleted_at IS NULL AND upload_state IN ('pending','failed') ORDER BY created_at ASC`
  );
}

const ENTITY_TABLE_MAP: Record<string, string> = {
  earning: 'earnings',
  expense: 'expenses',
  investment: 'investments',
  loan: 'loans',
  repayment: 'loan_repayments',
  settlement: 'monthly_settlements',
  allocation: 'settlement_allocations',
  payment: 'payments',
  daily_status: 'daily_business_status',
};

/** Mark a record as synced after its queued operation is pushed successfully. */
export async function markEntitySynced(entityType: string, entityId: string): Promise<void> {
  const table = ENTITY_TABLE_MAP[entityType];
  if (!table) return;
  await enqueueWrite(() =>
    exec(`UPDATE ${table} SET sync_state = 'synced' WHERE id = ?`, [entityId])
  );
}

const NUMERIC_COLUMNS = new Set([
  'amount_minor',
  'total_earning_minor',
  'shared_expense_minor',
  'net_profit_minor',
  'admin_share_minor',
  'manager_share_minor',
  'admin_expense_minor',
  'admin_due_minor',
  'manager_due_minor',
  'remaining_minor',
  'local_version',
  'remote_version',
  'is_wifi',
  'biometric_enabled',
  'size_bytes',
]);

/**
 * Merge rows pulled from the cloud into local SQLite.
 *
 * Rules (safe, non-destructive):
 * - Cloud row marked deleted → soft-delete locally (so partner deletes propagate).
 * - Cloud row missing locally → insert it (so the other partner's entries appear).
 * - Cloud row already present locally → keep local; local edits win and are pushed up.
 *
 * Pulled rows are always stored with sync_state = 'synced' (they are canonical
 * from the cloud), and Postgres `bigint`/numeric strings are coerced to numbers.
 */
export async function mergeRemoteRows(
  entityType: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  const table = ENTITY_TABLE_MAP[entityType];
  if (!table) return;

  for (const raw of rows) {
    const id = raw.id as string | undefined;
    if (!id) continue;

    const existing = await queryFirst<{ id: string }>(
      `SELECT id FROM ${table} WHERE id = ?`,
      [id]
    );

    if (raw.deleted_at != null) {
      if (existing) {
        await enqueueWrite(() =>
          exec(`UPDATE ${table} SET deleted_at = ? WHERE id = ?`, [new Date().toISOString(), id])
        );
      }
      continue;
    }

    if (existing) continue; // local is source of truth; its pending changes push up

    // Normalize the row for SQLite (numbers + force synced).
    const normalized: Record<string, unknown> = { ...raw, sync_state: 'synced' };
    for (const key of Object.keys(normalized)) {
      const value = normalized[key];
      if (typeof value === 'string' && NUMERIC_COLUMNS.has(key) && value !== '') {
        const n = Number(value);
        if (Number.isFinite(n)) normalized[key] = n;
      }
    }

    const keys = Object.keys(normalized).filter((k) => normalized[k] !== undefined);
    const cols = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map((k) => normalized[k]) as unknown as unknown[];

    await enqueueWrite(() =>
      exec(`INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`, values as never)
    );
  }
}

/* ------------------------- Daily state helpers ------------------------- */

export interface DailyRow {
  business_date: string;
  total_minor: number | null;
  status: DayState | null;
}

/**
 * Daily aggregates are computed in the service layer by merging
 * earnings + daily_business_status, since the two live in separate tables.
 * Kept here as a documented type for that merge.
 */
export type DailyAggregateInput = DailyRow;
