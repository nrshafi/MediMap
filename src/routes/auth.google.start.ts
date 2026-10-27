import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { startGoogle } from '../features/authentication/server/http.server';

export const Route = createFileRoute('/auth/google/start')({
  server: {
    handlers: {
      POST: ({ request }) => startGoogle(request, env, env.DB),
      GET: () =>
        new Response('Use POST to start sign-in.', {
          status: 405,
          headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
        }),
    },
  },
});
