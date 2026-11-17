import { createFileRoute } from '@tanstack/react-router';
import { readComparison } from '../features/public/comparison.functions';
import { ComparisonPage } from '../features/public/ComparisonPage';
import { PageShell } from '../ui/PageShell';
import { ui } from '../ui/styles';
export const Route = createFileRoute('/compare')({
  validateSearch: (s: Record<string, unknown>) => ({ ids: typeof s.ids === 'string' ? s.ids : '' }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => readComparison({ data: { ids: deps.ids.split(',') } }),
  component: () => <ComparisonPage items={Route.useLoaderData()} />,
  head: () => ({ meta: [{ title: 'Compare diagnostic branches | MediMap' }] }),
  errorComponent: () => (
    <PageShell>
      <main className={`${ui.page} flex flex-col gap-3`}>
        <h1 className={ui.heading1}>Comparison unavailable</h1>
        <p className={ui.muted}>
          Choose two to four active listings for the same diagnostic service.
        </p>
        <a className={`${ui.buttonPrimary} self-start`} href="/find">
          Choose services
        </a>
      </main>
    </PageShell>
  ),
});
