import { ArrowLeft, Star } from 'lucide-react';
import { PageShell, PageMain } from '../../ui/PageShell';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button, ButtonLink } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { EmptyState } from '../../ui/EmptyState';
import { Field, fieldControlStyles } from '../../ui/Field';
import { StatTile } from '../../ui/StatTile';
import {
  ratingDimensions,
  reviewErrorMessages,
  reviewResultMessages,
  type ReviewErrorCode,
  type ReviewResultCode,
} from './contracts';
import type { readReviews } from './reviews.functions';
import { formatReviewDate } from '../public/format';

export function ReviewPage({
  data,
  result,
  error,
}: {
  data: Awaited<ReturnType<typeof readReviews>>;
  result?: ReviewResultCode;
  error?: ReviewErrorCode;
}) {
  if (!data.listing)
    return (
      <PageShell>
        <PageMain width="narrow">
          <PageHeader title="Service reviews" />
          <EmptyState
            title="Listing not found"
            description="The requested branch-service listing could not be found or is inactive."
            action={
              <ButtonLink href="/find" variant="primary">
                Browse services
              </ButtonLink>
            }
          />
        </PageMain>
      </PageShell>
    );

  const own = data.own;
  const scores: unknown = own ? JSON.parse(own.scores) : null;

  return (
    <PageShell>
      <PageMain width="narrow">
        <PageHeader
          title={`Reviews for ${data.listing.service.name}`}
          description={
            <p className="text-small text-muted">
              {data.listing.branch.provider.name}, {data.listing.branch.name}
            </p>
          }
          actions={
            <ButtonLink
              variant="secondary"
              href={`/branches/${data.listing.branch.id}`}
              icon={<ArrowLeft aria-hidden size={16} />}
            >
              Branch details
            </ButtonLink>
          }
        />

        {result && <Notice kind="info">{reviewResultMessages[result]}</Notice>}
        {!result && error && (
          <Notice kind="error" role="alert">
            {reviewErrorMessages[error]}
          </Notice>
        )}

        <Card as="section" aria-label="Rating summary" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Star aria-hidden size={24} className="fill-primary" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-h1 font-bold text-ink">
                    {data.summary?.mean ? data.summary.mean.toFixed(2) : '—'}
                  </span>
                  <span className="text-small text-muted">/ 5</span>
                </div>
                <p className="text-small text-muted">
                  {data.summary?.count
                    ? `${data.summary.count} ${data.summary.count === 1 ? 'service review' : 'service reviews'}`
                    : 'No reviews yet.'}
                </p>
              </div>
            </div>
          </div>
          {/* Space for rating chart: Codra21 adds the chart in step 14 */}
          <div id="rating-chart-slot" aria-hidden="true" className="min-h-0" />
        </Card>

        {data.signedIn && own?.visibility !== 'removed' ? (
          <Card as="section" aria-label="Write a review" className="flex flex-col gap-4">
            <h2 className="font-display text-h2 font-bold text-ink">
              {own ? 'Edit your review' : 'Write a review'}
            </h2>
            <form method="post" action="/reviews/write" className="flex flex-col gap-4">
              <input type="hidden" name="listing" value={data.listing.id} />
              <input type="hidden" name="revision" value={own?.revision ?? 0} />
              <fieldset className="rounded-sm border border-border p-4">
                <legend className="px-1 text-small font-semibold text-ink">
                  Rating dimensions
                </legend>
                <p className="mb-3 text-small text-muted">
                  Rate each dimension from 1 (poor) to 5 (excellent).
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ratingDimensions.map((name, i) => (
                    <Field
                      key={name}
                      id={`score-${i}`}
                      label={name}
                      required
                      control={
                        <select
                          className={fieldControlStyles}
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
                      }
                    />
                  ))}
                </div>
              </fieldset>
              <Field
                id="written-review"
                label="Written review, optional"
                control={
                  <textarea
                    id="written-review"
                    className={`${fieldControlStyles} min-h-32 py-2`}
                    name="body"
                    maxLength={2000}
                    defaultValue={own?.body ?? ''}
                  />
                }
              />
              <p className="text-small text-muted">
                Up to five review submissions or edits per rolling 24 hours.
              </p>
              <Button type="submit" variant="primary" className="self-start">
                Save review
              </Button>
            </form>
          </Card>
        ) : own?.visibility === 'removed' ? (
          <Notice kind="warning">This review has been removed by moderation.</Notice>
        ) : (
          <Card
            as="section"
            aria-label="Sign in to review"
            className="flex flex-col items-center gap-3 p-6 text-center"
          >
            <h2 className="font-display text-h3 font-semibold text-ink">Share your experience</h2>
            <p className="max-w-md text-small text-muted">
              Sign in with your Google account to submit a review for this diagnostic service.
            </p>
            <ButtonLink
              variant="primary"
              href={`/sign-in?returnTo=${encodeURIComponent(`/reviews?listing=${data.listing.id}`)}`}
            >
              Sign in to review
            </ButtonLink>
          </Card>
        )}

        <section aria-label="Published reviews" className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-bold text-ink">Published reviews</h2>
          {data.items.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description="Be the first to review this diagnostic service."
            />
          ) : (
            data.items.map((r) => (
              <Card as="article" key={r.id} className="flex flex-col gap-3">
                <p className="text-small text-muted">Updated {formatReviewDate(r.updated_at)}</p>
                <p className="text-body text-ink">{r.body || 'No written review.'}</p>
                <ReviewScores encoded={r.scores} />
                {data.signedIn && (
                  <details className="mt-2 border-t border-border pt-3">
                    <summary className="flex min-h-touch cursor-pointer items-center text-small font-semibold text-primary">
                      Report this review
                    </summary>
                    <form
                      method="post"
                      action="/reviews/report"
                      className="flex flex-col gap-3 pt-3"
                    >
                      <input type="hidden" name="review" value={r.id} />
                      <input type="hidden" name="listing" value={data.listing.id} />
                      <Field
                        id={`report-reason-${r.id}`}
                        label="Reason"
                        control={
                          <textarea
                            id={`report-reason-${r.id}`}
                            className={`${fieldControlStyles} min-h-24 py-2`}
                            name="reason"
                            minLength={20}
                            maxLength={1000}
                            required
                          />
                        }
                      />
                      <Button type="submit" variant="secondary" className="self-start">
                        Report review
                      </Button>
                    </form>
                  </details>
                )}
              </Card>
            ))
          )}
          {data.next && (
            <ButtonLink
              variant="secondary"
              className="self-start"
              href={`/reviews?listing=${data.listing.id}&after=${data.next}`}
            >
              More reviews
            </ButtonLink>
          )}
        </section>
      </PageMain>
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
        <StatTile
          key={ratingDimensions[index]}
          label={ratingDimensions[index]}
          value={`${score} / 5`}
        />
      ))}
    </dl>
  );
}
