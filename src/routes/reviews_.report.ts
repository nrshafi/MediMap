import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { requireUser } from '../features/authentication/server/access.server';
import { requireSameOriginPost } from '../features/authentication/server/config.server';
import { readAdministrationForm } from '../features/administration/server/form.server';
import { catalogId } from '../features/catalog/contracts';
import { reportReview } from '../features/reviews/moderation.server';

function redirectReviews(listing: string | null, query: string) {
  const params = new URLSearchParams();
  if (listing) params.set('listing', listing);
  const [key, value] = query.split('=');
  if (key && value) params.set(key, value);
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/reviews?${params.toString()}`,
      'Cache-Control': 'no-store',
    },
  });
}

export const Route = createFileRoute('/reviews_/report')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let listing: string | null = null;
        try {
          requireSameOriginPost(request, env);
          const input = await readAdministrationForm(request);
          try {
            listing = catalogId(input.listing);
          } catch {
            listing = null;
          }
          const actor = await requireUser(request, env.DB);
          await reportReview(env.DB, actor.user.id, input);
          return redirectReviews(listing, 'result=reported');
        } catch {
          return redirectReviews(listing, 'error=report_failed');
        }
      },
      GET: () => new Response('Use POST', { status: 405, headers: { Allow: 'POST' } }),
    },
  },
});
