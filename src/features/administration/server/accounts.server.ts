import { requireAdministrator } from '../../authentication/server/access.server';
import { requireSameOriginPost } from '../../authentication/server/config.server';
import { readAdministrationForm } from './form.server';
import { normalizeEmail } from '../../authentication/passwordForm';

export const accountPageSize = 20;
const maximumSearchLength = 100;

export type AccountRow = {
  id: string;
  email: string;
  methods: ('Google' | 'Email and password')[];
  isAdministrator: boolean;
  active: boolean;
  createdAt: number;
  lastSignedInAt: number;
};

export type AccountPage = { accounts: AccountRow[]; next: string | null };

export class InvalidAccountRequest extends Error {}

// A cursor holds the creation time and the id of the last row of the page.
const cursorPattern = /^(\d{1,16})\.([A-Za-z0-9_-]{1,64})$/;
const identifierPattern = /^[A-Za-z0-9_-]{1,64}$/;

export function accountSearch(value: unknown): string {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || value.length > maximumSearchLength)
    throw new InvalidAccountRequest();
  return normalizeEmail(value);
}

export function accountCursor(value: unknown): { createdAt: number; id: string } | null {
  if (value === undefined || value === '') return null;
  const match = typeof value === 'string' ? cursorPattern.exec(value) : null;
  if (!match) throw new InvalidAccountRequest();
  return { createdAt: Number(match[1]), id: match[2] };
}

// The list never selects password hashes, Google subjects or session tokens.
export async function listAccounts(
  db: D1Database,
  input: { query?: unknown; after?: unknown },
): Promise<AccountPage> {
  const query = accountSearch(input.query);
  const cursor = accountCursor(input.after);
  const escaped = query.replace(/[!%_]/g, (match) => `!${match}`);
  const rows = (
    await db
      .prepare(
        `SELECT a.id, a.email, a.active, a.created_at, a.last_signed_in_at,
        a.google_subject IS NOT NULL AS has_google,
        EXISTS(SELECT 1 FROM password_credentials c WHERE c.account_id = a.id) AS has_password,
        EXISTS(SELECT 1 FROM administrator_grants g WHERE g.account_id = a.id) AS administrator
        FROM accounts a
        WHERE (?1 = '' OR a.email_normalized LIKE '%' || ?1 || '%' ESCAPE '!')
        AND (?2 IS NULL OR a.created_at < ?2 OR (a.created_at = ?2 AND a.id < ?3))
        ORDER BY a.created_at DESC, a.id DESC LIMIT ?4`,
      )
      .bind(escaped, cursor?.createdAt ?? null, cursor?.id ?? '', accountPageSize + 1)
      .all<{
        id: string;
        email: string;
        active: number;
        created_at: number;
        last_signed_in_at: number;
        has_google: number;
        has_password: number;
        administrator: number;
      }>()
  ).results;
  const page = rows.slice(0, accountPageSize);
  const last = page.at(-1);
  return {
    accounts: page.map((row) => ({
      id: row.id,
      email: row.email,
      methods: [
        ...(row.has_google ? (['Google'] as const) : []),
        ...(row.has_password ? (['Email and password'] as const) : []),
      ],
      isAdministrator: row.administrator === 1,
      active: row.active === 1,
      createdAt: row.created_at,
      lastSignedInAt: row.last_signed_in_at,
    })),
    next: rows.length > accountPageSize && last ? `${last.created_at}.${last.id}` : null,
  };
}

export type AccountStatusChange = {
  account: string;
  action: 'disable' | 'enable';
  reason: string;
};

export function accountStatusChange(value: Record<string, string>): AccountStatusChange {
  const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
  if (
    !identifierPattern.test(value.account ?? '') ||
    (value.action !== 'disable' && value.action !== 'enable') ||
    value.confirm !== 'yes' ||
    reason.length < 20 ||
    reason.length > 1000
  )
    throw new InvalidAccountRequest();
  return { account: value.account, action: value.action, reason };
}

// One INSERT. Triggers in migration 0013 check the administrator, refuse a self-disable, refuse a change that
// does not match the current state, set accounts.active and delete the sessions of a disabled account.
// Any failed check rolls back the whole statement.
export async function changeAccountStatus(
  db: D1Database,
  actor: string,
  change: AccountStatusChange,
  now: number = Date.now(),
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO account_status_changes(id, account_id, actor_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(crypto.randomUUID(), change.account, actor, change.action, change.reason, now)
    .run();
}

function redirectBack(result: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: `/admin/accounts?result=${result}`, 'Cache-Control': 'no-store' },
  });
}

// Handles the POST of the disable and enable forms. A caller that is not a signed-in administrator on the
// same origin gets 400 and nothing changes. A refused change redirects back with a fixed result code.
export async function writeAccountStatus(
  request: Request,
  environment: object,
  db: D1Database,
): Promise<Response> {
  try {
    requireSameOriginPost(request, environment);
    const actor = await requireAdministrator(request, db);
    const change = accountStatusChange(await readAdministrationForm(request));
    try {
      await changeAccountStatus(db, actor.user.id, change);
    } catch (error) {
      const text = String(error);
      if (text.includes('own account')) return redirectBack('own_account');
      if (text.includes('stale account status')) return redirectBack('stale');
      return redirectBack('failed');
    }
    return redirectBack(change.action === 'disable' ? 'disabled' : 'enabled');
  } catch {
    return new Response(
      'The account change was not saved. Verify administrator access, the confirmation and the reason.',
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
