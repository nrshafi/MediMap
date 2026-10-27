export type AuthenticatedUser = { id: string; email: string; isAdministrator: boolean };
export type SessionState =
  | { status: 'anonymous' | 'expired' }
  | { status: 'authenticated'; user: AuthenticatedUser; expiresAt: number };

export class AuthError extends Error {
  constructor(
    readonly code: 'unauthenticated' | 'expired' | 'forbidden' | 'unavailable' | 'invalid_request',
  ) {
    const messages = {
      unauthenticated: 'Sign in to continue.',
      expired: 'Your session has expired. Sign in again.',
      forbidden: 'Administrator access is required.',
      unavailable: 'Sign-in is unavailable. Try again later.',
      invalid_request: 'This account request could not be accepted.',
    };
    super(messages[code]);
  }
}

export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    unsafePathCharacters(value)
  )
    return '/account';
  try {
    const url = new URL(value, 'https://medimap.invalid');
    if (
      url.origin !== 'https://medimap.invalid' ||
      url.pathname.startsWith('/auth/') ||
      url.pathname === '/sign-in'
    )
      return '/account';
    const decoded = decodeURIComponent(url.pathname);
    if (unsafePathCharacters(decoded) || decoded.startsWith('//')) return '/account';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/account';
  }
}

function unsafePathCharacters(value: string): boolean {
  return Array.from(value).some(
    (character) =>
      character === '\\' || character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
  );
}
