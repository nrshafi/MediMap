import { createFileRoute } from '@tanstack/react-router';
import { readComparison } from '../features/public/comparison.functions';
import { ComparisonPage } from '../features/public/ComparisonPage';
export const Route = createFileRoute('/compare')({
  validateSearch: (s: Record<string, unknown>) => ({ ids: typeof s.ids === 'string' ? s.ids : '' }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => readComparison({ data: { ids: deps.ids.split(',') } }),
  component: () => <ComparisonPage items={Route.useLoaderData()} />,
  head: () => ({ meta: [{ title: 'Compare diagnostic branches | MediMap' }] }),
  errorComponent: () => (
    <main className="public-page">
      <h1>Comparison unavailable</h1>
      <p>Choose two to four active listings for the same diagnostic service.</p>
      <a href="/find">Choose services</a>
    </main>
  ),
});
