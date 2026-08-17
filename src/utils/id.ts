/**
 * UUID generation. Uses expo-crypto random bytes; falls back to Math.random.
 */

let cryptoRandom: ((byteCount: number) => Uint8Array) | null = null;

export function generateId(): string {
  if (cryptoRandom) {
    const bytes = cryptoRandom(16);
    return formatUuidBytes(bytes);
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatUuidBytes(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    const s = bytes[i]!.toString(16);
    hex.push(s.length === 1 ? '0' + s : s);
  }
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  );
}

// Lazily wire expo-crypto (avoids hard dependency at import time for tests)
export function initIdGenerator(randomFn: (n: number) => Uint8Array): void {
  cryptoRandom = randomFn;
}