import { createFileRoute } from '@tanstack/react-router';
import { publicDetail } from '../features/public/details.functions';
import { DEFAULT_CENTER, parseCoordinate, parseRadius } from '../features/public/defaults';
import { DetailPage } from '../features/public/DetailPage';
export const Route = createFileRoute('/services/$id')({
  validateSearch: (s: Record<string, unknown>) => ({
    lat: parseCoordinate(s.lat, 90, DEFAULT_CENTER.latitude),
    lng: parseCoordinate(s.lng, 180, DEFAULT_CENTER.longitude),
    radius: parseRadius(s.radius),
  }),
  loader: ({ params }) => publicDetail({ data: { kind: 'service', id: params.id } }),
  component: () => <DetailPage data={Route.useLoaderData()} area={Route.useSearch()} />,
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.entity?.name ?? 'Service not found'} | MediMap` }],
  }),
});
