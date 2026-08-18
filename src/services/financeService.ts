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
import { scheduleDailyReminderIfNeeded } from './notificationService';
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

/** Guard the database boundary: money is always stored as whole minor units. */
function requireMinorAmount(amount: number, message: string, allowZero = false): void {
  if (!Number.isSafeInteger(amount) || (allowZero ? amount < 0 : amount <= 0)) {
    throw validationError(message);
  }
}

/* ------------------------------- Earnings ------------------------------- */

export async function addEarning(
  user: User,
  input: { business_date: string; amount_minor: number; note?: string | null; cash_holder?: 'split' | 'admin' | 'manager' }
): Promise<Earning> {
  requirePermission(user, 'earning:create');
  requireMinorAmount(input.amount_minor, 'Earning must be zero or a positive whole amount.', true);
  if (!input.business_date) throw validationError('Date is required.');
  const dayStatus = await repo.getDailyStatusForDate(input.business_date);
  if (dayStatus?.status === 'closed') {
    throw validationError('This date is marked closed. Reopen it before adding an earning.');
  }

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

  // If one partner retained the entire day’s cash, the other partner's exact
  // split becomes a transparent partner-to-partner loan automatically.
  if (input.cash_holder && input.cash_holder !== 'split') {
    const settings = await getAllSettings();
    const shares = calc.split.split({
      totalMinor: e.amount_minor,
      adminPercent: settings.adminSharePercent,
      managerPercent: settings.managerSharePercent,
    });
    const borrower = input.cash_holder;
    const loanAmount = borrower === 'manager' ? shares.adminMinor : shares.managerMinor;
    if (loanAmount > 0) {
      const loan: Loan = {
        id: newId(),
        lender: borrower === 'manager' ? 'admin' : 'manager',
        borrower,
        amount_minor: loanAmount,
        business_date: e.business_date,
        reason: `Daily earning share · ${e.business_date}`,
        notes: `Created automatically because ${borrower === 'manager' ? 'manager' : 'admin'} retained the full daily cash.`,
        status: 'active',
        remaining_minor: loanAmount,
        ...newRecord(user.id),
      };
      await repo.insertLoan(loan);
      await enqueueOp('loan', loan.id, 'create', loan);
      await recordActivity(user, 'created', 'loan', loan.id, `${user.display_name} recorded daily cash held as a loan: ${fmt(loanAmount)}`);
    }
  }
  void scheduleDailyReminderIfNeeded().catch(() => undefined);
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
  requireMinorAmount(input.amount_minor, 'Earning must be zero or a positive whole amount.', true);

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
  const earnings = await repo.getEarningsForDate(input.business_date);
  if (earnings.length > 0) {
    throw validationError('This date already has earnings. Remove them before marking the shop closed.');
  }
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
  void scheduleDailyReminderIfNeeded().catch(() => undefined);
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
  requireMinorAmount(input.amount_minor, 'Expense must be greater than zero.');
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
  requireMinorAmount(input.amount_minor, 'Investment must be greater than zero.');
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
  requireMinorAmount(input.amount_minor, 'Loan amount must be greater than zero.');
  if (input.lender === input.borrower) throw validationError('A loan needs two different partners.');
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
  requireMinorAmount(input.amount_minor, 'Repayment must be greater than zero.');
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
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw validationError('Enter a valid month in YYYY-MM format.');
  }
  if (await repo.getSettlementByMonth(month)) {
    throw validationError('A settlement already exists for this month.');
  }

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

export async function deleteSettlement(user: User, id: string): Promise<void> {
  requirePermission(user, 'settlement:manage');
  const existing = await repo.getSettlementById(id);
  if (!existing) throw notFound('Settlement not found.');
  await repo.deleteSettlement(id);
  await enqueueOp('settlement', id, 'delete', { id });
  await recordActivity(user, 'deleted', 'settlement', id, `${user.display_name} deleted settlement ${existing.month}`);
}

export async function allocateManagerShare(
  user: User,
  settlementId: string,
  input: { mode: 'take' | 'pay_loan' | 'split'; payLoanMinor?: number; loanId?: string | null }
): Promise<{ allocations: SettlementAllocation[]; loan?: Loan }> {
  requirePermission(user, 'allocation:manage_own');

  const settlement = await repo.getSettlementById(settlementId);
  if (!settlement) throw notFound('Settlement not found.');

  const existingAllocations = await repo.getAllocationsForSettlement(settlement.id);
  if (existingAllocations.some((allocation) => allocation.partner === 'manager')) {
    throw validationError('The manager share has already been allocated for this settlement.');
  }

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
    const eligibleLoans = input.loanId
      ? activeLoans.filter((loan) => loan.id === input.loanId && loan.borrower === 'manager')
      : activeLoans.filter((loan) => loan.borrower === 'manager');
    if (eligibleLoans.length === 0) throw validationError('No active manager loan is available to repay.');

    // A settlement may cover several loans. Apply oldest loans first so a
    // repayment can never exceed the balance of the first loan in the list.
    const orderedLoans = [...eligibleLoans].sort((a, b) => a.created_at.localeCompare(b.created_at));
    let remainingToApply = allocation.loanPaymentMinor;
    for (const loan of orderedLoans) {
      if (remainingToApply <= 0) break;
      const amount = Math.min(remainingToApply, loan.remaining_minor);
      const repay: LoanRepayment = {
        id: newId(),
        loan_id: loan.id,
        amount_minor: amount,
        business_date: new Date().toISOString().slice(0, 10),
        note: `Settlement repayment - ${settlement.month}`,
        source: 'settlement',
        settlement_id: settlement.id,
        ...newRecord(user.id),
      };
      await repo.insertRepayment(repay);
      await enqueueOp('repayment', repay.id, 'create', repay);

      const remaining = loan.remaining_minor - amount;
      updatedLoan = {
        ...loan,
        remaining_minor: remaining,
        status: remaining === 0 ? 'paid' : 'active',
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
        amount_minor: amount,
        loan_id: loan.id,
        note: `Repaid loan ${loan.id}`,
        ...newRecord(user.id),
      };
      allocations.push(loanAlloc);
      await repo.insertAllocation(loanAlloc);
      await enqueueOp('allocation', loanAlloc.id, 'create', loanAlloc);
      remainingToApply -= amount;
    }

    if (remainingToApply !== 0) throw validationError('Loan repayment could not be fully allocated.');
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
  requireMinorAmount(input.amount_minor, 'Payment must be greater than zero.');

  const existingPayments = await repo.getPaymentsForSettlement(settlement.id);
  const partnerDue = input.partner === 'admin' ? settlement.admin_due_minor : settlement.manager_due_minor;
  const partnerPaid = existingPayments
    .filter((payment) => payment.partner === input.partner)
    .reduce((sum, payment) => sum + payment.amount_minor, 0);
  if (partnerDue <= 0) throw validationError(`There is no payment due to the ${input.partner} for this settlement.`);
  if (input.amount_minor > partnerDue - partnerPaid) {
    throw validationError(`Payment exceeds the remaining ${input.partner} balance.`);
  }

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
  const paidFor = (partner: Payment['partner']) =>
    payments.filter((payment) => payment.partner === partner).reduce((sum, payment) => sum + payment.amount_minor, 0);
  const adminComplete = paidFor('admin') >= Math.max(0, settlement.admin_due_minor);
  const managerComplete = paidFor('manager') >= Math.max(0, settlement.manager_due_minor);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount_minor, 0);
  const newStatus = adminComplete && managerComplete ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
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
