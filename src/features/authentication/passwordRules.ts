import { commonPasswords } from './commonPasswords';

export const passwordMinLength = 10;
export const passwordMaxLength = 128;

export type PasswordRuleCode = 'too_short' | 'too_long' | 'common' | 'matches_email';
export type PasswordStrength = 'weak' | 'fair' | 'strong';
export type PasswordFailure = { code: PasswordRuleCode; message: string };
export type PasswordCheck = {
  ok: boolean;
  // The NFC form. Hash this value, not the raw input.
  normalized: string;
  failures: PasswordFailure[];
  strength: PasswordStrength;
};

export const passwordRuleMessages: Record<PasswordRuleCode, string> = {
  too_short: `Use at least ${passwordMinLength} characters.`,
  too_long: `Use at most ${passwordMaxLength} characters.`,
  common: 'This password is too common. Choose a different one.',
  matches_email: 'The password must not be your email or the part of it before the @ sign.',
};

// Shown before the user types.
export const passwordRuleSummary = [
  `Use ${passwordMinLength} to ${passwordMaxLength} characters.`,
  'Do not use a common password.',
  'Do not use your email or the part of it before the @ sign.',
] as const;

export function normalizePassword(password: string): string {
  return password.normalize('NFC');
}

function strengthOf(password: string, failed: boolean): PasswordStrength {
  if (failed) return 'weak';
  const length = Array.from(password).length;
  const classes = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}]/u].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (length >= 16 || (length >= 12 && classes >= 3)) return 'strong';
  return 'fair';
}

export function checkPassword(password: string, email?: string): PasswordCheck {
  const normalized = normalizePassword(password);
  const length = Array.from(normalized).length;
  const failures: PasswordFailure[] = [];
  const add = (code: PasswordRuleCode) =>
    failures.push({ code, message: passwordRuleMessages[code] });
  if (length < passwordMinLength) add('too_short');
  if (length > passwordMaxLength) add('too_long');
  const lower = normalized.toLowerCase();
  if (commonPasswords.has(lower)) add('common');
  const address = email?.normalize('NFC').trim().toLowerCase();
  if (address) {
    const at = address.indexOf('@');
    const local = at > 0 ? address.slice(0, at) : '';
    if (lower === address || (local !== '' && lower === local)) add('matches_email');
  }
  return {
    ok: failures.length === 0,
    normalized,
    failures,
    strength: strengthOf(normalized, failures.length > 0),
  };
}
