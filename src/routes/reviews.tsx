import { createFileRoute } from '@tanstack/react-router';
import { readReviews } from '../features/reviews/reviews.functions';
import { ReviewPage } from '../features/reviews/ReviewPage';
export const Route = createFileRoute('/reviews')({
  validateSearch: (s: Record<string, unknown>) => ({
    listing: typeof s.listing === 'string' ? s.listing : '',
    after: typeof s.after === 'string' ? s.after : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => readReviews({ data: deps }),
  component: () => <ReviewPage data={Route.useLoaderData()} />,
  head: () => ({ meta: [{ title: 'Service reviews | MediMap' }] }),
});
