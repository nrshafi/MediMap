import { createFileRoute } from '@tanstack/react-router';
import { publicDetail } from '../features/public/details.functions';
import { DetailPage } from '../features/public/DetailPage';
export const Route = createFileRoute('/branches/$id')({
  loader: ({ params }) => publicDetail({ data: { kind: 'branch', id: params.id } }),
  component: () => <DetailPage data={Route.useLoaderData()} />,
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.entity?.name ?? 'Branch not found'} | MediMap` }],
  }),
});
