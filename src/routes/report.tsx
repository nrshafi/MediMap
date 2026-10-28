import { createFileRoute } from '@tanstack/react-router';
import { readReportPage } from '../features/corrections/reports.functions';
import { ReportView } from '../features/corrections/ReportView';
export const Route = createFileRoute('/report')({
  head: () => ({
    meta: [
      { title: 'Report incorrect information | MediMap' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  validateSearch: (input: Record<string, unknown>): Record<string, string | undefined> => {
    const search: Record<string, string | undefined> = {};
    for (const key of ['target', 'id', 'issue', 'submitted'])
      if (input[key] !== undefined && input[key] !== '') search[key] = String(input[key]);
    return search;
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => readReportPage({ data: deps }),
  component: ReportRoute,
});
function ReportRoute() {
  const search = Route.useSearch();
  return <ReportView data={Route.useLoaderData()} draft={{ issue: search.issue }} />;
}
