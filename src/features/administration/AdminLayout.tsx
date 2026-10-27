import type { ReactNode } from 'react';
import { coreAdministrationNavigation, type AdministrationNavItem } from './navigation';
import './administration.css';

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
    <div className="admin-page">
      <header className="admin-header">
        <a className="admin-brand" href="/">
          MediMap
        </a>
        <span>Catalog workspace</span>
      </header>
      <nav className="admin-nav" aria-label="Administration">
        {[...coreAdministrationNavigation, ...navigation].map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={activeHref === item.href ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <main id="main-content">{children}</main>
      <footer className="admin-footer">Public records · Read-only access</footer>
    </div>
  );
}
