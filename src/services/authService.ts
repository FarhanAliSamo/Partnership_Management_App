import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  getUserByUsername,
  getUserAuth,
  getUserById,
  setUserPasscodeHash,
  setBiometricEnabled,
  getBiometricEnabled,
} from '@/repositories/userRepository';
import { validationError } from './errors';
import type { User } from '@/types';

const SESSION_KEY = 'fcrm.session.userId';
const BIOMETRIC_KEY = 'fcrm.biometric.userId';

export interface AuthResult {
  user: User;
}

/**
 * Default passcodes on first run so the two accounts are usable immediately:
 *   admin   -> admin123
 *   manager -> manager123
 */
const defaultPassFor = (roleKey: string) => (roleKey === 'admin' ? 'admin123' : 'manager123');

export async function login(username: string, passcode: string): Promise<AuthResult> {
  const user = await getUserByUsername(username.trim().toLowerCase());
  if (!user) {
    throw validationError('Incorrect credentials. Try again.');
  }

  const auth = await getUserAuth(user.id);
  let matches = false;

  if (auth?.passcode_hash) {
    matches = await verifyPasscode(passcode, auth.passcode_hash);
  } else {
    // First run: initialize the account's default passcode.
    const def = defaultPassFor(user.role_key);
    if (passcode === def) {
      await setUserPasscodeHash(user.id, await hashPasscode(def));
      matches = true;
    }
  }

  if (!matches) {
    throw validationError('Incorrect credentials. Try again.');
  }

  await persistSession(user.id);
  return { user };
}

export async function logout(): Promise<void> {
  await clearSession();
  await clearBiometricFlag();
}

export async function restoreSession(): Promise<User | null> {
  let id: string | null = null;
  try {
    id = await getSession();
  } catch {
    return null;
  }
  if (!id) return null;
  try {
    return await getUserById(id);
  } catch {
    return null;
  }
}

export async function setPasscode(userId: string, passcode: string): Promise<void> {
  await setUserPasscodeHash(userId, await hashPasscode(passcode));
}

/* ------------------------------ Biometric ------------------------------ */

export async function enableBiometric(userId: string): Promise<void> {
  await setBiometricEnabled(userId, true);
  await persistBiometricFlag(userId);
}

export async function disableBiometric(userId: string): Promise<void> {
  await setBiometricEnabled(userId, false);
  await clearBiometricFlag();
}

export async function getBiometricUser(): Promise<User | null> {
  const id = await getBiometricFlag();
  if (!id) return null;
  const user = await getUserById(id);
  if (!user) return null;
  const enabled = await getBiometricEnabled(user.id);
  return enabled ? user : null;
}

/* ------------------------------ Hashing ------------------------------ */

async function hashPasscode(passcode: string): Promise<string> {
  try {
    const Crypto = await import('expo-crypto');
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${passcode}:fcrm`
    );
  } catch {
    // Fallback (deterministic) so login never hangs if expo-crypto is unavailable.
    let h = 5381;
    const s = `${passcode}:fcrm`;
    for (let i = 0; i < s.length; i++) {
      h = (h * 33) ^ s.charCodeAt(i);
    }
    return `djb2:${(h >>> 0).toString(16)}`;
  }
}

async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  const candidate = await hashPasscode(passcode);
  return candidate === hash;
}

/* ------------------------------ Storage ------------------------------ */

async function readStore(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeStore(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* ignore */
  }
}

async function deleteStore(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

async function persistSession(userId: string): Promise<void> {
  await writeStore(SESSION_KEY, userId);
}

async function clearSession(): Promise<void> {
  await deleteStore(SESSION_KEY);
}

async function getSession(): Promise<string | null> {
  return readStore(SESSION_KEY);
}

async function persistBiometricFlag(userId: string): Promise<void> {
  await writeStore(BIOMETRIC_KEY, userId);
}

async function clearBiometricFlag(): Promise<void> {
  await deleteStore(BIOMETRIC_KEY);
}

async function getBiometricFlag(): Promise<string | null> {
  return readStore(BIOMETRIC_KEY);
}