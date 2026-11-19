import type { ReactNode } from 'react';
import { MapPin, UserRound } from 'lucide-react';

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex min-h-header items-center justify-between gap-4 bg-ink px-4 text-on-ink">
      <a
        href="/"
        className="inline-flex min-h-touch items-center gap-2 font-display text-h3 font-bold"
      >
        <MapPin aria-hidden size={20} />
        MediMap
      </a>
      <nav aria-label="Site" className="flex items-center gap-1 text-small font-semibold">
        {children}
        <a
          href="/account"
          className="inline-flex min-h-touch items-center gap-2 rounded-sm px-3 hover:bg-white/10"
        >
          <UserRound aria-hidden size={18} />
          Your account
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter({ maps = false }: { maps?: boolean }) {
  return (
    <footer className="border-t border-border bg-surface px-4 py-4 text-small text-muted">
      <p>
        MediMap lists published diagnostic prices for Dhaka. It is not an emergency service. Contact
        the hospital before you visit.
      </p>
      {maps && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <span>Maps, address search and driving estimates use Google Maps.</span>
          <a
            className="text-primary hover:underline"
            href="https://maps.google.com/help/terms_maps/"
          >
            Google Maps End User Additional Terms
          </a>
          <a className="text-primary hover:underline" href="https://policies.google.com/privacy">
            Google Privacy Policy
          </a>
        </p>
      )}
    </footer>
  );
}
