import type { DayAgg, SalesMetrics } from './types';

/**
 * Averages, run rate, and comparisons. Closed days are excluded from
 * "open day" denominators.
 */
export function computeSalesMetrics(
  days: DayAgg[],
  currentMonthKey: string,
  currentMonthOpenDaysSoFar: number,
  projectedOpenDaysInMonth: number,
  prevMonthTotals: number[]
): SalesMetrics {
  const currentDays = days.filter((d) => d.date.startsWith(currentMonthKey));

  const currentMonthTotal = currentDays.reduce((sum, d) => sum + d.earningMinor, 0);
  const openDayCount = currentDays.filter(
    (d) => d.state === 'open' || d.state === 'open_zero'
  ).length;
  const closedDayCount = currentDays.filter((d) => d.state === 'closed').length;

  const avgDailyOnOpenDays = openDayCount > 0 ? Math.round(currentMonthTotal / openDayCount) : 0;

  // Average monthly = mean of full historical monthly totals (all months passed in)
  const avgMonthly = prevMonthTotals.length > 0
    ? Math.round(prevMonthTotals.reduce((a, b) => a + b, 0) / prevMonthTotals.length)
    : 0;

  const elapsed = Math.max(1, currentMonthOpenDaysSoFar);
  const projected = Math.max(elapsed, projectedOpenDaysInMonth);
  const runRate = Math.round((currentMonthTotal / elapsed) * projected);
  const projectedMonthEnd = runRate;

  const prevMonthTotal = prevMonthTotals.length > 0
    ? prevMonthTotals[prevMonthTotals.length - 1] ?? 0
    : 0;

  const prevMonthDeltaPercent =
    prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : null;

  return {
    currentMonthTotalMinor: currentMonthTotal,
    openDayCount,
    closedDayCount,
    avgDailyOnOpenDaysMinor: avgDailyOnOpenDays,
    avgMonthlyMinor: avgMonthly,
    runRateMinor: runRate,
    projectedMonthEndMinor: projectedMonthEnd,
    prevMonthTotalMinor: prevMonthTotal,
    prevMonthDeltaPercent:
      prevMonthDeltaPercent === null ? null : Math.round(prevMonthDeltaPercent * 10) / 10,
  };
}

/** Sum earnings for a set of days (open/zero contributions; closed = 0). */
export function sumEarnings(days: DayAgg[]): number {
  return days.reduce((sum, d) => sum + d.earningMinor, 0);
}

export function countOpenDays(days: DayAgg[]): number {
  return days.filter((d) => d.state === 'open' || d.state === 'open_zero').length;
}

export function countClosedDays(days: DayAgg[]): number {
  return days.filter((d) => d.state === 'closed').length;
}