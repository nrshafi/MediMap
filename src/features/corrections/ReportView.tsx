import type { ReactNode } from 'react';
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
import { ui } from '../../ui/styles';

export type ReportPageData = {
  target: ReportTarget | null;
  access: 'allowed' | 'sign_in' | 'expired' | 'unavailable';
  receipt: ReportReceipt | null;
  error: keyof typeof reportMessages | null;
};

const panel = `grid min-w-0 gap-3 rounded-md border border-border bg-surface p-5 text-sm leading-relaxed [overflow-wrap:anywhere]`;
const panelTitle = ui.heading2;
const prose = 'report-prose whitespace-pre-wrap [overflow-wrap:anywhere]';
const link = 'inline-flex min-h-touch items-center font-medium text-primary hover:underline';
const hint = 'text-sm text-muted';
const textarea = `${ui.input} resize-y py-2`;

function priceLabel(minor: number): string {
  const value = BigInt(minor);
  return `BDT ${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

function Notice({
  title,
  role,
  children,
}: {
  title: string;
  role?: 'alert' | 'status';
  children: ReactNode;
}) {
  const alert = role === 'alert';
  return (
    <section
      role={role}
      className={`grid gap-1 rounded-md border p-4 text-sm leading-relaxed [overflow-wrap:anywhere] ${
        alert ? 'border-error/40 bg-error-soft text-error' : 'border-border bg-surface text-ink'
      }`}
    >
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
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
    <section className={panel} aria-labelledby={headingId}>
      <h2 id={headingId} className={panelTitle}>
        {receipt ? 'Details at submission' : 'Selected record'}
      </h2>
      <p>
        <strong className="font-semibold">{target.providerName}</strong>
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
      {target.providerServiceName && <p>Provider label: {target.providerServiceName}</p>}
      {target.address && <p>{target.address}</p>}
      {target.kind === 'listing' && (
        <p>
          {receipt ? 'Reported price' : 'Current price'}:{' '}
          {target.price
            ? `${priceLabel(target.price.amountMinor)} · ${target.price.status}`
            : 'Unknown'}
        </p>
      )}
      {target.kind !== 'listing' && (
        <p>
          Telephone: {target.phone ?? 'Unknown'}
          <br />
          Website: {target.website ?? 'Unknown'}
        </p>
      )}
      {target.kind === 'branch' && (
        <details>
          <summary className="min-h-touch cursor-pointer py-2.5 font-semibold text-primary">
            Usual weekly hours · Asia/Dhaka
          </summary>
          {target.openingHours ? (
            <ul>
              {weekDays.map((day) => (
                <li key={day}>
                  {day}: {dayHoursLabel(target.openingHours?.days[day] ?? null)}
                </li>
              ))}
            </ul>
          ) : (
            <p>Opening hours unknown.</p>
          )}
        </details>
      )}
    </section>
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
      <SiteHeader>
        <a
          href="/find"
          className="inline-flex min-h-touch items-center rounded-sm px-3 hover:bg-white/10"
        >
          Find services
        </a>
      </SiteHeader>
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-5 px-4 py-6 sm:px-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Data corrections
          </p>
          <h1 className={`${ui.heading1} mt-1`}>Report incorrect information</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Describe an issue with the published provider, branch, or diagnostic listing so an
            administrator can review it.
          </p>
        </div>
        {data.error && (
          <Notice
            role="alert"
            title={data.error === 'not_found' ? 'Record unavailable' : 'Your report was not saved'}
          >
            <p>{reportMessages[data.error]}</p>
          </Notice>
        )}
        {data.receipt ? (
          <>
            <Notice role="status" title="Report submitted">
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
            <TargetDetails target={data.receipt.target} receipt />
            <section className={panel}>
              <h2 className={panelTitle}>Your submitted information</h2>
              <p>{issueLabels[data.receipt.issue]}</p>
              <p className={prose}>{data.receipt.details}</p>
              {data.receipt.suggestedCorrection && (
                <p className={prose}>Suggested correction: {data.receipt.suggestedCorrection}</p>
              )}
              {data.receipt.evidenceUrl && (
                <a
                  className={link}
                  href={data.receipt.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Your evidence link
                </a>
              )}
            </section>
          </>
        ) : (
          <>
            {target && <TargetDetails target={target} />}
            {data.access === 'sign_in' || data.access === 'expired' ? (
              <Notice
                title={data.access === 'expired' ? 'Session expired' : 'Sign in to submit a report'}
              >
                <p>Use your account to submit this correction.</p>
                <a
                  className={link}
                  href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}&reason=${data.access === 'expired' ? 'expired' : 'required'}`}
                >
                  Sign in with Google
                </a>
              </Notice>
            ) : (
              data.access === 'unavailable' && (
                <p className={ui.notice}>
                  Reporting is unavailable. Your typed details remain below if you need to copy
                  them.
                </p>
              )
            )}
            {target ? (
              <section className={panel} aria-labelledby="report-form-title">
                <h2 id="report-form-title" className={panelTitle}>
                  Report details
                </h2>
                <form method="post" action="/report/submit" className="grid gap-4">
                  <input type="hidden" name="target" value={target.kind} />
                  <input type="hidden" name="id" value={target.id} />
                  <input type="hidden" name="observedRevision" value={target.revision} />
                  <input type="hidden" name="observedPriceId" value={target.price?.id ?? ''} />
                  <div className={ui.label}>
                    <label htmlFor="report-issue">Issue type</label>
                    <select
                      className={ui.input}
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
                  </div>
                  <div className={ui.label}>
                    <label htmlFor="report-details">What is incorrect?</label>
                    <textarea
                      className={textarea}
                      id="report-details"
                      name="details"
                      defaultValue={draft.details ?? ''}
                      required
                      minLength={20}
                      maxLength={2000}
                      rows={6}
                    />
                    <p className={`${hint} font-normal`}>
                      Use 20 to 2,000 characters. Describe the incorrect public information and how
                      you found the issue.
                    </p>
                  </div>
                  <div className={ui.label}>
                    <label htmlFor="report-correction">Suggested correction (optional)</label>
                    <textarea
                      className={textarea}
                      id="report-correction"
                      name="suggestedCorrection"
                      defaultValue={draft.suggestedCorrection ?? ''}
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                  <div className={ui.label}>
                    <label htmlFor="report-evidence">Evidence link (optional)</label>
                    <input
                      className={ui.input}
                      id="report-evidence"
                      name="evidenceUrl"
                      type="url"
                      pattern="https://.*"
                      maxLength={2048}
                      defaultValue={draft.evidenceUrl ?? ''}
                    />
                  </div>
                  <label className="flex min-h-touch items-start gap-3 text-sm leading-snug">
                    <input
                      className="mt-0.5 size-5 shrink-0 accent-primary"
                      type="checkbox"
                      name="confirmReport"
                      value="yes"
                      required
                    />
                    <span>I am reporting an issue with this specific record.</span>
                  </label>
                  <p className={hint}>
                    You can submit five reports per rolling 24 hours, with one pending report per
                    record and issue.
                  </p>
                  <p className={hint}>
                    A price report immediately marks the current price disputed. Other public
                    details change only after administrator review.
                  </p>
                  <button
                    className={`${ui.buttonPrimary} sm:w-fit`}
                    type="submit"
                    disabled={data.access !== 'allowed'}
                  >
                    Submit report
                  </button>
                </form>
              </section>
            ) : (
              <section className={panel}>
                <h2 className={panelTitle}>Choose a record to report</h2>
                <p>Use the report link for a published provider, branch, or service listing.</p>
                <a className={link} href="/discovery">
                  Browse services
                </a>
                {draft.details && (
                  <>
                    <h3 className="font-bold text-ink">Your report text</h3>
                    <p className={prose}>{draft.details}</p>
                  </>
                )}
                {draft.suggestedCorrection && (
                  <p className={prose}>Suggested correction: {draft.suggestedCorrection}</p>
                )}
                {draft.evidenceUrl && <p className={prose}>Evidence link: {draft.evidenceUrl}</p>}
              </section>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
