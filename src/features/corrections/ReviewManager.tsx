import { AdminLayout } from '../administration/AdminLayout';
import { decimalBdt } from '../administration/PricingForms';
import { TargetDetails } from './ReportView';
import { issueLabels } from './contracts';
import { resolutionMessages, reviewHref, type ResolutionDraft } from './review-contracts';
import type { readReview } from './review-operations.server';
import { admin, Notice, PageTitle, Section, StateCard } from '../administration/adminUi';
import { ui } from '../../ui/styles';

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
      <PageTitle eyebrow="Information corrections" title="Review reports">
        Compare retained submissions with current records. Record the evidence and reason for each
        decision.
      </PageTitle>
      {!result.ok ? (
        <StateCard
          title={
            result.code === 'forbidden'
              ? 'Administrator access required'
              : result.code === 'expired'
                ? 'Session expired'
                : result.code === 'unauthenticated'
                  ? 'Sign in to continue'
                  : 'Report review unavailable'
          }
        >
          <p>{result.message}</p>
          <a
            className={admin.link}
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
          {draft.reason && (
            <p className={`report-prose ${admin.prose}`}>Your typed reason: {draft.reason}</p>
          )}
        </StateCard>
      ) : (
        data && (
          <>
            {feedback && (
              <Notice role={search.code === 'saved' ? 'status' : 'alert'}>
                <p>{feedback}</p>
              </Notice>
            )}
            {draft.reason && selected?.report.status !== 'pending' && (
              <Notice>
                <h2 className="font-bold">Your unsaved reason</h2>
                <p className={`report-prose ${admin.prose}`}>{draft.reason}</p>
              </Notice>
            )}
            <form method="get" action="/admin/reports" className={admin.filter}>
              <input type="hidden" name="limit" value={data.query.limit} />
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor="review-status">
                  Report status
                </label>
                <select
                  className={admin.input}
                  id="review-status"
                  name="status"
                  defaultValue={data.query.status}
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All reports</option>
                </select>
              </div>
              <button className={ui.buttonPrimary} type="submit">
                Filter reports
              </button>
            </form>
            <Section id="report-queue-title" title="Report queue">
              <p className={admin.hint}>Oldest submissions first.</p>
              {data.queue.items.length ? (
                <ul className={admin.list}>
                  {data.queue.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0 text-sm">
                        <strong className="font-semibold">{item.providerName}</strong>
                        <p>
                          {issueLabels[item.issue]} · {item.status}
                        </p>
                        <p className={admin.hint}>
                          {item.targetType} · {item.targetId}
                        </p>
                      </div>
                      <a
                        className={admin.link}
                        href={reviewHref({ ...savedSearch, report: item.id })}
                      >
                        Review {item.id}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No reports match this status.</p>
              )}
              {data.queue.nextCursor && (
                <a
                  className={admin.link}
                  href={reviewHref({ ...savedSearch, after: data.queue.nextCursor })}
                >
                  Next reports
                </a>
              )}
            </Section>
            {selected && (
              <>
                <Section id="report-submission-title" title="Original submission">
                  <p>Reference: {selected.report.id}</p>
                  <p>
                    {issueLabels[selected.report.issue]} · {selected.report.status}
                  </p>
                  <p>Account reference: {selected.reporterId}</p>
                  <p>Submitted: {new Date(selected.report.createdAt).toISOString()}</p>
                  <p className={`report-prose ${admin.prose}`}>{selected.report.details}</p>
                  {selected.report.suggestedCorrection && (
                    <p className={`report-prose ${admin.prose}`}>
                      Suggested correction: {selected.report.suggestedCorrection}
                    </p>
                  )}
                  {selected.report.evidenceUrl && (
                    <a
                      className={admin.link}
                      href={selected.report.evidenceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Submitted evidence link
                    </a>
                  )}
                  <TargetDetails
                    target={selected.report.target}
                    receipt
                    headingId="review-original-target-title"
                  />
                </Section>
                <Section id="review-current-title" title="Current target">
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
                    className={admin.link}
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
                </Section>
                {selected.resolution ? (
                  <Section id="resolution-history-title" title="Recorded resolution">
                    <p>Decision: {selected.resolution.outcome}</p>
                    <p className={`report-prose ${admin.prose}`}>{selected.resolution.reason}</p>
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
                  </Section>
                ) : (
                  selected.report.status === 'pending' && (
                    <Section id="resolve-report-title" title="Resolve report">
                      <p>
                        Review an official source and the current record before recording a
                        decision.
                      </p>
                      {selected.report.issue === 'price' ? (
                        <Notice>
                          A fresh official-source review is required, including rejection. Other
                          pending price reports keep the reviewed price disputed.
                        </Notice>
                      ) : (
                        <p className={admin.hint}>
                          For an accepted non-price report, apply the correction in the record
                          editor first. Return here to review and record the decision.
                        </p>
                      )}
                      <p className={admin.hint}>
                        Official evidence is restricted to this provider. Source collection and
                        review dates remain separate.
                      </p>
                      <ul className="grid gap-2 text-sm">
                        {sources.map((source) => (
                          <li key={source.id} className="grid min-w-0 gap-0.5">
                            <a
                              className={admin.link}
                              href={source.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {source.id}
                            </a>
                            <span className="text-muted">
                              {source.kind} · collected {source.retrievedAt}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {data.sources.nextCursor && (
                        <a
                          className={admin.link}
                          href={reviewHref({
                            ...savedSearch,
                            sourceAfter: data.sources.nextCursor,
                          })}
                        >
                          Next official sources
                        </a>
                      )}
                      {data.query.sourceAfter && (
                        <a className={admin.link} href={reviewHref(savedSearch)}>
                          First official sources
                        </a>
                      )}
                      {
                        <form method="post" action="/admin/reports/resolve" className={admin.form}>
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
                              <label className={ui.label}>
                                Price outcome
                                <select
                                  className={admin.input}
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
                              <label className={ui.label}>
                                Reviewed standard price (BDT)
                                <input
                                  className={admin.input}
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
                              <label className={ui.label}>
                                Provider effective date (optional)
                                <input
                                  className={admin.input}
                                  type="date"
                                  name="effectiveDate"
                                  defaultValue={
                                    draft.effectiveDate ??
                                    selected.current.price?.effectiveDate ??
                                    ''
                                  }
                                />
                              </label>
                              <label className={admin.check}>
                                <input
                                  className={admin.checkbox}
                                  type="checkbox"
                                  name="standardPrice"
                                  value="yes"
                                />
                                <span>
                                  The reviewed amount is a standard base price without a promotion
                                  or discount.
                                </span>
                              </label>
                              <p className={admin.hint}>
                                A known reviewed price needs a tariff source, currency evidence, and
                                row number. Rejection must retain the current amount and effective
                                date. Unknown prices never qualify for statistics.
                              </p>
                            </>
                          ) : (
                            <input type="hidden" name="priceAction" value="none" />
                          )}
                          <label className={ui.label}>
                            Resolution decision
                            <select
                              className={admin.input}
                              name="outcome"
                              defaultValue={draft.outcome ?? 'rejected'}
                            >
                              <option value="rejected">Reject report</option>
                              <option value="accepted">Accept corrected report</option>
                            </select>
                          </label>
                          <label className={ui.label}>
                            Resolution reason
                            <textarea
                              className={`${admin.textarea} min-h-40`}
                              name="reason"
                              minLength={20}
                              maxLength={2000}
                              required
                              defaultValue={draft.reason ?? ''}
                            />
                          </label>
                          <label className={ui.label}>
                            Reviewed official source
                            <select
                              className={admin.input}
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
                          <label className={ui.label}>
                            Evidence row (optional for non-price issues)
                            <input
                              className={admin.input}
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
                          <label className={admin.check}>
                            <input
                              className={admin.checkbox}
                              type="checkbox"
                              name="confirmReview"
                              value="yes"
                              required
                            />
                            <span>I reviewed this official source and the current target now.</span>
                          </label>
                          <button className={ui.buttonPrimary} type="submit">
                            Save resolution
                          </button>
                        </form>
                      }
                    </Section>
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
