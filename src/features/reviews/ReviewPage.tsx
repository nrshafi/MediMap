import { ArrowLeft, Star } from 'lucide-react';
import { PageShell } from '../../ui/PageShell';
import { ui } from '../../ui/styles';
import { ratingDimensions } from './contracts';
import type { readReviews } from './reviews.functions';

const linkRow = `${ui.link} inline-flex min-h-touch items-center gap-1`;
const textarea = `${ui.input} min-h-32 py-2`;

export function ReviewPage({ data }: { data: Awaited<ReturnType<typeof readReviews>> }) {
  if (!data.listing)
    return (
      <PageShell>
        <main className={`${ui.page} flex flex-col gap-3`}>
          <h1 className={ui.heading1}>Listing not found</h1>
          <a className={linkRow} href="/find">
            Browse services
          </a>
        </main>
      </PageShell>
    );
  const own = data.own;
  const scores: unknown = own ? JSON.parse(own.scores) : null;
  return (
    <PageShell>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-2">
          <a className={linkRow} href={`/branches/${data.listing.branch.id}`}>
            <ArrowLeft aria-hidden size={16} />
            Branch details
          </a>
          <h1 className={ui.heading1}>Reviews for {data.listing.service.name}</h1>
          <p className={ui.muted}>
            {data.listing.branch.provider.name}, {data.listing.branch.name}
          </p>
          <p className="flex items-center gap-2 font-semibold">
            <Star aria-hidden size={18} className="text-primary" />
            {data.summary?.count
              ? `${data.summary.count} service reviews · ${data.summary.mean?.toFixed(2)} / 5`
              : 'No reviews yet.'}
          </p>
        </div>
        <section aria-label="Published reviews" className="flex flex-col gap-3">
          {data.items.map((r) => (
            <article key={r.id} className={`${ui.card} flex flex-col gap-3`}>
              <h2 className={ui.heading2}>Service experience</h2>
              <p>{r.body || 'No written review.'}</p>
              <ReviewScores encoded={r.scores} />
              <p className={ui.muted}>Updated {new Date(r.updated_at).toISOString()}</p>
              {data.signedIn && (
                <details>
                  <summary className="flex min-h-touch cursor-pointer items-center text-sm font-semibold text-primary">
                    Report this review
                  </summary>
                  <form method="post" action="/reviews/report" className="flex flex-col gap-2 pt-2">
                    <input type="hidden" name="review" value={r.id} />
                    <label className={ui.label}>
                      Reason
                      <textarea
                        className={textarea}
                        name="reason"
                        minLength={20}
                        maxLength={1000}
                        required
                      />
                    </label>
                    <button className={`${ui.buttonSecondary} self-start`}>Report review</button>
                  </form>
                </details>
              )}
            </article>
          ))}
          {data.next && (
            <a
              className={`${ui.buttonSecondary} self-start`}
              href={`/reviews?listing=${data.listing.id}&after=${data.next}`}
            >
              More reviews
            </a>
          )}
        </section>
        {data.signedIn && own?.visibility !== 'removed' ? (
          <form method="post" action="/reviews/write" className={`${ui.card} flex flex-col gap-4`}>
            <h2 className={ui.heading2}>{own ? 'Edit your review' : 'Write a review'}</h2>
            <input type="hidden" name="listing" value={data.listing.id} />
            <input type="hidden" name="revision" value={own?.revision ?? 0} />
            <div className="grid gap-3 sm:grid-cols-2">
              {ratingDimensions.map((name, i) => (
                <label key={name} className={ui.label}>
                  {name}
                  <select
                    className={ui.select}
                    name={`score${i}`}
                    defaultValue={Array.isArray(scores) ? String(scores[i]) : ''}
                    required
                  >
                    <option value="">Choose rating</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <label className={ui.label}>
              Written review, optional
              <textarea
                className={textarea}
                name="body"
                maxLength={2000}
                defaultValue={own?.body ?? ''}
              />
            </label>
            <p className={ui.muted}>Up to five review submissions or edits per rolling 24 hours.</p>
            <button className={`${ui.buttonPrimary} self-start`}>Save review</button>
          </form>
        ) : (
          <p>
            {own?.visibility === 'removed' ? (
              'This review has been removed by moderation.'
            ) : (
              <a
                className={ui.buttonPrimary}
                href={`/sign-in?returnTo=${encodeURIComponent(`/reviews?listing=${data.listing.id}`)}`}
              >
                Sign in to review
              </a>
            )}
          </p>
        )}
      </main>
    </PageShell>
  );
}

function ReviewScores({ encoded }: { encoded: string }) {
  const scores: unknown = JSON.parse(encoded);
  if (
    !Array.isArray(scores) ||
    scores.length !== 6 ||
    scores.some(
      (score: unknown) =>
        typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5,
    )
  )
    throw new Error('Invalid stored review ratings');
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {scores.map((score: number, index: number) => (
        <div key={ratingDimensions[index]} className={ui.tile}>
          <dt className={ui.tileLabel}>{ratingDimensions[index]}</dt>
          <dd className={ui.tileValue}>{score} / 5</dd>
        </div>
      ))}
    </dl>
  );
}
