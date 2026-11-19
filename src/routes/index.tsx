import { createFileRoute } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { PageShell } from '../ui/PageShell';
import { ui } from '../ui/styles';

const popular = [
  ['complete-blood-count', 'Complete Blood Count'],
  ['fasting-blood-sugar', 'Fasting Blood Sugar'],
  ['hba1c', 'HbA1c'],
  ['lipid-profile', 'Lipid Profile'],
] as const;

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'MediMap | Diagnostic services and branch prices' },
      {
        name: 'description',
        content:
          'Find diagnostic services in Dhaka, inspect published hospital prices and sources, and compare branches.',
      },
    ],
  }),
  component: () => (
    <PageShell>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-3">
          <h1 className="max-w-[16ch] font-display text-display">
            Find the test.
            <br />
            Know the published price.
          </h1>
          <p className="text-body text-muted">
            Compare diagnostic service prices across Dhaka hospital branches. Each price shows its
            official source and review date.
          </p>
        </div>
        <form
          action="/find"
          method="get"
          role="search"
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <label className={`${ui.label} flex-1`}>
            Service name or abbreviation
            <span className="relative">
              <Search
                aria-hidden
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                className={`${ui.input} pl-10`}
                name="q"
                maxLength={256}
                placeholder="For example, CBC or lipid profile"
                autoComplete="off"
              />
            </span>
          </label>
          <button className={ui.buttonPrimary}>Search services</button>
        </form>
        <section aria-label="Popular tests" className="flex flex-col gap-2">
          <h2 className={ui.heading2}>Popular tests</h2>
          <ul className="flex flex-wrap gap-2">
            {popular.map(([id, name]) => (
              <li key={id}>
                <a className={ui.chip} href={`/find?service=${id}`}>
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <p className={ui.notice}>
          Coverage is partial. Unknown prices, opening hours, and branch coordinates stay marked as
          unknown. Contact the hospital before you visit.
        </p>
        <p>
          <a className={`${ui.link} inline-flex min-h-touch items-center`} href="/sign-in">
            Sign in to review a service or report an issue
          </a>
        </p>
      </main>
    </PageShell>
  ),
});
