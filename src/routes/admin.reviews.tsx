import { createFileRoute } from '@tanstack/react-router';
import { readModeration } from '../features/reviews/moderation.functions';
import { AdminLayout } from '../features/administration/AdminLayout';
export const Route = createFileRoute('/admin/reviews')({
  validateSearch: (s: Record<string, unknown>) => ({
    after: typeof s.after === 'string' ? s.after : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => readModeration({ data: deps }),
  component: Page,
  errorComponent: () => (
    <main className="public-page">
      <h1>Review moderation unavailable</h1>
      <p>Sign in with administrator access, or try again later.</p>
      <a href="/sign-in">Sign in</a>
    </main>
  ),
});
function Page() {
  const data = Route.useLoaderData();
  return (
    <AdminLayout
      activeHref="/admin/reviews"
      navigation={[{ href: '/admin/reviews', label: 'Review moderation' }]}
    >
      <h1>Review moderation</h1>
      <h2>Pending abuse reports</h2>
      {data.reports.map((r) => (
        <article key={r.id}>
          <p>Review {r.review_id}</p>
          <p>{r.reason}</p>
        </article>
      ))}
      {!data.reports.length && <p>No pending review reports.</p>}
      {data.reviews.map((r) => (
        <article key={r.id}>
          <h2>{r.id}</h2>
          <p>{r.body}</p>
          <p>
            {r.visibility} · Revision {r.revision}
          </p>
          {r.visibility !== 'removed' && (
            <form method="post" action="/reviews/moderate">
              <input type="hidden" name="review" value={r.id} />
              <input type="hidden" name="revision" value={r.revision} />
              <label>
                Action
                <select name="action">
                  {r.visibility === 'visible' ? (
                    <option value="hide">Hide</option>
                  ) : (
                    <option value="restore">Restore</option>
                  )}
                  <option value="remove">Remove permanently from public view</option>
                </select>
              </label>
              <label>
                Reason
                <textarea name="reason" minLength={20} maxLength={1000} required />
              </label>
              <button>Save moderation decision</button>
            </form>
          )}
        </article>
      ))}
      {data.next && <a href={`/admin/reviews?after=${data.next}`}>More reviews</a>}
    </AdminLayout>
  );
}
