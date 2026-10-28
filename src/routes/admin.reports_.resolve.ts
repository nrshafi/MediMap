import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { resolutionResponse } from '../features/corrections/review-http.server';
export const Route = createFileRoute('/admin/reports_/resolve')({
  server: {
    handlers: {
      POST: ({ request }) => resolutionResponse(request, env.DB, env),
      GET: () =>
        new Response('Use POST to resolve a report.', {
          status: 405,
          headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
        }),
    },
  },
});
