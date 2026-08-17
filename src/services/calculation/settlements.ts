import { classifyExpense } from './expenses';
import { split } from './split';
import type { SettlementInput, SettlementResult } from './types';

/**
 * Monthly settlement builder. Steps:
 *   earnings - sharedExpenses(WiFi) = netBusinessProfit
 *   netBusinessProfit -> split -> adminGross / managerGross
 *   adminDue = adminGross - adminDeductibleExpenses(non-wifi)
 */
export function buildSettlement(input: SettlementInput): SettlementResult {
  let sharedExpenseMinor = 0;
  let adminDeductibleExpenseMinor = 0;

  for (const expense of input.expenses) {
    const classification = classifyExpense(expense, input.settings);
    if (classification === 'shared') {
      sharedExpenseMinor += expense.amount_minor;
    } else {
      adminDeductibleExpenseMinor += expense.amount_minor;
    }
  }

  const netBusinessProfitMinor = input.earningsMinor - sharedExpenseMinor;

  const { adminMinor, managerMinor } = split({
    totalMinor: netBusinessProfitMinor,
    adminPercent: input.settings.adminSharePercent,
    managerPercent: input.settings.managerSharePercent,
  });

  const adminDueMinor = adminMinor - adminDeductibleExpenseMinor;
  const managerDueMinor = managerMinor;

  return {
    totalEarningMinor: input.earningsMinor,
    sharedExpenseMinor,
    netBusinessProfitMinor,
    adminGrossShareMinor: adminMinor,
    managerGrossShareMinor: managerMinor,
    adminDeductibleExpenseMinor,
    adminDueMinor,
    managerDueMinor,
  };
}

export function totalsForMonth(
  earningsMinor: number,
  expenses: SettlementInput['expenses'],
  settings: SettlementInput['settings']
): { shared: number; adminDeduct: number } {
  let shared = 0;
  let adminDeduct = 0;
  for (const expense of expenses) {
    if (classifyExpense(expense, settings) === 'shared') shared += expense.amount_minor;
    else adminDeduct += expense.amount_minor;
  }
  return { shared, adminDeduct };
}