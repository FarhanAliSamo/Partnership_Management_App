/**
 * Centralized financial calculation engine (pure functions, no I/O).
 * Re-exported as namespace objects so call sites read like `calc.split.split(...)`.
 */
export * as money from './money';
export * as split from './split';
export * as expenses from './expenses';
export * as settlements from './settlements';
export * as allocations from './allocations';
export * as loans from './loans';
export * as investments from './investments';
export * as analytics from './analytics';
export * from './types';