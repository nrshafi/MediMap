import { createFileRoute } from '@tanstack/react-router';
import { publicDetail } from '../features/public/details.functions';
import { publicMapsConfig } from '../features/public/maps.functions';
import { DetailPage } from '../features/public/DetailPage';
export const Route = createFileRoute('/branches/$id')({
  loader: async ({ params }) => {
    const [detail, maps] = await Promise.all([
      publicDetail({ data: { kind: 'branch', id: params.id } }),
      publicMapsConfig(),
    ]);
    return { detail, browserKey: maps.browserKey };
  },
  component: () => {
    const { detail, browserKey } = Route.useLoaderData();
    return <DetailPage data={detail} browserKey={browserKey} />;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.detail.entity?.name ?? 'Branch not found'} | MediMap` }],
  }),
});
