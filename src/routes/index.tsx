import { createFileRoute } from '@tanstack/react-router';
import '../features/public/public.css';

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
    <main className="public-page">
      <nav>
        <strong>MediMap</strong>
        <a href="/account">Your account</a>
      </nav>
      <h1>
        Find the test.
        <br />
        Know the published price.
      </h1>
      <p>
        Find diagnostic services across Dhaka hospitals. Compare branch prices with their official
        sources and review dates.
      </p>
      <a href="/find">Search diagnostic services</a>
      <h2>Start with a familiar test</h2>
      <a href="/find?service=complete-blood-count">Complete Blood Count</a>
      <p>
        Coverage is partial. Unknown prices, opening hours, and branch coordinates remain explicit.
        Contact the hospital before visiting.
      </p>
      <a href="/sign-in">Sign in to review a service or report an issue</a>
    </main>
  ),
});
