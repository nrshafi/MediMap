import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import {
  methodNotAllowed,
  passwordSignIn,
} from '../features/authentication/server/passwordHttp.server';

export const Route = createFileRoute('/auth/password/sign-in')({
  server: {
    handlers: {
      POST: ({ request }) => passwordSignIn(request, env, env.DB),
      GET: () => methodNotAllowed('Use POST to sign in.'),
    },
  },
});
