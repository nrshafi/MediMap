import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { readProviders } from './operations.server';

export const inspectProviders = createServerFn({ method: 'GET' })
  .validator((input: unknown) => input)
  .handler(({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    return readProviders(getRequest(), env.DB, data);
  });
