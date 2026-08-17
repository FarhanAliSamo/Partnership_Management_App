import type { AllocationInput, AllocationResult } from './types';

/**
 * Manager's share allocation: Take / Pay Loan / Split.
 * Invariant: receivedMinor + loanPaymentMinor === partnerShareMinor.
 */
export function buildAllocation(input: AllocationInput): AllocationResult {
  const share = Math.max(0, input.partnerShareMinor);
  const outstanding = Math.max(0, input.outstandingLoanMinor);

  switch (input.mode) {
    case 'take':
      return { receivedMinor: share, loanPaymentMinor: 0 };
    case 'pay_loan': {
      const pay = Math.min(share, outstanding);
      return { receivedMinor: share - pay, loanPaymentMinor: pay };
    }
    case 'split': {
      const requested = Math.max(0, input.payLoanMinor);
      const pay = Math.min(requested, share, outstanding);
      return { receivedMinor: share - pay, loanPaymentMinor: pay };
    }
  }
}

export function totalAllocated(result: AllocationResult): number {
  return result.receivedMinor + result.loanPaymentMinor;
}

export function allocatesFully(result: AllocationResult, shareMinor: number): boolean {
  return totalAllocated(result) === shareMinor;
}