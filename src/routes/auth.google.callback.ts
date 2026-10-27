import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { finishGoogle } from '../features/authentication/server/http.server';

export const Route = createFileRoute('/auth/google/callback')({
  server: { handlers: { GET: ({ request }) => finishGoogle(request, env, env.DB) } },
});
