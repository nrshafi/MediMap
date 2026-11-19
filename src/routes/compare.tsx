import { createFileRoute } from '@tanstack/react-router';
import { readComparison } from '../features/public/comparison.functions';
import { ComparisonPage } from '../features/public/ComparisonPage';
import { PageShell } from '../ui/PageShell';
import { EmptyState } from '../ui/EmptyState';
import { ButtonLink } from '../ui/Button';

export const Route = createFileRoute('/compare')({
  validateSearch: (s: Record<string, unknown>) => ({ ids: typeof s.ids === 'string' ? s.ids : '' }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => readComparison({ data: { ids: deps.ids.split(',') } }),
  component: () => <ComparisonPage items={Route.useLoaderData()} />,
  head: () => ({ meta: [{ title: 'Compare diagnostic branches | MediMap' }] }),
  errorComponent: () => (
    <PageShell>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        <EmptyState
          title="Comparison unavailable"
          description="Choose two to four active listings for the same diagnostic service."
          action={
            <ButtonLink href="/find" variant="primary">
              Choose services
            </ButtonLink>
          }
        />
      </main>
    </PageShell>
  ),
});
