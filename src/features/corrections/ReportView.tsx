import {
  issueLabels,
  targetIssues,
  reportHref,
  reportMessages,
  type ReportDraft,
  type ReportReceipt,
  type ReportTarget,
} from './contracts';
import { weekDays, dayHoursLabel } from '../providers/hours';
import { SiteFooter, SiteHeader } from '../../ui/SiteChrome';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button, ButtonLink } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { Field, fieldControlStyles } from '../../ui/Field';

export type ReportPageData = {
  target: ReportTarget | null;
  access: 'allowed' | 'sign_in' | 'expired' | 'unavailable';
  receipt: ReportReceipt | null;
  error: keyof typeof reportMessages | null;
};

function priceLabel(minor: number): string {
  const value = BigInt(minor);
  return `BDT ${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

export function TargetDetails({
  target,
  receipt = false,
  headingId = 'report-target-title',
}: {
  target: ReportTarget;
  receipt?: boolean;
  headingId?: string;
}) {
  return (
    <Card as="section" aria-labelledby={headingId} className="flex flex-col gap-3 text-small">
      <h2 id={headingId} className="font-display text-h2 font-bold text-ink">
        {receipt ? 'Details at submission' : 'Selected record'}
      </h2>
      <p className="leading-relaxed">
        <strong className="font-semibold text-ink">{target.providerName}</strong>
        {target.branchName && (
          <>
            <br />
            {target.branchName}
          </>
        )}
        {target.serviceName && (
          <>
            <br />
            {target.serviceName}
          </>
        )}
      </p>
      {target.providerServiceName && (
        <p className="text-muted">Provider label: {target.providerServiceName}</p>
      )}
      {target.address && <p className="text-muted">{target.address}</p>}
      {target.kind === 'listing' && (
        <p className="text-muted">
          {receipt ? 'Reported price' : 'Current price'}:{' '}
          <span className="font-medium text-ink">
            {target.price
              ? `${priceLabel(target.price.amountMinor)} · ${target.price.status}`
              : 'Unknown'}
          </span>
        </p>
      )}
      {target.kind !== 'listing' && (
        <p className="text-muted">
          Telephone: {target.phone ?? 'Unknown'}
          <br />
          Website: {target.website ?? 'Unknown'}
        </p>
      )}
      {target.kind === 'branch' && (
        <details className="mt-1">
          <summary className="flex min-h-touch cursor-pointer items-center font-semibold text-primary">
            Usual weekly hours · Asia/Dhaka
          </summary>
          {target.openingHours ? (
            <ul className="mt-1 space-y-0.5 text-muted">
              {weekDays.map((day) => (
                <li key={day}>
                  <span className="font-medium text-ink">{day}:</span>{' '}
                  {dayHoursLabel(target.openingHours?.days[day] ?? null)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-muted">Opening hours unknown.</p>
          )}
        </details>
      )}
    </Card>
  );
}

export function ReportView({ data, draft = {} }: { data: ReportPageData; draft?: ReportDraft }) {
  const target = data.receipt?.target ?? data.target;
  const returnTo = target
    ? reportHref({ target: target.kind, id: target.id, issue: draft.issue })
    : '/report';
  const selectedIssue = target
    ? (targetIssues[target.kind].find((issue) => issue === draft.issue) ??
      targetIssues[target.kind][0])
    : undefined;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6"
      >
        <PageHeader
          title="Report incorrect information"
          description="Describe an issue with the published provider, branch, or diagnostic listing so an administrator can review it."
        />

        {data.receipt ? (
          <Notice kind="info" role="status" title="Report submitted">
            <p>Reference: {data.receipt.id}</p>
            <p>Status: {data.receipt.status}</p>
            <p>
              {data.receipt.issue === 'price' && data.receipt.status === 'pending'
                ? data.receipt.target.price
                  ? 'The reported price is disputed while this report is pending. It does not qualify for default price statistics.'
                  : 'The price remains unknown while this report is pending. It does not qualify for default price statistics.'
                : data.receipt.status === 'accepted'
                  ? 'An administrator accepted this report after review. The original submitted details remain below.'
                  : data.receipt.status === 'rejected'
                    ? 'An administrator reviewed and rejected this report. The original submitted details remain below.'
                    : 'An administrator reviews the report before changing the published details.'}
            </p>
          </Notice>
        ) : data.error ? (
          <Notice
            kind="error"
            role="alert"
            title={data.error === 'not_found' ? 'Record unavailable' : 'Your report was not saved'}
          >
            <p>{reportMessages[data.error]}</p>
          </Notice>
        ) : data.access === 'sign_in' || data.access === 'expired' ? (
          <Notice
            kind="warning"
            role="status"
            title={data.access === 'expired' ? 'Session expired' : 'Sign in to submit a report'}
          >
            <p>Use your account to submit this correction.</p>
            <div className="pt-2">
              <ButtonLink
                variant="primary"
                href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}&reason=${data.access === 'expired' ? 'expired' : 'required'}`}
              >
                Sign in with Google
              </ButtonLink>
            </div>
          </Notice>
        ) : (
          data.access === 'unavailable' && (
            <Notice kind="error" role="alert" title="Reporting unavailable">
              <p>
                Reporting is unavailable. Your typed details remain below if you need to copy them.
              </p>
            </Notice>
          )
        )}

        {data.receipt ? (
          <>
            <TargetDetails target={data.receipt.target} receipt />
            <Card as="section" className="flex flex-col gap-3">
              <h2 className="font-display text-h2 font-bold text-ink">
                Your submitted information
              </h2>
              <div className="flex flex-col gap-2 text-small">
                <p className="text-muted">
                  <strong className="font-semibold text-ink">Issue:</strong>{' '}
                  {issueLabels[data.receipt.issue]}
                </p>
                <div>
                  <strong className="font-semibold text-ink">Details:</strong>
                  <p className="report-prose mt-1 whitespace-pre-wrap rounded-sm bg-surface-sunken p-3 text-ink [overflow-wrap:anywhere]">
                    {data.receipt.details}
                  </p>
                </div>
                {data.receipt.suggestedCorrection && (
                  <p className="report-prose [overflow-wrap:anywhere]">
                    <strong className="font-semibold text-ink">Suggested correction:</strong>{' '}
                    {data.receipt.suggestedCorrection}
                  </p>
                )}
                {data.receipt.evidenceUrl && (
                  <p>
                    <a
                      className="inline-flex min-h-touch items-center gap-1 font-medium text-primary hover:underline"
                      href={data.receipt.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Your evidence link
                    </a>
                  </p>
                )}
              </div>
            </Card>
          </>
        ) : target ? (
          <>
            <TargetDetails target={target} />
            <Card as="section" aria-labelledby="report-form-title" className="flex flex-col gap-4">
              <h2 id="report-form-title" className="font-display text-h2 font-bold text-ink">
                Report details
              </h2>
              <form method="post" action="/report/submit" className="flex flex-col gap-4">
                <input type="hidden" name="target" value={target.kind} />
                <input type="hidden" name="id" value={target.id} />
                <input type="hidden" name="observedRevision" value={target.revision} />
                <input type="hidden" name="observedPriceId" value={target.price?.id ?? ''} />
                <Field
                  id="report-issue"
                  label="Issue type"
                  control={
                    <select
                      className={fieldControlStyles}
                      id="report-issue"
                      name="issue"
                      defaultValue={selectedIssue}
                    >
                      {targetIssues[target.kind].map((issue) => (
                        <option key={issue} value={issue}>
                          {issueLabels[issue]}
                        </option>
                      ))}
                    </select>
                  }
                />
                <Field
                  id="report-details"
                  label="What is incorrect?"
                  hint="Use 20 to 2,000 characters. Describe the incorrect public information and how you found the issue."
                  required
                  control={
                    <textarea
                      className={`${fieldControlStyles} min-h-32 resize-y py-2`}
                      id="report-details"
                      name="details"
                      defaultValue={draft.details ?? ''}
                      required
                      minLength={20}
                      maxLength={2000}
                      rows={6}
                    />
                  }
                />
                <Field
                  id="report-correction"
                  label="Suggested correction (optional)"
                  control={
                    <textarea
                      className={`${fieldControlStyles} min-h-20 resize-y py-2`}
                      id="report-correction"
                      name="suggestedCorrection"
                      defaultValue={draft.suggestedCorrection ?? ''}
                      maxLength={500}
                      rows={3}
                    />
                  }
                />
                <Field
                  id="report-evidence"
                  label="Evidence link (optional)"
                  control={
                    <input
                      className={fieldControlStyles}
                      id="report-evidence"
                      name="evidenceUrl"
                      type="url"
                      pattern="https://.*"
                      maxLength={2048}
                      defaultValue={draft.evidenceUrl ?? ''}
                    />
                  }
                />
                <label className="flex min-h-touch items-start gap-3 text-small leading-snug">
                  <input
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                    type="checkbox"
                    name="confirmReport"
                    value="yes"
                    required
                  />
                  <span className="text-ink">
                    I am reporting an issue with this specific record.
                  </span>
                </label>
                <p className="text-small text-muted">
                  You can submit five reports per rolling 24 hours, with one pending report per
                  record and issue. A price report immediately marks the current price disputed,
                  while other details change after administrator review.
                </p>
                <Button
                  type="submit"
                  variant="primary"
                  className="sm:w-fit"
                  disabled={data.access !== 'allowed'}
                >
                  Submit report
                </Button>
              </form>
            </Card>
          </>
        ) : (
          <Card as="section" className="flex flex-col gap-3">
            <h2 className="font-display text-h2 font-bold text-ink">Choose a record to report</h2>
            <p className="text-small text-muted">
              Use the report link for a published provider, branch, or service listing.
            </p>
            <ButtonLink href="/find" variant="primary" className="self-start">
              Browse services
            </ButtonLink>
            {draft.details && (
              <>
                <h3 className="font-display text-h3 font-semibold text-ink">Your report text</h3>
                <p className="report-prose whitespace-pre-wrap rounded-sm bg-surface-sunken p-3 text-small text-ink [overflow-wrap:anywhere]">
                  {draft.details}
                </p>
              </>
            )}
            {draft.suggestedCorrection && (
              <p className="report-prose text-small text-ink [overflow-wrap:anywhere]">
                Suggested correction: {draft.suggestedCorrection}
              </p>
            )}
            {draft.evidenceUrl && (
              <p className="report-prose text-small text-ink [overflow-wrap:anywhere]">
                Evidence link: {draft.evidenceUrl}
              </p>
            )}
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
