// Selective imports avoid merging Worker HTMLRewriter types with browser DOM types.
type D1Database = import('@cloudflare/workers-types').D1Database;

declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
}
