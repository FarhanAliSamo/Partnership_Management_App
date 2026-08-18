import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  getUserByUsername,
  getUserAuth,
  getUserById,
  setUserPasscodeHash,
  setBiometricEnabled,
  getBiometricEnabled,
  updateDisplayName,
  upsertUser,
  listUsers,
  deleteUserById,
  countUsers,
} from '@/repositories/userRepository';
import { generateId } from '@/utils/id';
import { validationError } from './errors';
import { canForUser } from './permissionService';
import type { User, RoleKey } from '@/types';

const SESSION_KEY = 'fcrm.session.userId';
const BIOMETRIC_KEY = 'fcrm.biometric.userId';

export interface AuthResult {
  user: User;
}

/** Minimum passcode length for security. */
const MIN_PASSCODE_LENGTH = 4;

export async function login(username: string, passcode: string): Promise<AuthResult> {
  const user = await getUserByUsername(username.trim().toLowerCase());
  if (!user) {
    throw validationError('Incorrect credentials. Try again.');
  }

  const auth = await getUserAuth(user.id);
  // A user must have a passcode set (created via the create-user flow).
  if (!auth?.passcode_hash) {
    throw validationError('This account is not set up. Contact the admin.');
  }

  const matches = await verifyPasscode(passcode, auth.passcode_hash);
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

/* ------------------------------ User management ------------------------------ */

export function hasAnyUser(): Promise<boolean> {
  return countUsers().then((n) => n > 0);
}

/** Create the first admin during setup (no existing users). */
export async function createFirstAdmin(input: {
  username: string;
  display_name: string;
  passcode: string;
}): Promise<User> {
  const existing = await countUsers();
  if (existing > 0) {
    throw validationError('Setup already completed.');
  }
  await validateNewUser(input.username, input.passcode);

  const user: User = {
    id: generateId(),
    username: input.username.trim().toLowerCase(),
    display_name: input.display_name.trim() || 'Admin',
    role_key: 'admin',
  };
  await upsertUser(user);
  await setUserPasscodeHash(user.id, await hashPasscode(input.passcode.trim()));
  await persistSession(user.id);
  return user;
}

/** Admin creates a new user (admin or manager). */
export async function createUser(
  actor: User | null,
  input: { username: string; display_name: string; role_key: RoleKey; passcode: string }
): Promise<User> {
  if (!canForUser(actor, 'permission:manage')) {
    throw validationError('Only the admin can create users.');
  }
  await validateNewUser(input.username, input.passcode);

  const existing = await getUserByUsername(input.username.trim().toLowerCase());
  if (existing) throw validationError('That username already exists.');

  const user: User = {
    id: generateId(),
    username: input.username.trim().toLowerCase(),
    display_name: input.display_name.trim() || input.username.trim(),
    role_key: input.role_key,
  };
  await upsertUser(user);
  await setUserPasscodeHash(user.id, await hashPasscode(input.passcode.trim()));
  return user;
}

/** Admin deletes a user (cannot delete self). */
export async function deleteUser(actor: User | null, userId: string): Promise<void> {
  if (!canForUser(actor, 'permission:manage')) {
    throw validationError('Only the admin can delete users.');
  }
  if (actor && actor.id === userId) {
    throw validationError('You cannot delete your own account.');
  }
  await deleteUserById(userId);
}

/** Admin resets another user's passcode. */
export async function adminResetPasscode(
  actor: User | null,
  userId: string,
  newPasscode: string
): Promise<void> {
  if (!canForUser(actor, 'permission:manage')) {
    throw validationError('Only the admin can reset passwords.');
  }
  if (newPasscode.trim().length < MIN_PASSCODE_LENGTH) {
    throw validationError(`Password must be at least ${MIN_PASSCODE_LENGTH} characters.`);
  }
  await setUserPasscodeHash(userId, await hashPasscode(newPasscode.trim()));
}

export async function listPartners(actor: User | null): Promise<User[]> {
  if (!canForUser(actor, 'permission:manage')) return [];
  return listUsers();
}

/* ------------------------------ Password helpers ------------------------------ */

export async function setPasscode(userId: string, passcode: string): Promise<void> {
  await setUserPasscodeHash(userId, await hashPasscode(passcode));
}

/** Verify a passcode against the stored hash. */
export async function verifyUserPasscode(userId: string, passcode: string): Promise<boolean> {
  const auth = await getUserAuth(userId);
  if (!auth?.passcode_hash) return false;
  return verifyPasscode(passcode, auth.passcode_hash);
}

/** Self-service reset: set a new passcode by username (private 2-person app). */
export async function resetPasscodeByUsername(
  username: string,
  newPasscode: string
): Promise<void> {
  if (newPasscode.trim().length < MIN_PASSCODE_LENGTH) {
    throw validationError(`New password must be at least ${MIN_PASSCODE_LENGTH} characters.`);
  }
  const user = await getUserByUsername(username.trim().toLowerCase());
  if (!user) throw validationError('Account not found.');
  await setUserPasscodeHash(user.id, await hashPasscode(newPasscode.trim()));
}

/** Change a user's own passcode after verifying the current one. */
export async function changePasscode(
  userId: string,
  currentPass: string,
  newPass: string
): Promise<void> {
  if (newPass.trim().length < MIN_PASSCODE_LENGTH) {
    throw validationError(`New password must be at least ${MIN_PASSCODE_LENGTH} characters.`);
  }
  const ok = await verifyUserPasscode(userId, currentPass);
  if (!ok) {
    throw validationError('Current password is incorrect.');
  }
  await setUserPasscodeHash(userId, await hashPasscode(newPass.trim()));
}

/** Persist a user's display name and return the refreshed user. */
export async function renameUser(userId: string, displayName: string): Promise<User> {
  const trimmed = displayName.trim();
  if (!trimmed) throw validationError('Name cannot be empty.');
  await updateDisplayName(userId, trimmed);
  const updated = await getUserById(userId);
  if (!updated) throw validationError('User not found.');
  return updated;
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

/* ------------------------------ Validation ------------------------------ */

async function validateNewUser(username: string, passcode: string): Promise<void> {
  const uname = username.trim();
  if (!uname) throw validationError('Username is required.');
  if (uname.length < 3) throw validationError('Username must be at least 3 characters.');
  if (passcode.trim().length < MIN_PASSCODE_LENGTH) {
    throw validationError(`Password must be at least ${MIN_PASSCODE_LENGTH} characters.`);
  }
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