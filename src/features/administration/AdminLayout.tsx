import type { ReactNode } from 'react';
import { SiteHeader } from '../../ui/SiteChrome';
import { Link } from '../../ui/Link';
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
  const items = [...coreAdministrationNavigation, ...navigation];

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-8 lg:py-8">
        <nav aria-label="Administration" className="lg:w-60 lg:shrink-0">
          <ul className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {items.map((item) => {
              const isCurrent = activeHref === item.href;
              return (
                <li key={item.href} className="shrink-0 lg:shrink">
                  <Link
                    to={item.href}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`flex min-h-touch items-center whitespace-nowrap rounded-sm px-3 text-small font-semibold transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none lg:whitespace-normal ${
                      isCurrent
                        ? 'bg-primary text-on-primary font-bold'
                        : 'border border-border bg-surface text-ink hover:bg-primary-soft hover:text-primary-strong lg:border-transparent lg:bg-transparent'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main id="main-content" className="grid min-w-0 flex-1 content-start gap-5">
          {children}
        </main>
      </div>
      <footer className="border-t border-border bg-surface px-4 py-4 text-small text-muted">
        Administrator workspace
      </footer>
    </div>
  );
}
