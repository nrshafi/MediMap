import { AuthError } from '../contracts';

export type AuthSettings = {
  origin: string;
  clientId: string;
  clientSecret: string;
  sessionSeconds: number;
};

function setting(environment: object, key: string): string {
  const value: unknown = Reflect.get(environment, key);
  return typeof value === 'string' ? value.trim() : '';
}

export function appOrigin(environment: object, request: Request): string {
  const configured = setting(environment, 'AUTH_ORIGIN');
  const requested = new URL(request.url);
  const url = new URL(configured || requested.origin);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (!configured && !local) ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
    url.origin !== (configured || requested.origin) ||
    url.username ||
    url.password ||
    requested.origin !== url.origin
  ) {
    throw new AuthError('unavailable');
  }
  return url.origin;
}

export function authSettings(environment: object, request: Request): AuthSettings {
  const origin = appOrigin(environment, request);
  const clientId = setting(environment, 'GOOGLE_CLIENT_ID');
  const clientSecret = setting(environment, 'GOOGLE_CLIENT_SECRET');
  const sessionSeconds = 7 * 86400;
  if (!clientId.endsWith('.apps.googleusercontent.com') || !clientSecret) {
    throw new AuthError('unavailable');
  }
  return { origin, clientId, clientSecret, sessionSeconds };
}

export function requireSameOriginPost(request: Request, environment: object): void {
  const origin = appOrigin(environment, request);
  if (
    request.method !== 'POST' ||
    request.headers.get('origin') !== origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    throw new AuthError('invalid_request');
  }
}
