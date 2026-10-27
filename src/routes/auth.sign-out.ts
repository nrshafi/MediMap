import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { signOut } from '../features/authentication/server/http.server';

export const Route = createFileRoute('/auth/sign-out')({
  server: {
    handlers: {
      POST: ({ request }) => signOut(request, env, env.DB),
      GET: () =>
        new Response('Use POST to sign out.', {
          status: 405,
          headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
        }),
    },
  },
});
