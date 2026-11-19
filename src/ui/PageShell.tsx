import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { SiteFooter, SiteHeader } from './SiteChrome';

export function FindNavLink() {
  return (
    <a
      href="/find"
      className="hidden min-h-touch items-center gap-2 rounded-sm px-3 hover:bg-white/10 sm:inline-flex"
    >
      <Search aria-hidden size={18} />
      Find services
    </a>
  );
}

export function PageShell({ children, maps = false }: { children: ReactNode; maps?: boolean }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      {children}
      <SiteFooter maps={maps} />
    </div>
  );
}
