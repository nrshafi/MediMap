import { createFileRoute } from '@tanstack/react-router';
import { publicDetail } from '../features/public/details.functions';
import { DetailPage } from '../features/public/DetailPage';
export const Route = createFileRoute('/services/$id')({
  validateSearch: (s: Record<string, unknown>) => ({
    lat: Number.isFinite(Number(s.lat)) && Math.abs(Number(s.lat)) <= 90 ? Number(s.lat) : 23.8103,
    lng: Number.isFinite(Number(s.lng)) && Math.abs(Number(s.lng)) <= 180 ? Number(s.lng) : 90.4125,
    radius: Number(s.radius) >= 0.1 && Number(s.radius) <= 100 ? Number(s.radius) : 3,
  }),
  loader: ({ params }) => publicDetail({ data: { kind: 'service', id: params.id } }),
  component: () => <DetailPage data={Route.useLoaderData()} area={Route.useSearch()} />,
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.entity?.name ?? 'Service not found'} | MediMap` }],
  }),
});
