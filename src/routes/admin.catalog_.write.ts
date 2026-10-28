import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { writeManagement } from '../features/catalog/administration/operations.server';

export const Route = createFileRoute('/admin/catalog_/write')({
  server: {
    handlers: {
      POST: ({ request }) => writeManagement(request, env.DB, env),
      GET: () =>
        new Response('Use POST to change the catalog.', {
          status: 405,
          headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
        }),
    },
  },
});
