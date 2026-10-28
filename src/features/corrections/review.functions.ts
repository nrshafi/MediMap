import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { readReview } from './review-operations.server';
export const inspectReports = createServerFn({ method: 'GET' })
  .validator((input: unknown) => input)
  .handler(({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    setResponseHeader('Referrer-Policy', 'same-origin');
    return readReview(getRequest(), env.DB, data);
  });
