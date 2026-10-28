import { createFileRoute } from '@tanstack/react-router';
import { inspectPricing } from '../features/pricing/pricing.functions';
import { PricingManager } from '../features/administration/PricingManager';
export const Route = createFileRoute('/admin/prices')({
  head: () => ({
    meta: [
      { title: 'Branch prices and sources | MediMap' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  validateSearch: (input: Record<string, unknown>): Record<string, string | undefined> => {
    const search: Record<string, string | undefined> = {};
    for (const key of [
      'provider',
      'listing',
      'providerAfter',
      'branchAfter',
      'serviceAfter',
      'sourceAfter',
      'historyAfter',
      'after',
      'code',
    ])
      if (input[key] !== undefined && input[key] !== '') search[key] = String(input[key]);
    return search;
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => inspectPricing({ data: deps }),
  component: PricesRoute,
});
function PricesRoute() {
  return <PricingManager result={Route.useLoaderData()} search={Route.useSearch()} />;
}
