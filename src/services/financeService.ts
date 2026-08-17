import * as repo from '@/repositories/financialRepository';
import * as syncRepo from '@/repositories/syncQueueRepository';
import { logActivity } from './activityService';
import { newRecord, newId } from './recordUtil';
import { getAllSettings } from '@/repositories/settingsRepository';
import * as calc from './calculation';
import { validationError, notFound, permissionDenied } from './errors';
import { canForUser, PermissionKey } from './permissionService';
import { WIFI_CATEGORY } from '@/constants/categories';
import { invalidateData } from '@/lib/dataEvents';
import type {
  User,
  Earning,
  DailyBusinessStatus,
  Expense,
  Investment,
  Loan,
  LoanRepayment,
  MonthlySettlement,
  SettlementAllocation,
  Payment,
  DayState,
} from '@/types';

/* ------------------------------- Guards ------------------------------- */

function requirePermission(user: User | null, permission: PermissionKey): void {
  if (!canForUser(user, permission)) throw permissionDenied();
}

/* ------------------------------ Helpers ------------------------------ */

async function enqueueOp(entityType: string, entityId: string, operation: 'create' | 'update' | 'delete', payload: unknown): Promise<void> {
  const ts = new Date().toISOString();
  await syncRepo.enqueueSync({
    id: newId(),
    entity_type: entityType,
    entity_id: entityId,
    operation,
    payload: payload as Record<string, unknown>,
    status: 'pending',
    attempts: 0,
    last_error: null,
    created_at: ts,
    updated_at: ts,
  });
}

async function recordActivity(user: User, action: string, recordType: string, recordId: string, message: string): Promise<void> {
  await logActivity({
    userId: user.id,
    userName: user.display_name,
    action,
    recordType,
    recordId,
    message,
  });
  // Every mutation logs activity exactly once; use that as the single,
  // central point to notify all data hooks that local data changed.
  invalidateData();
}

const fmt = (minor: number, units = 2) => calc.money.format(minor, 'PKR', units);

/* ------------------------------- Earnings ------------------------------- */

export async function addEarning(
  user: User,
  input: { business_date: string; amount_minor: number; note?: string | null }
): Promise<Earning> {
  requirePermission(user, 'earning:create');
  if (input.amount_minor < 0) throw validationError('Earning cannot be negative.');
  if (!input.business_date) throw validationError('Date is required.');

  const e: Earning = {
    id: newId(),
    business_date: input.business_date,
    amount_minor: input.amount_minor,
    note: input.note ?? null,
    ...newRecord(user.id),
  };
  await repo.insertEarning(e);
  await enqueueOp('earning', e.id, 'create', e);
  await recordActivity(user, 'created', 'earning', e.id, `${user.display_name} added earning: ${fmt(e.amount_minor)}`);
  return e;
}

export async function updateEarning(
  user: User,
  id: string,
  input: { business_date: string; amount_minor: number; note?: string | null }
): Promise<Earning> {
  requirePermission(user, 'earning:edit');
  const existing = await repo.getEarningById(id);
  if (!existing) throw notFound('Earning not found.');
  if (input.amount_minor < 0) throw validationError('Earning cannot be negative.');

  const updated: Earning = {
    ...existing,
    business_date: input.business_date,
    amount_minor: input.amount_minor,
    note: input.note ?? existing.note,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
    sync_state: 'pending',
    local_version: existing.local_version + 1,
  };
  await repo.updateEarning(updated);
  await enqueueOp('earning', updated.id, 'update', updated);
  await recordActivity(user, 'updated', 'earning', updated.id, `${user.display_name} updated earning to ${fmt(updated.amount_minor)}`);
  return updated;
}

export async function deleteEarning(user: User, id: string): Promise<void> {
  requirePermission(user, 'earning:delete');
  const existing = await repo.getEarningById(id);
  if (!existing) throw notFound('Earning not found.');
  await repo.deleteEarning(id);
  await enqueueOp('earning', id, 'delete', { id });
  await recordActivity(user, 'deleted', 'earning', id, `${user.display_name} deleted an earning record`);
}

