/**
 * Calculation engine input/output snapshot types (pure, I/O-free).
 */

export interface SplitInput {
  totalMinor: number;
  adminPercent: number;
  managerPercent: number;
}

export interface SplitResult {
  adminMinor: number;
  managerMinor: number;
}

export type ExpenseClassification = 'shared' | 'admin_deductible';

export interface ExpenseLike {
  category: string;
  is_wifi: boolean;
}

export interface SplitSettingsLike {
  adminSharePercent: number;
  managerSharePercent: number;
  wifiExpenseTreatment: 'shared' | 'admin';
  adminBearsNonWifiExpenses: boolean;
}

export interface SettlementInput {
  month: string;
  earningsMinor: number;
  expenses: Array<{ amount_minor: number; category: string; is_wifi: boolean }>;
  settings: SplitSettingsLike;
}

export interface SettlementResult {
  totalEarningMinor: number;
  sharedExpenseMinor: number;
  netBusinessProfitMinor: number;
  adminGrossShareMinor: number;
  managerGrossShareMinor: number;
  adminDeductibleExpenseMinor: number;
  adminDueMinor: number;
  managerDueMinor: number;
}

export type AllocationMode = 'take' | 'pay_loan' | 'split';

export interface AllocationInput {
  partnerShareMinor: number;
  outstandingLoanMinor: number;
  mode: AllocationMode;
  payLoanMinor: number;
}

export interface AllocationResult {
  receivedMinor: number;
  loanPaymentMinor: number;
}

export interface RecoveryInput {
  totalInvestmentMinor: number;
  cumulativeNetReturnMinor: number;
  monthsInOperation: number;
}

export interface RecoveryResult {
  recoveredMinor: number;
  remainingMinor: number;
  recoveryPercent: number;
  roiPercent: number;
  avgMonthlyNetReturnMinor: number;
  paybackMonthsEstimate: number | null;
}

export type DayAggState = 'open' | 'open_zero' | 'closed';

export interface DayAgg {
  date: string;
  state: DayAggState;
  earningMinor: number;
}

export interface SalesMetrics {
  currentMonthTotalMinor: number;
  openDayCount: number;
  closedDayCount: number;
  avgDailyOnOpenDaysMinor: number;
  avgMonthlyMinor: number;
  runRateMinor: number;
  projectedMonthEndMinor: number;
  prevMonthTotalMinor: number;
  prevMonthDeltaPercent: number | null;
}