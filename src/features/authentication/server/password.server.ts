// PBKDF2 with HMAC-SHA-256 through Web Crypto. No package is used.
// Iteration count: 100,000. See context/architecture.md "Password hashing" for the sources.
// Workers limit PBKDF2 to 100,000 iterations. OWASP recommends 600,000. The Workers limit is lower, so it applies.
const scheme = 'pbkdf2-sha256';
export const passwordIterations = 100_000;
const saltBytes = 16;
const keyBytes = 32;

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function decode(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    keyBytes * 8,
  );
  return new Uint8Array(bits);
}

function equalInConstantTime(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++)
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(saltBytes));
  const hash = await derive(password, salt, passwordIterations);
  return `${scheme}$${passwordIterations}$${encode(salt)}$${encode(hash)}`;
}

// Returns false for a wrong password or a malformed stored string. Never throws.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== scheme || !/^[1-9][0-9]{0,6}$/.test(parts[1] ?? ''))
      return false;
    const iterations = Number(parts[1]);
    const salt = decode(parts[2] ?? '');
    const expected = decode(parts[3] ?? '');
    if (!salt || !expected || salt.length !== saltBytes || expected.length !== keyBytes)
      return false;
    return equalInConstantTime(await derive(password, salt, iterations), expected);
  } catch {
    return false;
  }
}
