import { AuthError, safeReturnTo } from '../contracts';
import { AuthStore } from './store.server';
import { authSettings, requireSameOriginPost } from './config.server';
import { authCookie, readAuthCookie } from './cookies.server';
import { GoogleSignIn, type OAuthFetch } from './google.server';

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({
    Location: location,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
  });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 303, headers });
}

export async function startGoogle(
  request: Request,
  environment: object,
  db: D1Database,
  fetcher?: OAuthFetch,
): Promise<Response> {
  try {
    requireSameOriginPost(request, environment);
    const settings = authSettings(environment, request);
    const form = await request.formData();
    const returnTo = safeReturnTo(form.get('returnTo'));
    const { token, attempt } = await new AuthStore(db).createAttempt(returnTo);
    const destination = await new GoogleSignIn(settings, fetcher).authorizationUrl(attempt);
    return redirect(destination, [authCookie(request, 'oauth', token, 600)]);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'invalid_request') {
      return new Response('This account request could not be accepted.', {
        status: 403,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    return redirect('/sign-in?reason=unavailable');
  }
}

export async function finishGoogle(
  request: Request,
  environment: object,
  db: D1Database,
  fetcher?: OAuthFetch,
): Promise<Response> {
  const clear = authCookie(request, 'oauth', '', 0);
  try {
    const settings = authSettings(environment, request);
    const attempt = await new AuthStore(db).consumeAttempt(readAuthCookie(request, 'oauth'));
    if (!attempt) throw new AuthError('invalid_request');
    const identity = await new GoogleSignIn(settings, fetcher).identity(
      new URL(request.url),
      attempt,
    );
    const session = await new AuthStore(db).signIn(identity, readAuthCookie(request, 'session'));
    return redirect(safeReturnTo(attempt.returnTo), [
      clear,
      authCookie(request, 'session', session.token, settings.sessionSeconds),
    ]);
  } catch {
    // Provider responses can contain credentials and personal data. Return a fixed public failure.
    return redirect('/sign-in?reason=failed', [clear]);
  }
}

export async function signOut(
  request: Request,
  environment: object,
  db: D1Database,
): Promise<Response> {
  try {
    requireSameOriginPost(request, environment);
    await new AuthStore(db).signOut(readAuthCookie(request, 'session'));
    return redirect('/sign-in?reason=signed-out', [
      authCookie(request, 'session', '', 0),
      authCookie(request, 'oauth', '', 0),
    ]);
  } catch (error) {
    return new Response(
      error instanceof AuthError && error.code === 'invalid_request'
        ? 'This account request could not be accepted.'
        : 'Sign-out is unavailable. Try again.',
      {
        status: error instanceof AuthError && error.code === 'invalid_request' ? 403 : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
