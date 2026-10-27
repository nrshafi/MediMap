import { validToken } from './crypto.server';

export function cookieName(request: Request, kind: 'session' | 'oauth'): string {
  return `${new URL(request.url).protocol === 'https:' ? '__Host-' : ''}medimap_${kind}`;
}

export function readAuthCookie(request: Request, kind: 'session' | 'oauth'): string | null {
  const name = cookieName(request, kind);
  const matches = (request.headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(name.length + 1);
  return validToken(value) ? value : null;
}

export function authCookie(
  request: Request,
  kind: 'session' | 'oauth',
  token: string,
  maxAge: number,
): string {
  return `${cookieName(request, kind)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
