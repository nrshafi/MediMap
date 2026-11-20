import { createFileRoute } from '@tanstack/react-router';
import { readModeration } from '../features/reviews/moderation.functions';
import { AdminLayout } from '../features/administration/AdminLayout';
import { admin, Section } from '../features/administration/adminUi';
import { SiteFooter, SiteHeader } from '../ui/SiteChrome';
import { ui } from '../ui/styles';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ButtonLink } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { fieldControlStyles } from '../ui/Field';

export const Route = createFileRoute('/admin/reviews')({
  head: () => ({
    meta: [{ title: 'Review moderation | MediMap' }, { name: 'robots', content: 'noindex' }],
  }),
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
        <p className="text-small text-muted">
          Sign in with administrator access, or try again later.
        </p>
        <ButtonLink className="w-fit" href="/sign-in">
          Sign in
        </ButtonLink>
      </main>
      <SiteFooter />
    </div>
  ),
});

function Page() {
  const data = Route.useLoaderData();
  return (
    <AdminLayout activeHref="/admin/reviews">
      <PageHeader
        title="Review moderation"
        description="Moderate user reviews and inspect pending abuse reports."
      />
      <Section id="pending-reports" title="Pending abuse reports">
        {data.reports.map((r) => (
          <Card as="article" variant="sunken" key={r.id} className="grid gap-1 text-small">
            <p className="font-semibold text-ink">Review {r.review_id}</p>
            <p>{r.reason}</p>
          </Card>
        ))}
        {!data.reports.length && <p className={ui.muted}>No pending review reports.</p>}
      </Section>
      {data.reviews.map((r) => (
        <Card as="article" variant="default" key={r.id} className="grid gap-3">
          <h2 className={ui.heading3}>{r.id}</h2>
          <p className={admin.prose}>{r.body}</p>
          <p className="flex flex-wrap items-center gap-2 text-small text-muted">
            <Badge tone={r.visibility === 'visible' ? 'verified' : 'unknown'}>{r.visibility}</Badge>
            <span aria-hidden>·</span>
            <span>Revision {r.revision}</span>
          </p>
          {r.visibility !== 'removed' && (
            <form method="post" action="/reviews/moderate" className={admin.form}>
              <input type="hidden" name="review" value={r.id} />
              <input type="hidden" name="revision" value={r.revision} />
              <label className={ui.label}>
                Action
                <select className={fieldControlStyles} name="action">
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
                  className={`${admin.textarea} min-h-24`}
                  name="reason"
                  minLength={20}
                  maxLength={1000}
                  required
                />
              </label>
              <Button type="submit" variant="primary" className="sm:w-fit">
                Save moderation decision
              </Button>
            </form>
          )}
        </Card>
      ))}
      {data.next && (
        <a className={admin.link} href={`/admin/reviews?after=${data.next}`}>
          More reviews
        </a>
      )}
    </AdminLayout>
  );
}
