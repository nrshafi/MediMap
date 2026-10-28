import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { reportPage } from './operations.server';
export const readReportPage = createServerFn({ method: 'GET' })
  .validator((input: unknown) => input)
  .handler(({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    setResponseHeader('Referrer-Policy', 'same-origin');
    return reportPage(getRequest(), env.DB, data);
  });
