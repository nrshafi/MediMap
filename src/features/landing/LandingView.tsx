import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { LandingPageData } from '../public/landing.functions';
import { Badge } from '../../ui/Badge';
import { Button, ButtonLink } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Field, fieldControlStyles } from '../../ui/Field';
import { Notice } from '../../ui/Notice';
import { PageShell } from '../../ui/PageShell';
import { ui } from '../../ui/styles';

export interface LandingViewProps {
  data?: LandingPageData;
}

export function LandingView({ data }: LandingViewProps) {
  const popularServices = data?.popularServices ?? [];
  const hospitals = data?.hospitals ?? [];

  return (
    <PageShell>
      <main id="main-content" className="flex flex-1 flex-col">
        {/* Hero Section */}
        <section
          aria-labelledby="hero-heading"
          className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--color-primary-soft)_0%,_transparent_70%)] px-4 py-12 sm:px-6 sm:py-16"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 text-center sm:text-left">
            <div className="flex flex-col gap-3">
              <h1
                id="hero-heading"
                className="max-w-[16ch] font-display text-display font-bold text-ink"
              >
                Find the test.
                <br />
                Know the published price.
              </h1>
              <p className="max-w-xl text-body text-muted">
                Compare diagnostic service prices across Dhaka hospital branches. Each price shows
                its official source and review date.
              </p>
            </div>

            {/* Main Service Search Action */}
            <form
              action="/find"
              method="get"
              role="search"
              className="flex flex-col gap-3 rounded-md bg-surface p-4 shadow-card border border-border sm:flex-row sm:items-end"
            >
              <div className="flex-1 text-left">
                <Field id="service-search-input" label="Service name or abbreviation">
                  {(props) => (
                    <div className="relative">
                      <Search
                        aria-hidden="true"
                        size={18}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                      />
                      <input
                        {...props}
                        name="q"
                        maxLength={256}
                        placeholder="For example, CBC or lipid profile"
                        autoComplete="off"
                        className={`${fieldControlStyles} pl-10`}
                      />
                    </div>
                  )}
                </Field>
              </div>
              <Button type="submit" variant="primary" className="sm:self-end">
                Search services
              </Button>
            </form>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-8 sm:px-6 sm:py-12">
          {/* How It Works Section */}
          <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-6">
            <h2 id="how-it-works-heading" className={ui.heading2}>
              How it works
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card variant="default" className="flex flex-col gap-3 p-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary font-bold">
                  1
                </div>
                <h3 className="font-display text-h3 font-semibold text-ink">Search a test</h3>
                <p className="text-small text-muted">
                  Enter a test name, abbreviation, or alias to find matching canonical diagnostic
                  services.
                </p>
              </Card>

              <Card variant="default" className="flex flex-col gap-3 p-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary font-bold">
                  2
                </div>
                <h3 className="font-display text-h3 font-semibold text-ink">Choose your area</h3>
                <p className="text-small text-muted">
                  Select a street address, pick a Dhaka neighborhood preset, or set your radius
                  distance.
                </p>
              </Card>

              <Card variant="default" className="flex flex-col gap-3 p-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary font-bold">
                  3
                </div>
                <h3 className="font-display text-h3 font-semibold text-ink">
                  Compare verified prices
                </h3>
                <p className="text-small text-muted">
                  Inspect hospital branch base prices with published official sources and review
                  dates.
                </p>
              </Card>
            </div>
          </section>

          {/* Popular Services Section */}
          {popularServices.length > 0 && (
            <section aria-labelledby="popular-services-heading" className="flex flex-col gap-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h2 id="popular-services-heading" className={ui.heading2}>
                  Popular services
                </h2>
                <p className="text-small text-muted">
                  Services with active branch listings in Dhaka
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {popularServices.map((service) => (
                  <Card
                    key={service.id}
                    as="a"
                    href={`/find?service=${service.id}`}
                    aria-label={`Find ${service.name}`}
                    variant="default"
                    interactive
                    className="flex flex-col justify-between gap-4 p-4 text-left transition-all duration-fast hover:shadow-card hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none no-underline"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="neutral">{service.category}</Badge>
                        <span className="text-xs text-muted">
                          {service.listingCount}{' '}
                          {service.listingCount === 1 ? 'branch' : 'branches'}
                        </span>
                      </div>
                      <h3 className="font-display text-h3 font-semibold text-ink leading-snug">
                        {service.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-3 text-small font-semibold text-primary">
                      <span>Find service</span>
                      <ArrowRight aria-hidden="true" size={16} />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Why You Can Trust The Prices Section */}
          <section aria-labelledby="trust-heading" className="flex flex-col gap-6">
            <h2 id="trust-heading" className={ui.heading2}>
              Why you can trust the prices
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card variant="default" className="flex flex-col gap-3 p-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-verified-soft text-verified">
                  <FileText aria-hidden="true" size={20} />
                </div>
                <h3 className="font-display text-h3 font-semibold text-ink">
                  Official price sources
                </h3>
                <p className="text-small text-muted">
                  Each price shows its status (verified, unverified, or disputed), its official
                  source, and its review date.
                </p>
              </Card>

              <Card variant="default" className="flex flex-col gap-3 p-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-verified-soft text-verified">
                  <CheckCircle2 aria-hidden="true" size={20} />
                </div>
                <h3 className="font-display text-h3 font-semibold text-ink">
                  Recorded review dates
                </h3>
                <p className="text-small text-muted">
                  Each listing shows when an administrator verified the tariff row. Old prices keep
                  their real review date.
                </p>
              </Card>

              <Card variant="default" className="flex flex-col gap-3 p-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-verified-soft text-verified">
                  <ShieldCheck aria-hidden="true" size={20} />
                </div>
                <h3 className="font-display text-h3 font-semibold text-ink">
                  Community dispute reporting
                </h3>
                <p className="text-small text-muted">
                  If a hospital revises a price, users can report incorrect information. An
                  administrator reviews each report against the official source.
                </p>
                <div className="mt-auto pt-2">
                  <a
                    href="/report"
                    className="inline-flex min-h-touch items-center text-small font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Report incorrect data
                  </a>
                </div>
              </Card>
            </div>

            <Notice kind="info">
              Coverage is partial. Unknown prices, opening hours, and branch coordinates stay marked
              as unknown. Contact the hospital before your visit.
            </Notice>
          </section>

          {/* Hospitals Covered Section */}
          {hospitals.length > 0 && (
            <section aria-labelledby="hospitals-heading" className="flex flex-col gap-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h2 id="hospitals-heading" className={ui.heading2}>
                  Hospitals covered
                </h2>
                <p className="text-small text-muted">Hospitals with published prices in MediMap</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {hospitals.map((hospital) => (
                  <Card
                    key={hospital.id}
                    variant="default"
                    className="flex flex-col justify-between gap-3 p-5"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex size-9 items-center justify-center rounded-full bg-surface-sunken text-primary">
                        <Building2 aria-hidden="true" size={18} />
                      </div>
                      <h3 className="font-display text-h3 font-semibold text-ink leading-snug">
                        {hospital.name}
                      </h3>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-border pt-3">
                      <div>
                        <Badge tone="neutral">
                          {hospital.branchCount}{' '}
                          {hospital.branchCount === 1 ? 'branch' : 'branches'}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1">
                        {hospital.branches.map((branch) => (
                          <a
                            key={branch.id}
                            href={`/branches/${branch.id}`}
                            className="inline-flex min-h-touch items-center gap-1 text-small font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            {branch.name} <ArrowRight aria-hidden="true" size={16} />
                          </a>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Final Call to Action Section */}
          <section
            aria-label="Find diagnostic services"
            className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-surface p-8 text-center sm:p-12"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MapPin aria-hidden="true" size={24} />
            </div>
            <div className="flex max-w-lg flex-col gap-2">
              <h2 className={ui.heading2}>Ready to find diagnostic services?</h2>
              <p className="text-small text-muted">
                Search standard hospital prices, inspect official sources, and choose branches
                within your area in Dhaka.
              </p>
            </div>
            <div className="mt-2">
              <ButtonLink href="/find" variant="primary" size="default">
                Find services
              </ButtonLink>
            </div>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
