import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { MapPin, Menu, Scale, Search, UserRound, X } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: typeof Search;
  matches: (pathname: string) => boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Find services',
    href: '/find',
    icon: Search,
    matches: (pathname) => pathname === '/find' || pathname.startsWith('/find/'),
  },
  {
    label: 'Compare',
    href: '/compare',
    icon: Scale,
    matches: (pathname) => pathname === '/compare' || pathname.startsWith('/compare/'),
  },
  {
    label: 'Account',
    href: '/account',
    icon: UserRound,
    matches: (pathname) =>
      pathname === '/account' ||
      pathname.startsWith('/account/') ||
      pathname === '/sign-in' ||
      pathname.startsWith('/sign-in/'),
  },
];

export function useCurrentPath(explicitPath?: string): string {
  const router = useRouter({ warn: false });
  if (explicitPath) return explicitPath;
  if (router?.state?.location?.pathname) {
    return router.state.location.pathname;
  }
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return '';
}

export interface SiteHeaderProps {
  currentPath?: string;
}

export function SiteHeader({ currentPath: explicitPath }: SiteHeaderProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentPath = useCurrentPath(explicitPath);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleResize() {
      if (window.innerWidth >= 640) {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  return (
    <header className="relative flex min-h-header items-center justify-between gap-4 bg-ink px-4 text-on-ink">
      <a
        href="/"
        className="inline-flex min-h-touch items-center gap-2 font-display text-h3 font-bold text-on-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <MapPin aria-hidden="true" size={20} className="shrink-0 text-primary-soft" />
        MediMap
      </a>

      {/* Desktop main links */}
      <nav
        aria-label="Site"
        className="hidden sm:flex sm:items-center sm:gap-1 text-small font-semibold"
      >
        {MAIN_NAV_ITEMS.map((item) => {
          const isActive = item.matches(currentPath);
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex min-h-touch items-center gap-2 rounded-sm px-3 py-2 transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none ${
                isActive
                  ? 'bg-white/15 text-on-ink font-bold'
                  : 'text-on-ink/90 hover:bg-white/10 hover:text-on-ink'
              }`}
            >
              <Icon aria-hidden="true" size={18} />
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Mobile menu button */}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-panel"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm p-2 text-on-ink hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:hidden transition-colors duration-fast motion-reduce:transition-none"
      >
        {isOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
      </button>

      {/* Mobile navigation panel */}
      {isOpen && (
        <div
          id="mobile-navigation-panel"
          role="region"
          aria-label="Mobile navigation"
          className="absolute left-0 right-0 top-full z-50 flex flex-col border-b border-border bg-ink p-4 shadow-overlay sm:hidden"
        >
          <nav aria-label="Mobile navigation links" className="flex flex-col gap-2">
            {MAIN_NAV_ITEMS.map((item) => {
              const isActive = item.matches(currentPath);
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsOpen(false)}
                  className={`inline-flex min-h-touch items-center gap-2 rounded-sm px-3 py-2 text-small font-semibold transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none ${
                    isActive
                      ? 'bg-white/15 text-on-ink font-bold'
                      : 'text-on-ink/90 hover:bg-white/10 hover:text-on-ink'
                  }`}
                >
                  <Icon aria-hidden="true" size={18} />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface px-4 py-4 text-small text-muted">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>MediMap is not for emergencies and does not give medical advice.</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a
            className="text-primary hover:underline transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
            href="https://maps.google.com/help/terms_maps/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Maps End User Additional Terms
          </a>
          <a
            className="text-primary hover:underline transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Privacy Policy
          </a>
        </p>
      </div>
    </footer>
  );
}
