import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  server: {
    port: 3000,
    watch: { ignored: ['**/.wrangler/**', '**/.bun-tmp/**', '**/.bun-cache/**'] },
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      inspectorPort: false,
      ...(process.env.MEDIMAP_D1_STATE
        ? { persistState: { path: process.env.MEDIMAP_D1_STATE } }
        : {}),
    }),
    tanstackStart(),
    react(),
  ],
});
