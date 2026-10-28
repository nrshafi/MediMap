import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { readManagement } from './operations.server';

export const inspectManagement = createServerFn({ method: 'GET' })
  .validator((input: unknown) => input)
  .handler(({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    return readManagement(getRequest(), env.DB, data);
  });
