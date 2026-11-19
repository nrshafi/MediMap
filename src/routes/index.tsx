import { createFileRoute } from '@tanstack/react-router';
import { readLandingData } from '../features/public/landing.functions';
import { LandingView } from '../features/landing/LandingView';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'MediMap | Diagnostic services and branch prices' },
      {
        name: 'description',
        content:
          'Find diagnostic services in Dhaka, inspect published hospital prices and sources, and compare branches.',
      },
    ],
  }),
  loader: () => readLandingData(),
  component: LandingRoute,
});

function LandingRoute() {
  const data = Route.useLoaderData();
  return <LandingView data={data} />;
}
