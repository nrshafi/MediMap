import { AuthError, safeReturnTo } from '../contracts';
import { parseEmail, signInPasswordMaxLength, type PasswordFormError } from '../passwordForm';
import { checkPassword, normalizePassword } from '../passwordRules';
import { AuthStore } from './store.server';
import { requireSameOriginPost, sessionSeconds } from './config.server';
import { authCookie, readAuthCookie } from './cookies.server';
import { requireUser } from './access.server';
import { hashPassword, verifyPassword } from './password.server';
import { redirect } from './http.server';

// A fixed stored hash of a random password that nobody knows. Sign-in verifies against it when the email
// is unknown or the account has no password, so every sign-in request runs exactly one hash.
// If passwordIterations changes, make a new value. A unit test checks that the iteration count matches.
export const dummyPasswordHash =
  'pbkdf2-sha256$100000$yxRro9WM_dqPPhEzcaJAQA$DSVTSA4UFl7kv62x-YllMBMVtfkP3362cx8zDJc1J4s';

function rejected(): Response {
  return new Response('This account request could not be accepted.', {
    status: 403,
    headers: { 'Cache-Control': 'no-store' },
  });
}

// Redirects carry an error code and the safe return path. They never carry a password, a hash or an email.
function failure(page: string, code: PasswordFormError, returnTo?: string): Response {
  const query = new URLSearchParams({ error: code });
  if (returnTo && returnTo !== '/account') query.set('returnTo', returnTo);
  return redirect(`${page}?${query.toString()}`);
}

function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === 'string' ? value : null;
}

// Returns the code of the first password problem, or null. The confirmation is checked when the form sends it.
function passwordProblem(
  password: string | null,
  confirmation: string | null,
  email: string,
): { code: PasswordFormError | null; normalized: string } {
  const check = checkPassword(password ?? '', email);
  const first = check.failures[0];
  if (first) return { code: first.code, normalized: check.normalized };
  if (confirmation !== null && normalizePassword(confirmation) !== check.normalized)
    return { code: 'mismatch', normalized: check.normalized };
  return { code: null, normalized: check.normalized };
}

export async function passwordSignUp(
  request: Request,
  environment: object,
  db: D1Database,
): Promise<Response> {
  let returnTo = '/account';
  try {
    requireSameOriginPost(request, environment);
    const form = await request.formData();
    returnTo = safeReturnTo(form.get('returnTo'));
    const email = parseEmail(form.get('email'));
    if (!email) return failure('/sign-up', 'invalid_email', returnTo);
    const problem = passwordProblem(
      field(form, 'password'),
      field(form, 'confirmPassword'),
      email.email,
    );
    if (problem.code) return failure('/sign-up', problem.code, returnTo);
    const session = await new AuthStore(db).createPasswordAccount(
      email,
      await hashPassword(problem.normalized),
      readAuthCookie(request, 'session'),
    );
    return redirect(returnTo, [authCookie(request, 'session', session.token, sessionSeconds)]);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'invalid_request') return rejected();
    if (error instanceof AuthError && error.code === 'email_in_use')
      return failure('/sign-up', 'email_in_use', returnTo);
    return failure('/sign-up', 'unavailable', returnTo);
  }
}

export async function passwordSignIn(
  request: Request,
  environment: object,
  db: D1Database,
): Promise<Response> {
  let returnTo = '/account';
  try {
    requireSameOriginPost(request, environment);
    const form = await request.formData();
    returnTo = safeReturnTo(form.get('returnTo'));
    const email = parseEmail(form.get('email'));
    const password = field(form, 'password');
    if (!email || !password || password.length > signInPasswordMaxLength)
      return failure('/sign-in', 'credentials', returnTo);
    const store = new AuthStore(db);
    const record = await store.passwordCredential(email.normalized);
    const matches = await verifyPassword(password, record?.hash ?? dummyPasswordHash);
    if (!record?.hash || !matches) return failure('/sign-in', 'credentials', returnTo);
    // The account state is shown only after the password is right.
    if (!record.active) return failure('/sign-in', 'forbidden', returnTo);
    const session = await store.startPasswordSession(
      record.accountId,
      readAuthCookie(request, 'session'),
    );
    return redirect(returnTo, [authCookie(request, 'session', session.token, sessionSeconds)]);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'invalid_request') return rejected();
    if (error instanceof AuthError && error.code === 'forbidden')
      return failure('/sign-in', 'forbidden', returnTo);
    return failure('/sign-in', 'unavailable', returnTo);
  }
}

export async function passwordChange(
  request: Request,
  environment: object,
  db: D1Database,
): Promise<Response> {
  try {
    requireSameOriginPost(request, environment);
    const session = await requireUser(request, db);
    const token = readAuthCookie(request, 'session');
    const form = await request.formData();
    const store = new AuthStore(db);
    const stored = await store.passwordHashOf(session.user.id);
    if (stored === null) return failure('/account', 'not_password_account');
    const current = field(form, 'currentPassword');
    if (
      !current ||
      current.length > signInPasswordMaxLength ||
      !(await verifyPassword(current, stored))
    )
      return failure('/account', 'current_incorrect');
    const problem = passwordProblem(
      field(form, 'newPassword'),
      field(form, 'confirmNewPassword'),
      session.user.email,
    );
    if (problem.code) return failure('/account', problem.code);
    if (
      !token ||
      !(await store.changePassword(
        session.user.id,
        stored,
        await hashPassword(problem.normalized),
        token,
      ))
    )
      return failure('/account', 'unavailable');
    return redirect('/account?changed=1');
  } catch (error) {
    if (error instanceof AuthError && error.code === 'invalid_request') return rejected();
    if (
      error instanceof AuthError &&
      (error.code === 'unauthenticated' || error.code === 'expired')
    )
      return redirect(`/sign-in?reason=${error.code === 'expired' ? 'expired' : 'required'}`);
    return failure('/account', 'unavailable');
  }
}

export function methodNotAllowed(message: string): Response {
  return new Response(message, {
    status: 405,
    headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
  });
}
