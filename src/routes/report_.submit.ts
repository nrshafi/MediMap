import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { reportSubmissionResponse } from '../features/corrections/http.server';
export const Route = createFileRoute('/report_/submit')({
  server: {
    handlers: {
      POST: ({ request }) => reportSubmissionResponse(request, env.DB, env),
      GET: () =>
        new Response('Use POST to submit a report.', {
          status: 405,
          headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
        }),
    },
  },
});
