import { split, splitOf } from '../split';
import { classifyExpense } from '../expenses';
import { buildSettlement } from '../settlements';
import { buildAllocation, totalAllocated } from '../allocations';
import { loanRemaining, loanStatusFromRemaining, netPositionDisplay } from '../loans';
import { computeRecovery } from '../investments';
import { fromMajor, toMajor } from '../money';
import { DEFAULT_SETTINGS } from '@/constants/defaults';

const wifiSettings = DEFAULT_SETTINGS;

describe('split', () => {
  it('splits 50/50 and reconciles exactly', () => {
    const r = split({ totalMinor: 100000, adminPercent: 50, managerPercent: 50 });
    expect(r.adminMinor + r.managerMinor).toBe(100000);
  });

  it('puts rounding remainder into admin', () => {
    const r = split({ totalMinor: 100001, adminPercent: 50, managerPercent: 50 });
    expect(r.adminMinor).toBe(50001);
    expect(r.managerMinor).toBe(50000);
  });
});

describe('expenses classification', () => {
  it('WiFi is shared by default', () => {
    expect(classifyExpense({ category: 'WiFi', is_wifi: true }, wifiSettings)).toBe('shared');
  });
  it('non-WiFi is admin-deductible by default', () => {
    expect(classifyExpense({ category: 'Repair', is_wifi: false }, wifiSettings)).toBe('admin_deductible');
  });
});

describe('settlement', () => {
  it('matches the 200,000 example', () => {
    const result = buildSettlement({
      month: '2026-08',
      earningsMinor: 200000,
      expenses: [{ amount_minor: 15000, category: 'Repair', is_wifi: false }],
      settings: wifiSettings,
    });
    expect(result.adminDueMinor).toBe(85000);
    expect(result.managerDueMinor).toBe(100000);
  });
});

describe('allocation', () => {
  it('reconciles received + loanPayment = share', () => {
    const r = buildAllocation({ partnerShareMinor: 100000, outstandingLoanMinor: 30000, mode: 'split', payLoanMinor: 10000 });
    expect(totalAllocated(r)).toBe(100000);
    expect(r.loanPaymentMinor).toBe(10000);
    expect(r.receivedMinor).toBe(90000);
  });
});

describe('loans', () => {
  it('returns paid at zero remaining', () => {
    const remaining = loanRemaining({ amount_minor: 30000, repayments: [5000, 5000, 20000] });
    expect(remaining).toBe(0);
    expect(loanStatusFromRemaining(remaining)).toBe('paid');
  });
  it('computes net position', () => {
    const display = netPositionDisplay([
      { borrower: 'manager', remaining_minor: 30000 },
      { borrower: 'admin', remaining_minor: 10000 },
    ]);
    expect(display.kind).toBe('manager_owes_admin');
    if (display.kind === 'manager_owes_admin') expect(display.amount).toBe(20000);
  });
});

describe('investment recovery', () => {
  it('computes 28% recovery from the example', () => {
    const r = computeRecovery({ totalInvestmentMinor: 1250000, cumulativeNetReturnMinor: 350000, monthsInOperation: 1 });
    expect(r.recoveryPercent).toBe(28);
    expect(r.remainingMinor).toBe(900000);
  });
});

describe('money', () => {
  it('round-trips major/minor', () => {
    expect(toMajor(fromMajor(8500, 2), 2)).toBe(8500);
  });
});