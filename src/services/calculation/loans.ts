import type { Partner } from '@/types';

export interface LoanLike {
  amount_minor: number;
  repayments: number[];
}

export function loanRemaining(loan: LoanLike): number {
  const paid = loan.repayments.reduce((a, b) => a + b, 0);
  return Math.max(0, loan.amount_minor - paid);
}

export function loanStatusFromRemaining(remaining: number): 'active' | 'paid' {
  return remaining <= 0 ? 'paid' : 'active';
}

export interface LoanPositionLike {
  borrower: Partner;
  remaining_minor: number;
}

export interface NetLoanPosition {
  managerOwesAdminMinor: number;
  adminOwesManagerMinor: number;
}

export function netLoanPosition(loans: LoanPositionLike[]): NetLoanPosition {
  let managerOwesAdmin = 0;
  let adminOwesManager = 0;
  for (const loan of loans) {
    if (loan.borrower === 'manager') managerOwesAdmin += loan.remaining_minor;
    else adminOwesManager += loan.remaining_minor;
  }
  return {
    managerOwesAdminMinor: managerOwesAdmin,
    adminOwesManagerMinor: adminOwesManager,
  };
}

export type NetPositionDisplay =
  | { kind: 'manager_owes_admin'; amount: number }
  | { kind: 'admin_owes_manager'; amount: number }
  | { kind: 'clear'; amount: 0 };

export function netPositionDisplay(loans: LoanPositionLike[]): NetPositionDisplay {
  const net = netLoanPosition(loans);
  const diff = net.managerOwesAdminMinor - net.adminOwesManagerMinor;
  if (diff > 0) return { kind: 'manager_owes_admin', amount: diff };
  if (diff < 0) return { kind: 'admin_owes_manager', amount: -diff };
  return { kind: 'clear', amount: 0 };
}

export function outstandingForBorrower(loans: LoanPositionLike[], borrower: Partner): number {
  return loans
    .filter((l) => l.borrower === borrower)
    .reduce((sum, l) => sum + l.remaining_minor, 0);
}