/* ---------------------------- Closed Day ---------------------------- */

export async function markClosedDay(
  user: User,
  input: { business_date: string; reason?: string | null }
): Promise<DailyBusinessStatus> {
  requirePermission(user, 'closed_day:create');
  const d: DailyBusinessStatus = {
    id: newId(),
    business_date: input.business_date,
    status: 'closed' as DayState,
    reason: input.reason ?? null,
    ...newRecord(user.id),
  };
  await repo.upsertDailyStatus(d);
  await enqueueOp('daily_status', d.id, 'create', d);
  await recordActivity(user, 'closed_day', 'daily_status', d.id, `${user.display_name} marked ${d.business_date} as closed`);
  return d;
}

export async function markOpenDay(
  user: User,
  input: { business_date: string; zero: boolean; reason?: string | null }
): Promise<DailyBusinessStatus> {
  requirePermission(user, 'earning:create');
  const d: DailyBusinessStatus = {
    id: newId(),
    business_date: input.business_date,
    status: input.zero ? 'open_zero' : 'open',
    reason: input.reason ?? null,
    ...newRecord(user.id),
  };
  await repo.upsertDailyStatus(d);
  await enqueueOp('daily_status', d.id, 'create', d);
  await recordActivity(user, 'closed_day', 'daily_status', d.id, `${user.display_name} marked ${d.business_date} as ${d.status}`);
  return d;
}

/* ------------------------------- Expenses ------------------------------- */

export async function addExpense(
  user: User,
  input: { business_date: string; amount_minor: number; category: string; description: string; notes?: string | null; is_wifi?: boolean }
): Promise<Expense> {
  requirePermission(user, 'expense:create');
  if (input.amount_minor <= 0) throw validationError('Expense must be greater than zero.');
  if (!input.category) throw validationError('Category is required.');

  const isWifi = input.is_wifi || input.category === WIFI_CATEGORY;
  const e: Expense = {
    id: newId(),
    business_date: input.business_date,
    amount_minor: input.amount_minor,
    category: input.category,
    description: input.description || '',
    notes: input.notes ?? null,
    is_wifi: isWifi,
    ...newRecord(user.id),
  };
  await repo.insertExpense(e);
  await enqueueOp('expense', e.id, 'create', e);
  await recordActivity(user, 'created', 'expense', e.id, `${user.display_name} added ${e.category} expense: ${fmt(e.amount_minor)}`);
  return e;
}

export async function updateExpense(
  user: User,
  id: string,
  input: { business_date: string; amount_minor: number; category: string; description: string; notes?: string | null }
): Promise<Expense> {
  requirePermission(user, 'expense:edit');
  const existing = await repo.getExpenseById(id);
  if (!existing) throw notFound('Expense not found.');

  const isWifi = input.category === WIFI_CATEGORY;
  const updated: Expense = {
    ...existing,
    business_date: input.business_date,
    amount_minor: input.amount_minor,
    category: input.category,
    description: input.description,
    notes: input.notes ?? existing.notes,
    is_wifi: isWifi,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
    sync_state: 'pending',
    local_version: existing.local_version + 1,
  };
  await repo.updateExpense(updated);
  await enqueueOp('expense', updated.id, 'update', updated);
  await recordActivity(user, 'updated', 'expense', updated.id, `${user.display_name} updated expense`);
  return updated;
}

export async function deleteExpense(user: User, id: string): Promise<void> {
  requirePermission(user, 'expense:delete');
  const existing = await repo.getExpenseById(id);
  if (!existing) throw notFound('Expense not found.');
  await repo.deleteExpense(id);
  await enqueueOp('expense', id, 'delete', { id });
  await recordActivity(user, 'deleted', 'expense', id, `${user.display_name} deleted an expense`);
}

/* ------------------------------ Investments ------------------------------ */

