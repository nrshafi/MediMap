import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { requireUser } from '../features/authentication/server/access.server';
import { requireSameOriginPost } from '../features/authentication/server/config.server';
import { readAdministrationForm } from '../features/administration/server/form.server';
import { ReviewRepository } from '../features/reviews/repository.server';
import { reviewInput } from '../features/reviews/contracts';
export const Route = createFileRoute('/reviews_/write')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          requireSameOriginPost(request, env);
          const account = await requireUser(request, env.DB);
          const input = await readAdministrationForm(request);
          const parsed = reviewInput(input);
          await new ReviewRepository(env.DB).save(account.user.id, input);
          return new Response(null, {
            status: 303,
            headers: {
              Location: `/reviews?listing=${parsed.listing}`,
              'Cache-Control': 'no-store',
            },
          });
        } catch {
          return new Response(
            'Review was not saved. Check sign-in, ratings, submission limits, and whether the review changed. Return to the review page and reload before trying again.',
            {
              status: 400,
              headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
            },
          );
        }
      },
      GET: () => new Response('Use POST', { status: 405, headers: { Allow: 'POST' } }),
    },
  },
});
