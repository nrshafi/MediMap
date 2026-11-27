import { AuthError } from './contracts';
import { passwordRuleMessages, type PasswordRuleCode } from './passwordRules';

export const emailMinLength = 3;
export const emailMaxLength = 320;
// A sign-in password that is longer than this cannot match a stored password. Reject it before hashing.
export const signInPasswordMaxLength = 256;

// The one place that builds the value of accounts.email_normalized. Every write and lookup uses it.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Returns the trimmed email and its normalized form, or null if the value is not an acceptable email.
export function parseEmail(value: unknown): { email: string; normalized: string } | null {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  if (email.length < emailMinLength || email.length > emailMaxLength) return null;
  if (!/^[^\s@\p{Cc}]+@[^\s@\p{Cc}]+\.[^\s@\p{Cc}]+$/u.test(email)) return null;
  return { email, normalized: normalizeEmail(email) };
}

export type PasswordFormError =
  | PasswordRuleCode
  | 'invalid_email'
  | 'mismatch'
  | 'email_in_use'
  | 'credentials'
  | 'forbidden'
  | 'current_incorrect'
  | 'not_password_account'
  | 'unavailable';

export const passwordFormMessages: Record<PasswordFormError, string> = {
  ...passwordRuleMessages,
  invalid_email: 'Enter a valid email address.',
  mismatch: 'The two passwords are not the same.',
  email_in_use: new AuthError('email_in_use').message,
  credentials: 'Email or password is incorrect.',
  forbidden: 'This account cannot sign in.',
  current_incorrect: 'The current password is incorrect.',
  not_password_account: 'Only accounts that use email and password can change a password here.',
  unavailable: 'This request could not be completed. Try again later.',
};

export type PasswordFormField = 'email' | 'password' | 'confirm' | 'current';

export function errorField(code: PasswordFormError): PasswordFormField | null {
  switch (code) {
    case 'invalid_email':
    case 'email_in_use':
      return 'email';
    case 'too_short':
    case 'too_long':
    case 'common':
    case 'matches_email':
    case 'credentials':
      return 'password';
    case 'mismatch':
      return 'confirm';
    case 'current_incorrect':
      return 'current';
    default:
      return null;
  }
}

export function formError(value: unknown): PasswordFormError | null {
  return typeof value === 'string' && Object.hasOwn(passwordFormMessages, value)
    ? (value as PasswordFormError)
    : null;
}
