import { createFileRoute } from '@tanstack/react-router';
import { publicDetail } from '../features/public/details.functions';
import { DetailPage } from '../features/public/DetailPage';
export const Route = createFileRoute('/services/$id')({
  loader: ({ params }) => publicDetail({ data: { kind: 'service', id: params.id } }),
  component: () => <DetailPage data={Route.useLoaderData()} />,
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.entity?.name ?? 'Service not found'} | MediMap` }],
  }),
});
