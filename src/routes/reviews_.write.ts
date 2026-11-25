import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { requireUser } from '../features/authentication/server/access.server';
import { requireSameOriginPost } from '../features/authentication/server/config.server';
import { readAdministrationForm } from '../features/administration/server/form.server';
import { catalogId } from '../features/catalog/contracts';
import { ReviewRepository } from '../features/reviews/repository.server';
import { reviewInput } from '../features/reviews/contracts';

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

export const Route = createFileRoute('/reviews_/write')({
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
          const account = await requireUser(request, env.DB);
          const parsed = reviewInput(input);
          await new ReviewRepository(env.DB).save(account.user.id, input);
          return redirectReviews(parsed.listing, 'result=saved');
        } catch {
          return redirectReviews(listing, 'error=write_failed');
        }
      },
      GET: () => new Response('Use POST', { status: 405, headers: { Allow: 'POST' } }),
    },
  },
});