export async function addInvestment(
  user: User,
  input: { item_name: string; amount_minor: number; business_date: string; category: string; description: string; contributor: Investment['contributor'] }
): Promise<Investment> {
  requirePermission(user, 'investment:create');
  if (input.amount_minor <= 0) throw validationError('Investment must be greater than zero.');
  const i: Investment = {
    id: newId(),
    item_name: input.item_name,
    amount_minor: input.amount_minor,
    business_date: input.business_date,
    category: input.category,
    description: input.description || '',
    contributor: input.contributor,
    ...newRecord(user.id),
  };
  await repo.insertInvestment(i);
  await enqueueOp('investment', i.id, 'create', i);
  await recordActivity(user, 'created', 'investment', i.id, `${user.display_name} added investment: ${i.item_name} - ${fmt(i.amount_minor)}`);
  return i;
}

export async function updateInvestment(
  user: User,
  id: string,
  input: { item_name: string; amount_minor: number; business_date: string; category: string; description: string; contributor: Investment['contributor'] }
): Promise<Investment> {
  requirePermission(user, 'investment:edit');
  const existing = await repo.getInvestmentById(id);
  if (!existing) throw notFound('Investment not found.');
  const updated: Investment = {
    ...existing,
    ...input,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
    sync_state: 'pending',
    local_version: existing.local_version + 1,
  };
  await repo.updateInvestment(updated);
  await enqueueOp('investment', updated.id, 'update', updated);
  await recordActivity(user, 'updated', 'investment', updated.id, `${user.display_name} updated investment`);
  return updated;
}

export async function deleteInvestment(user: User, id: string): Promise<void> {
  requirePermission(user, 'investment:delete');
  await repo.deleteInvestment(id);
  await enqueueOp('investment', id, 'delete', { id });
  await recordActivity(user, 'deleted', 'investment', id, `${user.display_name} deleted an investment`);
}

/* --------------------------------- Loans --------------------------------- */

export async function addLoan(
  user: User,
  input: { lender: Loan['lender']; borrower: Loan['borrower']; amount_minor: number; business_date: string; reason: string; notes?: string | null }
): Promise<Loan> {
  requirePermission(user, 'loan:create');
  if (input.amount_minor <= 0) throw validationError('Loan amount must be greater than zero.');
  const l: Loan = {
    id: newId(),
    lender: input.lender,
    borrower: input.borrower,
    amount_minor: input.amount_minor,
    business_date: input.business_date,
    reason: input.reason || '',
    notes: input.notes ?? null,
    status: 'active',
    remaining_minor: input.amount_minor,
    ...newRecord(user.id),
  };
  await repo.insertLoan(l);
  await enqueueOp('loan', l.id, 'create', l);
  await recordActivity(user, 'created', 'loan', l.id, `${user.display_name} added loan: ${fmt(l.amount_minor)}`);
  return l;
}

export async function addRepayment(
  user: User,
  input: { loan_id: string; amount_minor: number; business_date: string; note?: string | null }
): Promise<Loan> {
  requirePermission(user, 'repayment:create');
  const loan = await repo.getLoanById(input.loan_id);
  if (!loan) throw notFound('Loan not found.');
  if (input.amount_minor <= 0) throw validationError('Repayment must be greater than zero.');
  if (input.amount_minor > loan.remaining_minor) throw validationError('Repayment exceeds remaining balance.');

  const r: LoanRepayment = {
    id: newId(),
    loan_id: loan.id,
    amount_minor: input.amount_minor,
    business_date: input.business_date,
    note: input.note ?? null,
    source: 'manual',
    settlement_id: null,
    ...newRecord(user.id),
  };
  await repo.insertRepayment(r);

  const remaining = Math.max(0, loan.remaining_minor - input.amount_minor);
  const updatedLoan: Loan = {
    ...loan,
    remaining_minor: remaining,
    status: remaining <= 0 ? 'paid' : 'active',
    updated_by: user.id,
    updated_at: new Date().toISOString(),
    sync_state: 'pending',
    local_version: loan.local_version + 1,
  };
  await repo.updateLoan(updatedLoan);
  await enqueueOp('repayment', r.id, 'create', r);
  await enqueueOp('loan', updatedLoan.id, 'update', updatedLoan);
  await recordActivity(user, 'repaid', 'loan', loan.id, `${user.display_name} repaid loan: ${fmt(input.amount_minor)}`);
  return updatedLoan;
}

