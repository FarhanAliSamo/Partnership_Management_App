# 07 — Calculation Engine

> The **single source of truth** for all financial math in **F CRM**.
> Located at `src/services/calculation/`. Pure functions only — no I/O, no `Date.now()`, no navigation.

**Rule: screens and services never re-implement these formulas.** They call these functions and render the results.

---

## 1. Money (integer minor units)

All amounts are integer minor units (`amount_minor`). Pakistan PKR default → 2 minor units (paisa).

```ts
const CURRENCY_MINOR_UNITS = 2; // configurable via settings

fromMajor(major: number): number {
  return Math.round(major * 10 ** minorUnits);
}

toMajor(minor: number): number {
  return minor / 10 ** minorUnits;
}

format(minor: number, currency = 'PKR'): string {
  // e.g. Rs. 8,500 (use Intl.NumberFormat with appropriate locale)
}
```

**Rounding rule (split remainder):** use `Math.round` for individual shares, then assign any remainder to the **Admin** share so `adminShare + managerShare === total` always holds.

---

## 2. Daily Split

```ts
type SplitInput = {
  totalMinor: number;
  adminPercent: number;    // 50
  managerPercent: number;  // 50
};

type SplitResult = {
  adminMinor: number;
  managerMinor: number;
};

split(input: SplitInput): SplitResult {
  const admin = Math.round(totalMinor * adminPercent / 100);
  const manager = totalMinor - admin; // remainder to admin
  return { adminMinor: admin, managerMinor: manager };
}
```

---

## 3. Expense Classification

Categorize each expense into WiFi vs non-WiFi, and compute deduction treatment.

```ts
type ExpenseClassification = 'shared' | 'admin_deductible';

classifyExpense(expense, settings): ExpenseClassification {
  if (expense.category === 'wifi') {
    return settings.wifiExpenseTreatment === 'admin' ? 'admin_deductible' : 'shared';
  }
  return settings.adminBearsNonWifiExpenses ? 'admin_deductible' : 'shared';
}
```

---

## 4. Monthly Settlement

```ts
type SettlementInput = {
  month: string;                    // 'YYYY-MM'
  earningsMinor: number;            // sum of month's earning entries
  expenses: Expense[];              // all month expenses (with category)
  settings: BusinessSettings;
};

type SettlementResult = {
  totalEarningMinor: number;
  sharedExpenseMinor: number;       // WiFi if shared
  netBusinessProfitMinor: number;
  adminGrossShareMinor: number;
  managerGrossShareMinor: number;
  adminDeductibleExpenseMinor: number; // non-wifi → admin share
  adminDueMinor: number;
  managerDueMinor: number;
};

buildSettlement(input: SettlementInput): SettlementResult {
  const shared = sum(expenses.filter(e => classify(e) === 'shared'));
  const adminDeduct = sum(expenses.filter(e => classify(e) === 'admin_deductible'));

  const netProfit = earningsMinor - shared;

  const { adminMinor, managerMinor } = split({
    totalMinor: netProfit,
    adminPercent: settings.adminSharePercent,
    managerPercent: settings.managerSharePercent,
  });

  const adminDue = adminMinor - adminDeduct;
  const managerDue = managerMinor;

  return {
    totalEarningMinor: earningsMinor,
    sharedExpenseMinor: shared,
    netBusinessProfitMinor: netProfit,
    adminGrossShareMinor: adminMinor,
    managerGrossShareMinor: managerMinor,
    adminDeductibleExpenseMinor: adminDeduct,
    adminDueMinor: adminDue,
    managerDueMinor: managerDue,
  };
}
```

### Example (matches prompt)
```
Total Earning  200,000
WiFi (shared)       0
Net Profit     200,000
Admin Gross    100,000
Manager Gross  100,000
Admin Exp       15,000 (non-wifi)
Admin Due       85,000
Manager Due    100,000
```

---

## 5. Settlement Allocations (where did the money go)

Manager chooses Take / Pay Loan / Split. Must reconcile exactly.

```ts
type AllocationInput = {
  partnerShareMinor: number;
  outstandingLoanMinor: number;     // loan they can repay
  mode: 'take' | 'pay_loan' | 'split';
  payLoanMinor: number;            // used when mode = split
};

type AllocationResult = {
  receivedMinor: number;
  loanPaymentMinor: number;
};

buildAllocation(input: AllocationInput): AllocationResult {
  switch (input.mode) {
    case 'take':
      return { receivedMinor: partnerShareMinor, loanPaymentMinor: 0 };
    case 'pay_loan': {
      const pay = Math.min(partnerShareMinor, outstandingLoanMinor);
      return { receivedMinor: partnerShareMinor - pay, loanPaymentMinor: pay };
    }
    case 'split': {
      const pay = Math.min(input.payLoanMinor, partnerShareMinor, outstandingLoanMinor);
      return { receivedMinor: partnerShareMinor - pay, loanPaymentMinor: pay };
    }
  }
}
```

