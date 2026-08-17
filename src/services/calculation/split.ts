import type { SplitInput, SplitResult } from './types';

/**
 * Partner split. Remainder (from rounding) goes to Admin so
 * adminMinor + managerMinor === totalMinor always holds.
 */
export function split(input: SplitInput): SplitResult {
  const admin = Math.round((input.totalMinor * input.adminPercent) / 100);
  const manager = input.totalMinor - admin;
  return { adminMinor: admin, managerMinor: manager };
}

export function splitOf(totalMinor: number, percent: number): number {
  return Math.round((totalMinor * percent) / 100);
}