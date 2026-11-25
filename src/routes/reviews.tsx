import { createFileRoute } from '@tanstack/react-router';
import { parseReviewError, parseReviewResult } from '../features/reviews/contracts';
import { readReviews } from '../features/reviews/reviews.functions';
import { ReviewPage } from '../features/reviews/ReviewPage';

export const Route = createFileRoute('/reviews')({
  validateSearch: (s: Record<string, unknown>) => ({
    listing: typeof s.listing === 'string' ? s.listing : '',
    after: typeof s.after === 'string' ? s.after : undefined,
    result: parseReviewResult(s.result),
    error: parseReviewError(s.error),
  }),
  loaderDeps: ({ search }) => ({ listing: search.listing, after: search.after }),
  loader: ({ deps }) => readReviews({ data: deps }),
  component: ReviewsRoute,
  head: () => ({ meta: [{ title: 'Service reviews | MediMap' }] }),
});

function ReviewsRoute() {
  const search = Route.useSearch();
  return <ReviewPage data={Route.useLoaderData()} result={search.result} error={search.error} />;
}
