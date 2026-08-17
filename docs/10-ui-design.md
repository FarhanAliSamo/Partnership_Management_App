# 10 — UI / UX Design System

> Visual language, design tokens, and UX rules for **F CRM**.
> Implementation in `src/theme/` and `src/components/ui/`.

---

## 1. Design Direction

- **Premium financial SaaS** aesthetic, mobile-first.
- Clean, minimal, sophisticated. Not too colorful.
- **One refined accent color** + dark/light neutral surfaces.
- Feel: professional financial product (like a private banking app), not a generic template.

### Guiding principles
- Excellent spacing (generous whitespace).
- Soft cards with subtle elevation (not harsh borders).
- Strong typographic hierarchy.
- Subtle gradients (sparingly, for hero/header only).
- Smooth transitions & elegant micro-interactions.
- Clear hierarchy; progressive disclosure; no clutter.

---

## 2. Color Tokens

### Accent (single)
- **Primary accent**: refined teal/emerald or deep indigo. Example: `#0EA5E9` (calm financial blue) as primary.
- Choose **one** accent and use its shades sparingly (primary, primary-subtle, on-primary).

### Neutrals (light)
| Token | Value |
|-------|-------|
| `bg` | `#F7F8FA` |
| `surface` | `#FFFFFF` |
| `surfaceAlt` | `#F1F2F6` |
| `border` | `#E5E7EB` |
| `text` | `#111827` |
| `textSecondary` | `#6B7280` |
| `textMuted` | `#9CA3AF` |

### Neutrals (dark)
| Token | Value |
|-------|-------|
| `bg` | `#0B1220` |
| `surface` | `#111A2C` |
| `surfaceAlt` | `#1B2740` |
| `border` | `#243355` |
| `text` | `#F3F4F6` |
| `textSecondary` | `#9CA3AF` |
| `textMuted` | `#6B7280` |

### Semantic
| Token | Light | Use |
|-------|-------|-----|
| `success` | `#16A34A` | Paid, positive, synced |
| `warning` | `#D97706` | Pending, partial, estimate |
| `danger` | `#DC2626` | Delete, failed, negative |
| `info` | accent | Neutral info |

> Use semantic colors only for status/actions; never as decorative rainbow.

---

## 3. Typography

- Use system font stack (SF Pro on iOS, Roboto on Android) + optional branded display font.
- **Scale** (respect user font-size accessibility):
  - `display` — 28–34 (hero numbers)
  - `title` — 20–22 (section headers)
  - `body` — 16 (default)
  - `subhead` — 14
  - `caption` — 12
  - `label` — 13 (uppercase micro-labels)
- **Weights**: 400 regular, 500 medium, 600 semibold, 700 bold.
- Tabular numerals for all money figures (monospaced digits) so columns align.

---

## 4. Spacing & Layout

- 4pt grid: `4, 8, 12, 16, 20, 24, 32, 40`.
- Screen padding: `16–20`.
- Card padding: `16`.
- Card gap: `12`.
- Section gap: `24`.
- Rounded corners: `12` (cards), `16` (large cards), `8` (inputs/buttons), `999` (pills).

---

## 5. Elevation & Surfaces

- Soft shadow (low opacity, large blur), no hard outlines.
- Cards: `shadow 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)`.
- Dark mode: use subtle border + raised surface instead of heavy shadow.

---

## 6. Components

### Core UI (`components/ui/`)
- `Screen` — SafeAreaView + KeyboardAvoidingView + scroll wrapper.
- `Card` — soft surface, optional pressable, optional header/action.
- `Button` — variants: `primary`, `secondary`, `ghost`, `danger`. Full-width for primary CTAs.
- `TextField` — label, helper/error, numeric/money/date variants.
- `MoneyText` — formatted money via calc engine, tabular numerals, sign color.
- `Badge` — status pills (Pending/Paid/Closed/Synced/Conflict).
- `Modal` — bottom sheet style on mobile.
- `SegmentedControl` — for view filters (Today/Week/Month/…).
- `EmptyState` / `ErrorState` / `LoadingState` — consistent, meaningful.
- `DateField` — native date input wrapper.
- `PhotoPicker` — camera/gallery, compressed thumbnails, remove.
- `ConfirmDialog` — destructive action confirmation.

