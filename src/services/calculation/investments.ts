import type { RecoveryInput, RecoveryResult } from './types';

/**
 * Investment recovery + ROI. Keep revenue → net profit → return → recovery
 * as distinct concepts. Payback is an estimate only.
 */
export function computeRecovery(input: RecoveryInput): RecoveryResult {
  const total = Math.max(0, input.totalInvestmentMinor);
  const cumulative = input.cumulativeNetReturnMinor;
  const months = Math.max(0, input.monthsInOperation);

  const recovered = Math.max(0, cumulative);
  const remaining = Math.max(0, total - recovered);

  const recoveryPercent = total > 0 ? (recovered / total) * 100 : 0;
  const roiPercent = total > 0 ? ((cumulative - total) / total) * 100 : 0;
  const avgMonthly = months > 0 ? cumulative / months : 0;
  const payback = avgMonthly > 0 ? total / avgMonthly : null;

  return {
    recoveredMinor: Math.round(recovered),
    remainingMinor: Math.round(remaining),
    recoveryPercent: round2(recoveryPercent),
    roiPercent: round2(roiPercent),
    avgMonthlyNetReturnMinor: Math.round(avgMonthly),
    paybackMonthsEstimate: payback === null ? null : round2(payback),
  };
}

export function percentSafe(part: number, whole: number): number {
  if (whole === 0) return 0;
  return round2((part / whole) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}