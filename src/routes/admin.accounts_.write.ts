import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { writeAccountStatus } from '../features/administration/server/accounts.server';

export const Route = createFileRoute('/admin/accounts_/write')({
  server: {
    handlers: {
      POST: ({ request }) => writeAccountStatus(request, env, env.DB),
      GET: () =>
        new Response('Use POST to change an account.', {
          status: 405,
          headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
        }),
    },
  },
});
