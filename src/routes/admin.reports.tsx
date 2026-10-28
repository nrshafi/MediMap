import { createFileRoute } from '@tanstack/react-router';
import { inspectReports } from '../features/corrections/review.functions';
import { ReviewManager } from '../features/corrections/ReviewManager';
export const Route = createFileRoute('/admin/reports')({
  head: () => ({
    meta: [{ title: 'Correction reports | MediMap' }, { name: 'robots', content: 'noindex' }],
  }),
  validateSearch: (input: Record<string, unknown>): Record<string, string | undefined> => {
    const search: Record<string, string | undefined> = {};
    for (const key of ['status', 'report', 'after', 'sourceAfter', 'source', 'limit', 'code'])
      if (input[key] !== undefined && input[key] !== '') search[key] = String(input[key]);
    return search;
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => inspectReports({ data: deps }),
  component: ReviewRoute,
});
function ReviewRoute() {
  return <ReviewManager result={Route.useLoaderData()} search={Route.useSearch()} />;
}
