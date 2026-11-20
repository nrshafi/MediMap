import type { HTMLAttributes, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { SiteFooter, SiteHeader } from './SiteChrome';
import { Link } from './Link';
import { ButtonLink } from './Button';

export function FindNavLink() {
  return (
    <Link
      to="/find"
      className="hidden min-h-touch items-center gap-2 rounded-sm px-3 hover:bg-white/10 sm:inline-flex"
    >
      <Search aria-hidden size={18} />
      Find services
    </Link>
  );
}

export interface PageMainProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  width?: 'default' | 'narrow';
  className?: string;
}

export function PageMain({ children, width = 'default', className = '', ...props }: PageMainProps) {
  const maxWidth = width === 'narrow' ? 'max-w-3xl' : 'max-w-5xl';
  return (
    <main
      className={`mx-auto flex w-full ${maxWidth} flex-1 flex-col gap-6 px-4 py-6 sm:px-6 ${className}`.trim()}
      {...props}
    >
      {children}
    </main>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

export function NotFoundPage() {
  return (
    <PageShell>
      <PageMain>
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <h1 className="font-display text-h1 font-bold text-ink">Page not found</h1>
          <p className="max-w-md text-body text-muted">
            The page you requested does not exist or has been moved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/" variant="primary">
              Return to home
            </ButtonLink>
            <ButtonLink href="/find" variant="secondary">
              Find diagnostic services
            </ButtonLink>
          </div>
        </div>
      </PageMain>
    </PageShell>
  );
}

export function ErrorPage() {
  return (
    <PageShell>
      <PageMain>
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <h1 className="font-display text-h1 font-bold text-ink">Something went wrong</h1>
          <p className="max-w-md text-body text-muted">
            An unexpected error occurred while loading this page. Please try again later.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/" variant="primary">
              Return to home
            </ButtonLink>
            <ButtonLink href="/find" variant="secondary">
              Find diagnostic services
            </ButtonLink>
          </div>
        </div>
      </PageMain>
    </PageShell>
  );
}