export async function deleteLoan(user: User, id: string): Promise<void> {
  requirePermission(user, 'loan:delete');
  await repo.deleteLoan(id);
  await enqueueOp('loan', id, 'delete', { id });
  await recordActivity(user, 'deleted', 'loan', id, `${user.display_name} deleted a loan`);
}

/* ------------------------------ Settlements ------------------------------ */

export async function generateSettlement(user: User, month: string): Promise<MonthlySettlement> {
  requirePermission(user, 'settlement:manage');

  const start = `${month}-01`;
  const end = `${month}-31`;
  const earnings = await repo.getEarningsByRange(start, end);
  const expenses = await repo.getExpensesByRange(start, end);
  const settings = await getAllSettings();

  const earningsMinor = earnings.reduce((s, e) => s + e.amount_minor, 0);
  const result = calc.settlements.buildSettlement({
    month,
    earningsMinor,
    expenses,
    settings,
  });

  const s: MonthlySettlement = {
    id: newId(),
    month,
    total_earning_minor: result.totalEarningMinor,
    shared_expense_minor: result.sharedExpenseMinor,
    net_profit_minor: result.netBusinessProfitMinor,
    admin_share_minor: result.adminGrossShareMinor,
    manager_share_minor: result.managerGrossShareMinor,
    admin_expense_minor: result.adminDeductibleExpenseMinor,
    admin_due_minor: result.adminDueMinor,
    manager_due_minor: result.managerDueMinor,
    status: 'pending',
    ...newRecord(user.id),
  };
  await repo.insertSettlement(s);
  await enqueueOp('settlement', s.id, 'create', s);
  await recordActivity(user, 'created', 'settlement', s.id, `${user.display_name} generated ${month} settlement`);
  return s;
}

export async function allocateManagerShare(
  user: User,
  settlementId: string,
  input: { mode: 'take' | 'pay_loan' | 'split'; payLoanMinor?: number; loanId?: string | null }
): Promise<{ allocations: SettlementAllocation[]; loan?: Loan }> {
  requirePermission(user, 'allocation:manage_own');

  const settlement = await repo.getSettlementById(settlementId);
  if (!settlement) throw notFound('Settlement not found.');

  const activeLoans = await repo.getActiveLoans();
  // Manager owes admin = loans where borrower = manager
  const outstanding = activeLoans
    .filter((l) => l.borrower === 'manager')
    .reduce((s, l) => s + l.remaining_minor, 0);

  const managerShare = settlement.manager_share_minor;
  const allocation = calc.allocations.buildAllocation({
    partnerShareMinor: managerShare,
    outstandingLoanMinor: outstanding,
    mode: input.mode,
    payLoanMinor: input.payLoanMinor ?? 0,
  });

  const allocations: SettlementAllocation[] = [];
  const receivedAlloc: SettlementAllocation = {
    id: newId(),
    settlement_id: settlement.id,
    partner: 'manager',
    allocation_type: 'received',
    amount_minor: allocation.receivedMinor,
    loan_id: null,
    note: null,
    ...newRecord(user.id),
  };
  allocations.push(receivedAlloc);
  await repo.insertAllocation(receivedAlloc);
  await enqueueOp('allocation', receivedAlloc.id, 'create', receivedAlloc);

  let updatedLoan: Loan | undefined;
  if (allocation.loanPaymentMinor > 0) {
    const targetLoanId = input.loanId ?? activeLoans.find((l) => l.borrower === 'manager')?.id;
    if (!targetLoanId) throw validationError('No active loan to repay.');
    const loan = await repo.getLoanById(targetLoanId);
    if (!loan) throw notFound('Loan not found.');

    const repay: LoanRepayment = {
      id: newId(),
      loan_id: loan.id,
      amount_minor: allocation.loanPaymentMinor,
      business_date: new Date().toISOString().slice(0, 10),
      note: `Settlement repayment - ${settlement.month}`,
      source: 'settlement',
      settlement_id: settlement.id,
      ...newRecord(user.id),
    };
    await repo.insertRepayment(repay);
    await enqueueOp('repayment', repay.id, 'create', repay);

    const remaining = Math.max(0, loan.remaining_minor - allocation.loanPaymentMinor);
    updatedLoan = {
      ...loan,
      remaining_minor: remaining,
      status: remaining <= 0 ? 'paid' : 'active',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
      sync_state: 'pending',
      local_version: loan.local_version + 1,
    };
    await repo.updateLoan(updatedLoan);
    await enqueueOp('loan', updatedLoan.id, 'update', updatedLoan);

    const loanAlloc: SettlementAllocation = {
      id: newId(),
      settlement_id: settlement.id,
      partner: 'manager',
      allocation_type: 'loan_payment',
      amount_minor: allocation.loanPaymentMinor,
      loan_id: loan.id,
      note: `Repaid loan ${loan.id}`,
      ...newRecord(user.id),
    };
    allocations.push(loanAlloc);
    await repo.insertAllocation(loanAlloc);
    await enqueueOp('allocation', loanAlloc.id, 'create', loanAlloc);
  }

  await recordActivity(user, 'created', 'allocation', settlement.id, `${user.display_name} allocated Manager share`);

  return { allocations, loan: updatedLoan };
}

