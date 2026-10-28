import { AdminLayout } from '../administration/AdminLayout';
import { decimalBdt } from '../administration/PricingForms';
import { TargetDetails } from './ReportView';
import { issueLabels } from './contracts';
import { resolutionMessages, reviewHref, type ResolutionDraft } from './review-contracts';
import type { readReview } from './review-operations.server';
import '../administration/catalogManager.css';
import './review.css';

export function ReviewManager({
  result,
  search = {},
  draft = {},
}: {
  result: Awaited<ReturnType<typeof readReview>>;
  search?: Record<string, string | undefined>;
  draft?: ResolutionDraft;
}) {
  const data = result.ok ? result.data : null;
  const selected = data?.selected;
  const feedback = Object.hasOwn(resolutionMessages, search.code ?? '')
    ? Object.entries(resolutionMessages).find(([key]) => key === search.code)?.[1]
    : undefined;
  const sources = data ? [...data.sources.items] : [];
  if (data?.selectedSource && !sources.some((source) => source.id === data.selectedSource?.id))
    sources.push(data.selectedSource);
  const savedSearch = {
    status: data?.query.status ?? search.status,
    report: data?.query.report ?? search.report,
    limit: data ? String(data.query.limit) : search.limit,
  };
  return (
    <AdminLayout activeHref="/admin/reports">
      <div className="admin-title">
        <p className="admin-eyebrow">Information corrections</p>
        <h1>Review reports</h1>
        <p>
          Compare retained submissions with current records. Record the evidence and reason for each
          decision.
        </p>
      </div>
      {!result.ok ? (
        <section className="catalog-state" role="alert">
          <h2>
            {result.code === 'forbidden'
              ? 'Administrator access required'
              : result.code === 'expired'
                ? 'Session expired'
                : result.code === 'unauthenticated'
                  ? 'Sign in to continue'
                  : 'Report review unavailable'}
          </h2>
          <p>{result.message}</p>
          <a
            href={
              ['unauthenticated', 'expired'].includes(result.code)
                ? `/sign-in?returnTo=${encodeURIComponent(reviewHref(search))}`
                : result.code === 'forbidden'
                  ? '/account'
                  : '/admin/reports'
            }
          >
            Open report review
          </a>
          {draft.reason && <p className="report-prose">Your typed reason: {draft.reason}</p>}
        </section>
      ) : (
        data && (
          <>
            {feedback && (
              <section className="admin-notice" role={search.code === 'saved' ? 'status' : 'alert'}>
                <p>{feedback}</p>
              </section>
            )}
            {draft.reason && selected?.report.status !== 'pending' && (
              <section className="admin-notice">
                <h2>Your unsaved reason</h2>
                <p className="report-prose">{draft.reason}</p>
              </section>
            )}
            <form method="get" action="/admin/reports" className="catalog-filter">
              <input type="hidden" name="limit" value={data.query.limit} />
              <div>
                <label htmlFor="review-status">Report status</label>
                <select id="review-status" name="status" defaultValue={data.query.status}>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All reports</option>
                </select>
              </div>
              <button type="submit">Filter reports</button>
            </form>
            <section className="catalog-edit-card" aria-labelledby="report-queue-title">
              <h2 id="report-queue-title">Report queue</h2>
              <p className="admin-muted">Oldest submissions first.</p>
              {data.queue.items.length ? (
                <ul className="catalog-management-list review-queue">
                  {data.queue.items.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.providerName}</strong>
                        <p>
                          {issueLabels[item.issue]} · {item.status}
                        </p>
                        <p className="admin-muted">
                          {item.targetType} · {item.targetId}
                        </p>
                      </div>
                      <a href={reviewHref({ ...savedSearch, report: item.id })}>Review {item.id}</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No reports match this status.</p>
              )}
              {data.queue.nextCursor && (
                <a href={reviewHref({ ...savedSearch, after: data.queue.nextCursor })}>
                  Next reports
                </a>
              )}
            </section>
            {selected && (
              <>
                <section className="catalog-edit-card" aria-labelledby="report-submission-title">
                  <h2 id="report-submission-title">Original submission</h2>
                  <p>Reference: {selected.report.id}</p>
                  <p>
                    {issueLabels[selected.report.issue]} · {selected.report.status}
                  </p>
                  <p>Account reference: {selected.reporterId}</p>
                  <p>Submitted: {new Date(selected.report.createdAt).toISOString()}</p>
                  <p className="report-prose">{selected.report.details}</p>
                  {selected.report.suggestedCorrection && (
                    <p className="report-prose">
                      Suggested correction: {selected.report.suggestedCorrection}
                    </p>
                  )}
                  {selected.report.evidenceUrl && (
                    <a href={selected.report.evidenceUrl} rel="noreferrer" target="_blank">
                      Submitted evidence link
                    </a>
                  )}
                  <TargetDetails
                    target={selected.report.target}
                    receipt
                    headingId="review-original-target-title"
                  />
                </section>
                <section className="catalog-edit-card" aria-labelledby="review-current-title">
                  <h2 id="review-current-title">Current target</h2>
                  <p>
                    Record status: {selected.active ? 'Active' : 'Inactive'}. Revision{' '}
                    {selected.current.revision}.
                  </p>
                  <TargetDetails
                    target={selected.current}
                    headingId="review-current-target-title"
                  />
                  {selected.report.issue === 'price' && (
                    <p>Pending price reports for this listing: {selected.pendingPriceReports}</p>
                  )}
                  <a
                    href={
                      selected.current.kind === 'listing'
                        ? `/admin/prices?listing=${selected.current.id}`
                        : selected.current.kind === 'branch'
                          ? `/admin/providers?provider=${selected.current.providerId}&branch=${selected.current.id}`
                          : `/admin/providers?provider=${selected.current.id}`
                    }
                  >
                    Open record editor
                  </a>
                </section>
                {selected.resolution ? (
                  <section className="catalog-edit-card" aria-labelledby="resolution-history-title">
                    <h2 id="resolution-history-title">Recorded resolution</h2>
                    <p>Decision: {selected.resolution.outcome}</p>
                    <p className="report-prose">{selected.resolution.reason}</p>
                    <p>Administrator: {selected.resolution.actorId}</p>
                    <p>Reviewed: {new Date(selected.resolution.createdAt).toISOString()}</p>
                    <p>
                      Official source: {selected.resolution.sourceId}
                      {selected.resolution.sourceRow
                        ? ` · row ${selected.resolution.sourceRow}`
                        : ''}
                    </p>
                    <p>
                      Resulting price revision:{' '}
                      {selected.resolution.resultingPriceId ?? 'No new price revision'}
                    </p>
                    <p>
                      Price outcome at resolution:{' '}
                      {selected.resolution.priceAction === 'unknown'
                        ? 'Unknown'
                        : (selected.resolution.resultingPriceStatus ?? 'Unchanged')}
                    </p>
                    <p>Reviewed target revision: {selected.resolution.reviewedTarget.revision}</p>
                  </section>
                ) : (
                  selected.report.status === 'pending' && (
                    <section className="catalog-edit-card" aria-labelledby="resolve-report-title">
                      <h2 id="resolve-report-title">Resolve report</h2>
                      <p>
                        Review an official source and the current record before recording a
                        decision.
                      </p>
                      {selected.report.issue === 'price' ? (
                        <p className="admin-notice">
                          A fresh official-source review is required, including rejection. Other
                          pending price reports keep the reviewed price disputed.
                        </p>
                      ) : (
                        <p className="admin-muted">
                          For an accepted non-price report, apply the correction in the record
                          editor first. Return here to review and record the decision.
                        </p>
                      )}
                      <p className="admin-muted">
                        Official evidence is restricted to this provider. Source collection and
                        review dates remain separate.
                      </p>
                      <ul className="review-sources">
                        {sources.map((source) => (
                          <li key={source.id}>
                            <a href={source.url} rel="noreferrer" target="_blank">
                              {source.id}
                            </a>
                            <span>
                              {source.kind} · collected {source.retrievedAt}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {data.sources.nextCursor && (
                        <a
                          href={reviewHref({
                            ...savedSearch,
                            sourceAfter: data.sources.nextCursor,
                          })}
                        >
                          Next official sources
                        </a>
                      )}
                      {data.query.sourceAfter && (
                        <a href={reviewHref(savedSearch)}>First official sources</a>
                      )}
                      {
                        <form
                          method="post"
                          action="/admin/reports/resolve"
                          className="catalog-edit-form"
                        >
                          <input type="hidden" name="reportId" value={selected.report.id} />
                          <input
                            type="hidden"
                            name="reviewedRevision"
                            value={selected.current.revision}
                          />
                          <input
                            type="hidden"
                            name="reviewedPriceId"
                            value={selected.current.price?.id ?? ''}
                          />
                          {selected.report.issue === 'price' ? (
                            <>
                              <label>
                                Price outcome
                                <select
                                  name="priceAction"
                                  defaultValue={
                                    draft.priceAction ??
                                    (selected.current.price ? 'review_price' : 'unknown')
                                  }
                                >
                                  <option value="review_price">
                                    Publish reviewed standard price
                                  </option>
                                  <option value="unknown">Set or retain unknown price</option>
                                </select>
                              </label>
                              <label>
                                Reviewed standard price (BDT)
                                <input
                                  name="amount"
                                  inputMode="decimal"
                                  pattern="(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?"
                                  defaultValue={
                                    draft.amount ??
                                    (selected.current.price
                                      ? decimalBdt(selected.current.price.amountMinor)
                                      : '')
                                  }
                                />
                              </label>
                              <label>
                                Provider effective date (optional)
                                <input
                                  type="date"
                                  name="effectiveDate"
                                  defaultValue={
                                    draft.effectiveDate ??
                                    selected.current.price?.effectiveDate ??
                                    ''
                                  }
                                />
                              </label>
                              <label className="catalog-confirm">
                                <input type="checkbox" name="standardPrice" value="yes" />
                                <span>
                                  The reviewed amount is a standard base price without a promotion
                                  or discount.
                                </span>
                              </label>
                              <p className="admin-muted">
                                A known reviewed price needs a tariff source, currency evidence, and
                                row number. Rejection must retain the current amount and effective
                                date. Unknown prices never qualify for statistics.
                              </p>
                            </>
                          ) : (
                            <input type="hidden" name="priceAction" value="none" />
                          )}
                          <label>
                            Resolution decision
                            <select name="outcome" defaultValue={draft.outcome ?? 'rejected'}>
                              <option value="rejected">Reject report</option>
                              <option value="accepted">Accept corrected report</option>
                            </select>
                          </label>
                          <label>
                            Resolution reason
                            <textarea
                              className="review-reason"
                              name="reason"
                              minLength={20}
                              maxLength={2000}
                              required
                              defaultValue={draft.reason ?? ''}
                            />
                          </label>
                          <label>
                            Reviewed official source
                            <select
                              name="sourceId"
                              required
                              defaultValue={
                                draft.sourceId ?? data.selectedSource?.id ?? sources[0]?.id ?? ''
                              }
                            >
                              <option value="">Select official source</option>
                              {sources.map((source) => (
                                <option key={source.id} value={source.id}>
                                  {source.id} · {source.kind}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Evidence row (optional for non-price issues)
                            <input
                              name="sourceRow"
                              inputMode="numeric"
                              pattern="[1-9][0-9]*"
                              defaultValue={
                                draft.sourceRow ??
                                (selected.current.price?.sourceRow
                                  ? String(selected.current.price.sourceRow)
                                  : '')
                              }
                            />
                          </label>
                          <label className="catalog-confirm">
                            <input type="checkbox" name="confirmReview" value="yes" required />
                            <span>I reviewed this official source and the current target now.</span>
                          </label>
                          <button type="submit">Save resolution</button>
                        </form>
                      }
                    </section>
                  )
                )}
              </>
            )}
          </>
        )
      )}
    </AdminLayout>
  );
}
