import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { writeProviders } from '../features/providers/operations.server';

export const Route = createFileRoute('/admin/providers_/write')({
  server: {
    handlers: {
      POST: ({ request }) => writeProviders(request, env.DB, env),
      GET: () =>
        new Response('Use POST to change providers or branches.', {
          status: 405,
          headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
        }),
    },
  },
});
