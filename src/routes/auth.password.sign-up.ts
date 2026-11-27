import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import {
  methodNotAllowed,
  passwordSignUp,
} from '../features/authentication/server/passwordHttp.server';

export const Route = createFileRoute('/auth/password/sign-up')({
  server: {
    handlers: {
      POST: ({ request }) => passwordSignUp(request, env, env.DB),
      GET: () => methodNotAllowed('Use POST to sign up.'),
    },
  },
});
