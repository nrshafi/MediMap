import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { requireAdministrator } from '../authentication/server/access.server';
import { record } from '../catalog/contracts';
import { accountCursor, accountSearch, listAccounts } from './server/accounts.server';

export const readAccounts = createServerFn({ method: 'GET' })
  .validator((value: unknown) => {
    const input = record(value);
    return {
      query: accountSearch(input.query),
      after: input.after === undefined ? '' : String(input.after),
    };
  })
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const session = await requireAdministrator(getRequest(), env.DB);
    accountCursor(data.after);
    return { ...(await listAccounts(env.DB, data)), currentAccountId: session.user.id };
  });
