import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Biometric (Face ID / Touch ID / fingerprint) helpers.
 * The OS-level biometric enrollment is the user's responsibility; the app
 * only flags a user account as biometric-enabled and performs unlock prompts.
 */

export async function isBiometricSupported(): Promise<boolean> {
  try {
    return await LocalAuthentication.hasHardwareAsync();
  } catch {
    return false;
  }
}

export async function isBiometricEnrolled(): Promise<boolean> {
  try {
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function deviceSupportsBiometric(): Promise<boolean> {
  const [hw, enrolled] = await Promise.all([isBiometricSupported(), isBiometricEnrolled()]);
  return hw && enrolled;
}

export async function authenticateWithBiometrics(prompt = 'Unlock F CRM'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}