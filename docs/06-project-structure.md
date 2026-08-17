# 06 — Project Structure

> Concrete file/folder layout for **F CRM** (Expo + React Native + TypeScript + Expo Router).
> This is the implementation map — keep new files aligned with this structure.

---

## 1. Root Layout

```
F CRM/
├── app/                          # Expo Router routes (screens)
├── src/                          # Application source
│   ├── components/               # Reusable UI components
│   ├── constants/                # Colors, spacing, labels, enums
│   ├── db/                       # SQLite setup + migrations
│   ├── hooks/                    # React hooks (domain + shared)
│   ├── lib/                      # Cross-cutting utilities
│   ├── repositories/             # SQLite data access
│   ├── services/                 # Domain services + sync engine
│   │   └── calculation/          # Centralized finance engine
│   ├── stores/                   # Zustand stores
│   ├── api/                      # Backend client + DTOs
│   ├── theme/                    # Design tokens (light/dark)
│   ├── types/                    # Shared TypeScript types
│   └── utils/                    # Formatters, validators, money
├── assets/                       # Images, icons, fonts
├── docs/                         # This documentation set
├── .env / .env.example
├── app.json / app.config.ts      # Expo config
├── package.json
├── tsconfig.json
└── README.md
```

---

## 2. `app/` — Routes (Expo Router)

Follow file-based routing. Nested navigation under Finance.

```
app/
├── _layout.tsx                     # Root stack + providers
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── lock.tsx                    # biometric / passcode gate
│
├── (tabs)/
│   ├── _layout.tsx                 # Bottom tabs: Home, Earnings, Expenses, Finance, More
│   ├── index.tsx                   # Home / Dashboard
│   ├── earnings.tsx
│   ├── expenses.tsx
│   ├── finance/                    # Nested stack (Finance)
│   │   ├── _layout.tsx
│   │   ├── index.tsx               # Finance hub (Investments, Loans, Settlements, Reports)
│   │   ├── investments.tsx
│   │   ├── investment-detail.tsx
│   │   ├── add-investment.tsx
│   │   ├── loans.tsx
│   │   ├── loan-detail.tsx
│   │   ├── add-loan.tsx
│   │   ├── add-repayment.tsx
│   │   ├── settlements.tsx
│   │   ├── settlement-detail.tsx
│   │   ├── settlement-allocation.tsx
│   │   ├── payments.tsx
│   │   └── reports.tsx
│   └── more/
│       ├── _layout.tsx
│       ├── index.tsx               # More hub (Activity, Settings)
│       ├── activity.tsx
│       └── settings.tsx
│
├── earning/
│   ├── add-earning.tsx
│   ├── edit-earning.tsx
│   ├── earning-detail.tsx
│   └── closed-day.tsx
│
└── expense/
    ├── add-expense.tsx
    └── edit-expense.tsx
```

> Note: `finance` and `more` are nested stacks accessible via bottom tab. `earning`/`expense` are modal/stack screens outside the tab navigator where suitable.

---

## 3. `src/` — Layers

### 3.1 `src/services/calculation/` (CALCULATION ENGINE)

```
calculation/
├── index.ts                       # public API re-exports
├── types.ts                       # input/output snapshots
├── money.ts                       # minor-unit conversion + formatting
├── split.ts                       # partner split + rounding
├── expenses.ts                    # wifi vs admin-deductible classification
├── settlements.ts                 # monthly settlement builder
├── allocations.ts                 # take-share / pay-loan / split
├── loans.ts                       # loan balances, repayments
├── investments.ts                 # recovery, ROI, payback estimate
├── analytics.ts                   # averages, run rate, comparisons
└── __tests__/                     # unit tests for every module
```

### 3.2 `src/services/` (DOMAIN SERVICES)

```
services/
├── authService.ts
├── earningService.ts
├── closedDayService.ts
├── expenseService.ts
├── investmentService.ts
├── loanService.ts
├── settlementService.ts
├── paymentService.ts
├── activityService.ts
├── settingsService.ts
├── permissionService.ts
├── notificationService.ts
└── sync/
    ├── syncEngine.ts
    ├── conflictResolver.ts
    └── queue.ts
```

### 3.3 `src/repositories/`

