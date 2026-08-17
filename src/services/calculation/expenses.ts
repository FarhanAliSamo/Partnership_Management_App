import { WIFI_CATEGORY } from '@/constants/categories';
import type { ExpenseLike, ExpenseClassification, SplitSettingsLike } from './types';

/**
 * WiFi (category 'WiFi' or is_wifi flag) vs non-WiFi expense classification.
 * - WiFi: 'shared' by default (deducted before split), or 'admin_deductible' if configured.
 * - Non-WiFi: 'admin_deductible' by default, or 'shared' if adminBearsNonWifiExpenses=false.
 */
export function classifyExpense(
  expense: ExpenseLike,
  settings: SplitSettingsLike
): ExpenseClassification {
  const isWifi = expense.is_wifi || expense.category === WIFI_CATEGORY;
  if (isWifi) {
    return settings.wifiExpenseTreatment === 'admin' ? 'admin_deductible' : 'shared';
  }
  return settings.adminBearsNonWifiExpenses ? 'admin_deductible' : 'shared';
}

export function isWifiExpense(expense: ExpenseLike): boolean {
  return expense.is_wifi || expense.category === WIFI_CATEGORY;
}