import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { writePricing } from '../features/pricing/operations.server';
export const Route = createFileRoute('/admin/prices_/write')({
  server: {
    handlers: {
      POST: ({ request }) => writePricing(request, env.DB, env),
      GET: () =>
        new Response('Use POST to change prices or sources.', {
          status: 405,
          headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
        }),
    },
  },
});
