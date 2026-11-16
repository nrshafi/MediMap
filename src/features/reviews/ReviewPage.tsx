import { ratingDimensions } from './contracts';
import type { readReviews } from './reviews.functions';
import '../public/public.css';
export function ReviewPage({ data }: { data: Awaited<ReturnType<typeof readReviews>> }) {
  if (!data.listing)
    return (
      <main className="public-page">
        <h1>Listing not found</h1>
      </main>
    );
  const own = data.own;
  const scores: unknown = own ? JSON.parse(own.scores) : null;
  return (
    <main className="public-page">
      <a href={`/branches/${data.listing.branch.id}`}>Branch details</a>
      <h1>Reviews for {data.listing.service.name}</h1>
      <p>
        {data.listing.branch.provider.name}, {data.listing.branch.name}
      </p>
      <p>
        {data.summary?.count
          ? `${data.summary.count} service reviews · ${data.summary.mean?.toFixed(2)} / 5`
          : 'No reviews yet.'}
      </p>
      {data.items.map((r) => (
        <article key={r.id}>
          <h2>Service experience</h2>
          {data.signedIn && (
            <details>
              <summary>Report this review</summary>
              <form method="post" action="/reviews/report">
                <input type="hidden" name="review" value={r.id} />
                <label>
                  Reason
                  <textarea name="reason" minLength={20} maxLength={1000} required />
                </label>
                <button>Report review</button>
              </form>
            </details>
          )}
          <p>{r.body || 'No written review.'}</p>
          <ReviewScores encoded={r.scores} />
          <p>Updated {new Date(r.updated_at).toISOString()}</p>
        </article>
      ))}
      {data.next && (
        <a href={`/reviews?listing=${data.listing.id}&after=${data.next}`}>More reviews</a>
      )}
      {data.signedIn && own?.visibility !== 'removed' ? (
        <form method="post" action="/reviews/write">
          <h2>{own ? 'Edit your review' : 'Write a review'}</h2>
          <input type="hidden" name="listing" value={data.listing.id} />
          <input type="hidden" name="revision" value={own?.revision ?? 0} />
          {ratingDimensions.map((name, i) => (
            <label key={name}>
              {name}
              <select
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
          <label>
            Written review, optional
            <textarea name="body" maxLength={2000} defaultValue={own?.body ?? ''} />
          </label>
          <p>Up to five review submissions or edits per rolling 24 hours.</p>
          <button>Save review</button>
        </form>
      ) : (
        <p>
          {own?.visibility === 'removed' ? (
            'This review has been removed by moderation.'
          ) : (
            <a
              href={`/sign-in?returnTo=${encodeURIComponent(`/reviews?listing=${data.listing.id}`)}`}
            >
              Sign in to review
            </a>
          )}
        </p>
      )}
    </main>
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
    <dl>
      {scores.map((score: number, index: number) => (
        <div key={ratingDimensions[index]}>
          <dt>{ratingDimensions[index]}</dt>
          <dd>{score} / 5</dd>
        </div>
      ))}
    </dl>
  );
}
