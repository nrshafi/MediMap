import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import {
  methodNotAllowed,
  passwordChange,
} from '../features/authentication/server/passwordHttp.server';

export const Route = createFileRoute('/auth/password/change')({
  server: {
    handlers: {
      POST: ({ request }) => passwordChange(request, env, env.DB),
      GET: () => methodNotAllowed('Use POST to change a password.'),
    },
  },
});
