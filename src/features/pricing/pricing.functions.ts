import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { readPricing } from './operations.server';
export const inspectPricing = createServerFn({ method: 'GET' })
  .validator((input: unknown) => input)
  .handler(({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    return readPricing(getRequest(), env.DB, data);
  });
