import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { AuthStore } from './server/store.server';
import { readAuthCookie } from './server/cookies.server';
import { authSettings } from './server/config.server';
import { authFailure } from './server/access.server';

export const readAccount = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeader('Cache-Control', 'private, no-store');
  const request = getRequest();
  try {
    const session = await new AuthStore(env.DB).session(readAuthCookie(request, 'session'));
    let signInAvailable = true;
    try {
      authSettings(env, request);
    } catch {
      signInAvailable = false;
    }
    return { ok: true, session, signInAvailable } as const;
  } catch (error) {
    return authFailure(error);
  }
});
