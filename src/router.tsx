import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { NotFoundPage, ErrorPage } from './ui/PageShell';

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFoundPage,
    defaultErrorComponent: ErrorPage,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