```
repositories/
├── baseRepository.ts              # shared CRUD + sync fields
├── userRepository.ts
├── roleRepository.ts
├── earningRepository.ts
├── dailyStatusRepository.ts
├── expenseRepository.ts
├── investmentRepository.ts
├── loanRepository.ts
├── repaymentRepository.ts
├── settlementRepository.ts
├── allocationRepository.ts
├── paymentRepository.ts
├── attachmentRepository.ts
├── activityRepository.ts
├── syncQueueRepository.ts
└── settingsRepository.ts
```

### 3.4 `src/api/`

```
api/
├── client.ts                      # typed HTTP client (fetch/axios)
├── authApi.ts
├── earningApi.ts
├── expenseApi.ts
├── investmentApi.ts
├── loanApi.ts
├── settlementApi.ts
├── attachmentApi.ts               # photo upload endpoints
├── syncApi.ts
└── dto/                           # request/response types
```

### 3.5 `src/db/`

```
db/
├── database.ts                    # SQLite open + pragma + connection
├── migrations/
│   ├── 001_initial.ts
│   └── index.ts                   # migration runner
└── schema.ts                      # table definitions (string SQL)
```

### 3.6 `src/stores/`

```
stores/
├── useAuthStore.ts
├── useSyncStore.ts
├── useUiStore.ts
└── index.ts
```

### 3.7 `src/hooks/`

```
hooks/
├── useEarnings.ts
├── useClosedDays.ts
├── useExpenses.ts
├── useInvestments.ts
├── useLoans.ts
├── useSettlements.ts
├── usePayments.ts
├── useActivity.ts
├── useReports.ts
├── useNetworkStatus.ts
├── useDailyReminder.ts
└── useBiometric.ts
```

### 3.8 `src/components/`

```
components/
├── ui/
│   ├── Card.tsx
│   ├── Button.tsx
│   ├── TextField.tsx
│   ├── MoneyText.tsx
│   ├── Badge.tsx
│   ├── Modal.tsx
│   ├── SegmentedControl.tsx
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx
│   ├── LoadingState.tsx
│   ├── Screen.tsx                    # safe-area + keyboard-aware wrapper
│   ├── DateField.tsx
│   ├── PhotoPicker.tsx
│   └── ConfirmDialog.tsx
├── earning/
│   ├── EarningCard.tsx
│   ├── DailyStatusBadge.tsx
│   └── DailyReminderBanner.tsx
├── expense/
│   └── ExpenseCard.tsx
├── investment/
│   └── InvestmentCard.tsx
├── loan/
│   └── LoanCard.tsx
├── settlement/
│   ├── SettlementCard.tsx
│   └── AllocationBreakdown.tsx
├── charts/
│   ├── BarChart.tsx
│   ├── LineChart.tsx
│   └── DonutChart.tsx
└── sync/
    └── SyncIndicator.tsx             # cloud icon + pending/failed
```

---

## 4. `src/theme/`

```
theme/
├── colors.ts                      # light + dark palettes (single accent)
├── spacing.ts
├── typography.ts
├── radii.ts
├── shadows.ts
└── index.ts                       # theme provider hook
```

---

## 5. `src/constants/`

```
constants/
├── enums.ts                       # RecordType, SyncState, LoanStatus, etc.
├── categories.ts                  # default expense/investment categories
└── defaults.ts                    # default settings
```

---

## 6. `src/utils/`

```
utils/
├── money.ts                       # re-export or alias to calc/money (avoid dup)
├── date.ts                        # business-date helpers, month ranges
├── validation.ts                  # form validators
├── id.ts                          # UUID generation
└── logger.ts                      # safe logging
```

---

## 7. Naming Conventions

- **Components**: `PascalCase` (`EarningCard.tsx`).
- **Hooks**: `useXxx` (`useEarnings.ts`).
- **Services**: `xxxService.ts`.
- **Repositories**: `xxxRepository.ts`.
- **Files**: kebab-case only within `app/` routes (Expo Router requirement); camelCase elsewhere for code modules.
- **Enums/types**: `PascalCase` union/string types in `types/`.

---

## 8. Import Boundaries (enforced mentally / via lint)

- `app/` imports from `src/` only.
- `src/components` must not import repositories/services directly (use hooks/props).
- `src/services/calculation` must not import anything from outside its folder except `types` and `money`.
- `src/repositories` must not import UI.

See [`05-architecture.md`](05-architecture.md) §4 for full dependency rules.