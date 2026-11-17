import { createFileRoute } from '@tanstack/react-router';
import { readModeration } from '../features/reviews/moderation.functions';
import { AdminLayout } from '../features/administration/AdminLayout';
import { admin, PageTitle, Section } from '../features/administration/adminUi';
import { SiteFooter, SiteHeader } from '../ui/SiteChrome';
import { statusBadge, ui } from '../ui/styles';

export const Route = createFileRoute('/admin/reviews')({
  validateSearch: (s: Record<string, unknown>) => ({
    after: typeof s.after === 'string' ? s.after : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => readModeration({ data: deps }),
  component: Page,
  errorComponent: () => (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 px-4 py-8"
      >
        <h1 className={ui.heading1}>Review moderation unavailable</h1>
        <p className="text-sm text-muted">Sign in with administrator access, or try again later.</p>
        <a className={`${ui.buttonPrimary} w-fit`} href="/sign-in">
          Sign in
        </a>
      </main>
      <SiteFooter />
    </div>
  ),
});

function Page() {
  const data = Route.useLoaderData();
  return (
    <AdminLayout
      activeHref="/admin/reviews"
      navigation={[{ href: '/admin/reviews', label: 'Review moderation' }]}
    >
      <PageTitle eyebrow="Community reviews" title="Review moderation" />
      <Section id="pending-reports" title="Pending abuse reports">
        {data.reports.map((r) => (
          <article key={r.id} className="grid gap-1 rounded-sm bg-surface-sunken p-3 text-sm">
            <p className="font-semibold">Review {r.review_id}</p>
            <p>{r.reason}</p>
          </article>
        ))}
        {!data.reports.length && <p className={ui.muted}>No pending review reports.</p>}
      </Section>
      {data.reviews.map((r) => (
        <article key={r.id} className={`${admin.card} grid gap-3`}>
          <h2 className="text-base font-bold text-ink">{r.id}</h2>
          <p className={admin.prose}>{r.body}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span
              className={r.visibility === 'visible' ? statusBadge.verified : statusBadge.unknown}
            >
              {r.visibility}
            </span>
            <span aria-hidden>·</span>
            <span>Revision {r.revision}</span>
          </p>
          {r.visibility !== 'removed' && (
            <form method="post" action="/reviews/moderate" className={admin.form}>
              <input type="hidden" name="review" value={r.id} />
              <input type="hidden" name="revision" value={r.revision} />
              <label className={ui.label}>
                Action
                <select className={admin.input} name="action">
                  {r.visibility === 'visible' ? (
                    <option value="hide">Hide</option>
                  ) : (
                    <option value="restore">Restore</option>
                  )}
                  <option value="remove">Remove permanently from public view</option>
                </select>
              </label>
              <label className={ui.label}>
                Reason
                <textarea
                  className={admin.textarea}
                  name="reason"
                  minLength={20}
                  maxLength={1000}
                  required
                />
              </label>
              <button className={`${ui.buttonPrimary} sm:w-fit`}>Save moderation decision</button>
            </form>
          )}
        </article>
      ))}
      {data.next && (
        <a className={admin.link} href={`/admin/reviews?after=${data.next}`}>
          More reviews
        </a>
      )}
    </AdminLayout>
  );
}