export async function addPayment(
  user: User,
  input: { settlement_id: string; partner: Payment['partner']; amount_minor: number; status: 'released' | 'received'; note?: string | null }
): Promise<{ payment: Payment; settlement: MonthlySettlement }> {
  requirePermission(user, 'payment:mark');
  const settlement = await repo.getSettlementById(input.settlement_id);
  if (!settlement) throw notFound('Settlement not found.');
  if (input.amount_minor <= 0) throw validationError('Payment must be greater than zero.');

  const p: Payment = {
    id: newId(),
    settlement_id: settlement.id,
    partner: input.partner,
    amount_minor: input.amount_minor,
    business_date: new Date().toISOString().slice(0, 10),
    status: input.status,
    note: input.note ?? null,
    ...newRecord(user.id),
  };
  await repo.insertPayment(p);
  await enqueueOp('payment', p.id, 'create', p);

  const payments = await repo.getPaymentsForSettlement(settlement.id);
  const totalPaid = payments.reduce((s, x) => s + x.amount_minor, 0);
  const totalDue = settlement.admin_due_minor + settlement.manager_due_minor;
  const newStatus = totalPaid <= 0 ? 'pending' : totalPaid >= totalDue ? 'paid' : 'partial';
  const updatedSettlement: MonthlySettlement = {
    ...settlement,
    status: newStatus,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
    sync_state: 'pending',
    local_version: settlement.local_version + 1,
  };
  await repo.updateSettlement(updatedSettlement);
  await enqueueOp('settlement', updatedSettlement.id, 'update', updatedSettlement);

  await recordActivity(user, 'marked_paid', 'payment', p.id, `${user.display_name} recorded payment of ${fmt(p.amount_minor)}`);

  return { payment: p, settlement: updatedSettlement };
}

/* ------------------------------ Analytics ------------------------------ */

export async function getRoIAnalytics(): Promise<unknown> {
  const investments = await repo.getAllInvestments();
  const settlements = await repo.getAllSettlements();
  const settings = await getAllSettings();

  const totalInvestment = investments.reduce((s, i) => s + i.amount_minor, 0);
  // Recovery basis: admin net share (default) or net profit
  const recovered = settlements.reduce((s, st) => {
    if (settings.investmentRecoveryBasis === 'net_profit') return s + st.net_profit_minor;
    return s + st.admin_due_minor;
  }, 0);

  return calc.investments.computeRecovery({
    totalInvestmentMinor: totalInvestment,
    cumulativeNetReturnMinor: recovered,
    monthsInOperation: settlements.length,
  });
}