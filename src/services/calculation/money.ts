/**
 * Integer-minor-unit money conversion and formatting. No floating point in storage.
 * Conversion from major uses integer-ish rounding semantics (round half up).
 */

export function fromMajor(major: number, minorUnits: number): number {
  const scale = Math.pow(10, minorUnits);
  // Convert to string-safe rounding to avoid binary float drift:
  return Math.round((major + Number.EPSILON) * scale);
}

export function toMajor(minor: number, minorUnits: number): number {
  return minor / Math.pow(10, minorUnits);
}

export function roundToMinor(value: number, minorUnits: number): number {
  return Math.round(value);
}

export function parseIntAmount(major: number, minorUnits: number): number {
  const scale = Math.pow(10, minorUnits);
  const scaled = major * scale;
  // half-up rounding
  return scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
}

export function format(
  minor: number,
  currency: string,
  minorUnits: number,
  locale = 'en-PK'
): string {
  const major = toMajor(minor, minorUnits);
  const symbol = currency === 'PKR' ? 'Rs.' : currency;
  const digits = minorUnits === 0 ? 0 : 2;
  const formatted = major.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${symbol} ${formatted}`;
}

/** Format with sign and no currency symbol (for deltas). */
export function formatSigned(minor: number, minorUnits: number): string {
  const major = toMajor(minor, minorUnits);
  const sign = major > 0 ? '+' : major < 0 ? '-' : '';
  return `${sign}${major.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatMoney(minor: number, minorUnits: number): string {
  const major = toMajor(minor, minorUnits);
  return major.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: minorUnits === 0 ? 0 : 2,
  });
}