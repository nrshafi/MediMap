import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { requireAdministrator } from '../authentication/server/access.server';
import { record, catalogId } from '../catalog/contracts';
export const readModeration = createServerFn({ method: 'GET' })
  .validator((value: unknown) => {
    const input = record(value);
    return { after: input.after ? catalogId(input.after) : '' };
  })
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    await requireAdministrator(getRequest(), env.DB);
    const reviews = (
      await env.DB.prepare(
        'SELECT id,listing_id,body,scores,visibility,revision FROM service_reviews WHERE id>? ORDER BY id LIMIT 21',
      )
        .bind(data.after)
        .all<{
          id: string;
          listing_id: string;
          body: string;
          scores: string;
          visibility: string;
          revision: number;
        }>()
    ).results;
    return {
      reviews: reviews.slice(0, 20),
      next: reviews.length > 20 ? reviews[19].id : null,
      reports: (
        await env.DB.prepare(
          "SELECT id,review_id,reason,created_at FROM review_abuse_reports WHERE status='pending' ORDER BY created_at,id LIMIT 100",
        ).all<{ id: string; review_id: string; reason: string; created_at: number }>()
      ).results,
    };
  });