### Domain components
- `EarningCard`, `DailyStatusBadge`, `DailyReminderBanner`
- `ExpenseCard`, `InvestmentCard`, `LoanCard`
- `SettlementCard`, `AllocationBreakdown`
- `SyncIndicator` (cloud icon + state)

### Charts
- `BarChart` (monthly earning/expense)
- `LineChart` (trends)
- `DonutChart` (category/breakdown)
- Keep charts clean, labeled, mobile friendly; 2–3 charts max per view.

---

## 7. Home Layout (information hierarchy)

Order (progressive disclosure):
1. Greeting + date.
2. Today's Status (Open/Closed badge).
3. Today's Earning (hero number).
4. Today's Share (admin/manager mini-split).
5. Compact reminder banner (if not recorded).
6. Current Month — expandable card:
   - Revenue, Average Daily Earning, Run Rate.
7. Expandable: Your Share, Friend Share.
8. Outstanding Loans (plain sentence).
9. Settlement Status (latest).
10. Investment Recovery (progress bar).

> Do NOT show every metric at once. Use compact cards + expandable details.

---

## 8. Zero-Earning Day Visualization

Three visually distinct states in earnings history:

| State | Visual |
|-------|--------|
| Normal day | Date + "Rs. 8,500" (regular text, money color) |
| Open zero day | Date + "Rs. 0" (muted/neutral) |
| Closed day | "Closed — No Earning" badge + reason underneath (muted card, warning/info tint) |

- Use distinct icons: `trending-up` (earning), `minus-circle` (zero), `closed`/`pause` (closed).

---

## 9. Financial Clarity Rules

- Always show **full breakdown**, never a single hidden total.
- Use labels + amounts in aligned columns.
- Example settlement breakdown:
  ```
  Total Earning      Rs. 200,000
  Admin Share        Rs. 100,000
  Manager Share      Rs. 100,000
  Admin Expenses     Rs.  15,000
  ────────────────────────────────
  Admin Final Due    Rs.  85,000
  Manager Final Due  Rs. 100,000
  ```
- Money allocation shows "Received / Loan Payment / Total Allocated".

---

## 10. Empty, Loading, Error States

- Every list/section has a meaningful empty state (see [`11-screens.md`](11-screens.md) for per-screen copy).
- Loading: skeleton cards (not blank screen).
- Error: friendly message + retry action.

---

## 11. Responsiveness

- Support small (≤360dp), standard (390dp), large (≥430dp) widths.
- Use flex layouts, percentage/`Dimensions`-aware components; no fixed pixel positioning.
- SafeArea via `react-native-safe-area-context`.
- Keyboard handling: `KeyboardAvoidingView` + scroll for forms.

---

## 12. Accessibility

- Accessible labels (`accessibilityLabel`) on all interactive elements.
- Minimum touch target: **44×44**.
- Contrast ratio ≥ 4.5:1 for body text.
- Support dynamic font sizes.
- Screen-reader order matches visual hierarchy.
- `prefers-reduced-motion` respected (skip decorative animations).

---

## 13. Motion & Micro-interactions

- Subtle press feedback (opacity/scale < 0.98).
- List item entrance: fade/slide only if quick (< 250ms) and reduced-motion safe.
- Modal transition: slide-up.
- Number changes: no jitter — keep layout stable, use skeleton on load.
- Avoid infinite/loop animations.

---

## 14. Navigation & Structure

- Bottom tabs (5): Home, Earnings, Expenses, Finance, More.
- Finance & More use nested stacks (see [`11-screens.md`](11-screens.md)).
- Consistent header style; contextual FAB/CTA per screen.