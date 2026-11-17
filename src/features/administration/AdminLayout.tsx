import type { ReactNode } from 'react';
import { SiteHeader } from '../../ui/SiteChrome';
import { coreAdministrationNavigation, type AdministrationNavItem } from './navigation';

export function AdminLayout({
  children,
  navigation = [],
  activeHref,
}: {
  children: ReactNode;
  navigation?: readonly AdministrationNavItem[];
  activeHref: string;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-8 lg:py-8">
        <nav aria-label="Administration" className="lg:w-60 lg:shrink-0">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {[...coreAdministrationNavigation, ...navigation].map((item) => (
              <li key={item.href} className="shrink-0">
                <a
                  href={item.href}
                  aria-current={activeHref === item.href ? 'page' : undefined}
                  className="flex min-h-touch items-center whitespace-nowrap rounded-sm px-3 text-sm font-semibold text-ink hover:bg-primary-soft aria-[current=page]:bg-primary aria-[current=page]:text-on-primary lg:whitespace-normal"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main-content" className="grid min-w-0 flex-1 content-start gap-5">
          {children}
        </main>
      </div>
      <footer className="border-t border-border bg-surface px-4 py-4 text-sm text-muted">
        Administrator workspace
      </footer>
    </div>
  );
}
