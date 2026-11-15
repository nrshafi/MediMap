import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { requireUser } from '../features/authentication/server/access.server';
import { requireSameOriginPost } from '../features/authentication/server/config.server';
import { readAdministrationForm } from '../features/administration/server/form.server';
import { reportReview } from '../features/reviews/moderation.server';
export const Route = createFileRoute('/reviews_/report')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          requireSameOriginPost(request, env);
          const actor = await requireUser(request, env.DB);
          await reportReview(env.DB, actor.user.id, await readAdministrationForm(request));
          return new Response('Review report saved for administrator review.', {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
          });
        } catch {
          return new Response(
            'Review report was not saved. Check sign-in, the reason, duplicates, and submission limits.',
            { status: 400, headers: { 'Cache-Control': 'no-store' } },
          );
        }
      },
      GET: () => new Response('Use POST', { status: 405, headers: { Allow: 'POST' } }),
    },
  },
});
