import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';

export const publicMapsConfig = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ browserKey: string | null }> => {
    const key: unknown = Reflect.get(env, 'GOOGLE_MAPS_BROWSER_KEY');
    return { browserKey: typeof key === 'string' && key.trim() ? key.trim() : null };
  },
);