**Invariant:** `receivedMinor + loanPaymentMinor === partnerShareMinor` after validation.

---

## 6. Loan Balances

```ts
type Loan = { amountMinor: number; repayments: number[]; status: 'active' | 'paid' };

loanRemaining(loan: Loan): number {
  const paid = sum(loan.repayments);
  return Math.max(0, loan.amountMinor - paid);
}

loanStatus(remaining: number): 'active' | 'paid' {
  return remaining <= 0 ? 'paid' : 'active';
}
```

### Net position
```ts
netLoanPosition(loans: Loan[]): { managerOwesAdminMinor: number; adminOwesManagerMinor: number } {
  // loans where borrower = manager → manager owes admin
  // loans where borrower = admin  → admin owes manager
  return {
    managerOwesAdminMinor: sum(remaining of loans where borrower = manager),
    adminOwesManagerMinor: sum(remaining of loans where borrower = admin),
  };
}
```

---

## 7. Investment Recovery & ROI

Keep concepts separate: **Revenue → Expenses → Net Profit → Partner Share → Cumulative Return → Recovery.**

```ts
type RecoveryInput = {
  totalInvestmentMinor: number;
  cumulativeNetReturnMinor: number;   // admin's cumulative net profit share (default basis)
  monthsInOperation: number;
};

type RecoveryResult = {
  recoveredMinor: number;          // amount recovered (configurable basis, default = cumulative net return)
  remainingMinor: number;
  recoveryPercent: number;         // %
  roiPercent: number;              // %
  avgMonthlyNetReturnMinor: number;
  paybackMonthsEstimate: number | null; // null if no return yet
};

computeRecovery(input: RecoveryInput): RecoveryResult {
  const recovered = input.cumulativeNetReturnMinor;
  const remaining = Math.max(0, input.totalInvestmentMinor - recovered);
  const recoveryPercent = total > 0 ? (recovered / total) * 100 : 0;
  const roiPercent = total > 0 ? ((cumulative - total) / total) * 100 : 0;
  const avgMonthly = months > 0 ? cumulative / months : 0;
  const payback = avgMonthly > 0 ? total / avgMonthly : null;
  return { ... };
}
```

> **Payback** is output as `paybackMonthsEstimate` and always labeled "estimate" in UI. Never presented as guaranteed.

---

## 8. Averages & Run Rate

```ts
type DailyAgg = {
  date: string;
  state: 'open' | 'open_zero' | 'closed' | 'unrecorded';
  earningMinor: number; // 0 for open_zero and closed
};

type SalesMetrics = {
  currentMonthTotalMinor: number;
  openDayCount: number;           // open + open_zero days
  closedDayCount: number;
  avgDailyOnOpenDaysMinor: number;
  avgMonthlyMinor: number;        // across full historical months
  runRateMinor: number;           // projected month-end
  projectedMonthEndMinor: number;
  prevMonthTotalMinor: number;
  prevMonthDeltaPercent: number;
};

computeSalesMetrics(days: DailyAgg[], currentMonth: string, prevMonthTotals: number[]): SalesMetrics {
  // open days = state in [open, open_zero]
  // closed days excluded from open-day averages
  // avgDailyOnOpenDays = totalEarning / openDayCount
  // runRate = (currentMonthTotal / elapsedOpenDays) * projectedOpenDays
  // prevMonthDelta = (current - prev) / prev * 100
}
```

**Rule:** closed days are excluded from "open day" denominators. Any "calendar-day" metric is explicitly labeled.

---

## 9. Module API (`index.ts` re-exports)

```ts
export * as money from './money';
export * as split from './split';
export * as expenses from './expenses';
export * as settlements from './settlements';
export * as allocations from './allocations';
export * as loans from './loans';
export * as investments from './investments';
export * as analytics from './analytics';
export * from './types';
```

---

## 10. Testing Requirements

Every module under `calculation/__tests__/` must cover:

- Split remainder reconciliation (`admin + manager === total`).
- WiFi shared vs admin-deductible classification under both configs.
- Settlement example (200,000 case) → Admin Due 85,000 / Manager Due 100,000.
- Allocation reconciliation (`received + loanPayment === share`).
- Loan auto-paid at zero remaining.
- Recovery/ROI/payback example (1,250,000 invested, 350,000 recovered → 28%).
- Closed-day exclusion from open-day averages.
- Money conversion round-trip (`fromMajor(toMajor(x))` no drift).

> These are the acceptance-level financial tests. Failing them is a build blocker (see [`12-roadmap.md`](12-roadmap.md)).