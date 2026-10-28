import { readFile } from 'node:fs/promises';
import type { BrowserContext } from '@playwright/test';

export async function useBrowserSession(
  context: BrowserContext,
  role:
    | 'admin'
    | 'member'
    | 'expired'
    | 'report-desktop'
    | 'report-mobile'
    | 'report-nojs-desktop'
    | 'report-nojs-mobile'
    | 'report-limit-desktop'
    | 'report-limit-mobile'
    | 'review-desktop'
    | 'review-mobile'
    | 'review-nojs-desktop'
    | 'review-nojs-mobile'
    | 'signout-desktop'
    | 'signout-mobile'
    | 'signout-nojs-desktop'
    | 'signout-nojs-mobile',
) {
  const value: unknown = JSON.parse(await readFile('.bun-tmp/browser-sessions.json', 'utf8'));
  if (typeof value !== 'object' || value === null)
    throw new Error('Missing isolated browser session fixtures');
  const token: unknown = Reflect.get(value, role);
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new Error('Invalid browser session fixture');
  await context.addCookies([
    {
      name: 'medimap_session',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}
