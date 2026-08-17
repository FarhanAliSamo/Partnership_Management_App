/**
 * Business-date helpers. Business dates are `YYYY-MM-DD` strings (local, no tz).
 */

export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Parse YYYY-MM-DD into a local Date at midnight. */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function monthKeyFromISO(s: string): string {
  return s.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKeyFromDate(new Date());
}

export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map((x) => parseInt(x, 10));
  const d = new Date(y!, (m ?? 1) - 1 + n, 1);
  return monthKeyFromDate(d);
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map((x) => parseInt(x, 10));
  return new Date(y!, m ?? 1, 0).getDate();
}

export function formatDateDisplay(iso: string): string {
  const d = parseISODate(iso);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatDateDisplayLong(iso: string): string {
  const d = parseISODate(iso);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthDisplay(monthKey: string): string {
  const [y, m] = monthKey.split('-').map((x) => parseInt(x, 10));
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[(m ?? 1) - 1]} ${y}`;
}

export function relativeTimeFrom(timestamp: string): string {
  const then = new Date(timestamp).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}