import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { requireAdministrator } from '../features/authentication/server/access.server';
import { requireSameOriginPost } from '../features/authentication/server/config.server';
import { readAdministrationForm } from '../features/administration/server/form.server';
import { moderateReview } from '../features/reviews/moderation.server';
export const Route = createFileRoute('/reviews_/moderate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          requireSameOriginPost(request, env);
          const actor = await requireAdministrator(request, env.DB);
          await moderateReview(env.DB, actor.user.id, await readAdministrationForm(request));
          return new Response(null, {
            status: 303,
            headers: { Location: '/admin/reviews', 'Cache-Control': 'no-store' },
          });
        } catch {
          return new Response(
            'Moderation was not saved. Verify administrator access, reason, and current revision.',
            { status: 400, headers: { 'Cache-Control': 'no-store' } },
          );
        }
      },
      GET: () => new Response('Use POST', { status: 405, headers: { Allow: 'POST' } }),
    },
  },
});
