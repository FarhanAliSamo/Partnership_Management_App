/**
 * Lightweight data-invalidation bus.
 *
 * Screens/hooks read from SQLite, which is not an HTTP source, so TanStack Query
 * cannot observe local writes automatically. This bus lets any mutation signal
 * "local data changed" and every subscribed hook re-fetches immediately —
 * giving instant, realtime UI updates without a page reload or re-login.
 */

let version = 0;
const listeners = new Set<() => void>();

export function getDataVersion(): number {
  return version;
}

export function invalidateData(): void {
  version += 1;
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  }
}

export function subscribeData(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}