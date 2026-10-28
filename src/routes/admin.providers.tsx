import { createFileRoute } from '@tanstack/react-router';
import { inspectProviders } from '../features/providers/providers.functions';
import { ProviderManager } from '../features/administration/ProviderManager';

export const Route = createFileRoute('/admin/providers')({
  head: () => ({
    meta: [{ title: 'Providers and branches | MediMap' }, { name: 'robots', content: 'noindex' }],
  }),
  validateSearch: (input: Record<string, unknown>): Record<string, string | undefined> => {
    const search: Record<string, string | undefined> = {};
    for (const key of ['provider', 'branch', 'providerAfter', 'after', 'sourceAfter', 'code'])
      if (input[key] !== undefined && input[key] !== '') search[key] = String(input[key]);
    return search;
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => inspectProviders({ data: deps }),
  component: ProviderRoute,
});
function ProviderRoute() {
  return <ProviderManager result={Route.useLoaderData()} search={Route.useSearch()} />;
}
