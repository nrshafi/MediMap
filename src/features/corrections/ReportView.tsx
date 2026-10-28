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
import './report.css';

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
function TargetDetails({ target, receipt = false }: { target: ReportTarget; receipt?: boolean }) {
  return (
    <section className="report-target" aria-labelledby="report-target-title">
      <h2 id="report-target-title">{receipt ? 'Details at submission' : 'Selected record'}</h2>
      <p>
        <strong>{target.providerName}</strong>
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
          <summary>Usual weekly hours · Asia/Dhaka</summary>
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
    <div className="report-page">
      <header className="report-header">
        <a className="report-brand" href="/">
          MediMap
        </a>
        <a href="/discovery">Browse services</a>
      </header>
      <main>
        <div className="report-title">
          <p className="report-eyebrow">Data corrections</p>
          <h1>Report incorrect information</h1>
          <p>
            Describe an issue with the published provider, branch, or diagnostic listing so an
            administrator can review it.
          </p>
        </div>
        {data.error && (
          <section className="report-notice" role="alert">
            <h2>
              {data.error === 'not_found' ? 'Record unavailable' : 'Your report was not saved'}
            </h2>
            <p>{reportMessages[data.error]}</p>
          </section>
        )}
        {data.receipt ? (
          <>
            <section className="report-notice" role="status">
              <h2>Report submitted</h2>
              <p>Reference: {data.receipt.id}</p>
              <p>Status: {data.receipt.status}</p>
              <p>
                {data.receipt.issue === 'price' && data.receipt.status === 'pending'
                  ? data.receipt.target.price
                    ? 'The reported price is disputed while this report is pending. It does not qualify for default price statistics.'
                    : 'The price remains unknown while this report is pending. It does not qualify for default price statistics.'
                  : 'An administrator reviews the report before changing the published details.'}
              </p>
            </section>
            <TargetDetails target={data.receipt.target} receipt />
            <section className="report-panel">
              <h2>Your submitted information</h2>
              <p>{issueLabels[data.receipt.issue]}</p>
              <p className="report-prose">{data.receipt.details}</p>
              {data.receipt.suggestedCorrection && (
                <p className="report-prose">
                  Suggested correction: {data.receipt.suggestedCorrection}
                </p>
              )}
              {data.receipt.evidenceUrl && (
                <a href={data.receipt.evidenceUrl} target="_blank" rel="noreferrer">
                  Your evidence link
                </a>
              )}
            </section>
          </>
        ) : (
          <>
            {target && <TargetDetails target={target} />}
            {data.access === 'sign_in' || data.access === 'expired' ? (
              <section className="report-notice">
                <h2>
                  {data.access === 'expired' ? 'Session expired' : 'Sign in to submit a report'}
                </h2>
                <p>Use your account to submit this correction.</p>
                <a
                  href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}&reason=${data.access === 'expired' ? 'expired' : 'required'}`}
                >
                  Sign in with Google
                </a>
              </section>
            ) : (
              data.access === 'unavailable' && (
                <p className="report-notice">
                  Reporting is unavailable. Your typed details remain below if you need to copy
                  them.
                </p>
              )
            )}
            {target ? (
              <section className="report-panel" aria-labelledby="report-form-title">
                <h2 id="report-form-title">Report details</h2>
                <form method="post" action="/report/submit" className="report-form">
                  <input type="hidden" name="target" value={target.kind} />
                  <input type="hidden" name="id" value={target.id} />
                  <input type="hidden" name="observedRevision" value={target.revision} />
                  <input type="hidden" name="observedPriceId" value={target.price?.id ?? ''} />
                  <label htmlFor="report-issue">Issue type</label>
                  <select id="report-issue" name="issue" defaultValue={selectedIssue}>
                    {targetIssues[target.kind].map((issue) => (
                      <option key={issue} value={issue}>
                        {issueLabels[issue]}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="report-details">What is incorrect?</label>
                  <textarea
                    id="report-details"
                    name="details"
                    defaultValue={draft.details ?? ''}
                    required
                    minLength={20}
                    maxLength={2000}
                    rows={6}
                  />
                  <p className="report-help">
                    Use 20 to 2,000 characters. Describe the incorrect public information and how
                    you found the issue.
                  </p>
                  <label htmlFor="report-correction">Suggested correction (optional)</label>
                  <textarea
                    id="report-correction"
                    name="suggestedCorrection"
                    defaultValue={draft.suggestedCorrection ?? ''}
                    maxLength={500}
                    rows={3}
                  />
                  <label htmlFor="report-evidence">Evidence link (optional)</label>
                  <input
                    id="report-evidence"
                    name="evidenceUrl"
                    type="url"
                    pattern="https://.*"
                    maxLength={2048}
                    defaultValue={draft.evidenceUrl ?? ''}
                  />
                  <label className="report-confirm">
                    <input type="checkbox" name="confirmReport" value="yes" required />
                    <span>I am reporting an issue with this specific record.</span>
                  </label>
                  <p className="report-help">
                    You can submit five reports per rolling 24 hours, with one pending report per
                    record and issue.
                  </p>
                  <p className="report-help">
                    A price report immediately marks the current price disputed. Other public
                    details change only after administrator review.
                  </p>
                  <button type="submit" disabled={data.access !== 'allowed'}>
                    Submit report
                  </button>
                </form>
              </section>
            ) : (
              <section className="report-panel">
                <h2>Choose a record to report</h2>
                <p>Use the report link for a published provider, branch, or service listing.</p>
                <a href="/discovery">Browse services</a>
                {draft.details && (
                  <>
                    <h3>Your report text</h3>
                    <p className="report-prose">{draft.details}</p>
                  </>
                )}
                {draft.suggestedCorrection && (
                  <p className="report-prose">Suggested correction: {draft.suggestedCorrection}</p>
                )}
                {draft.evidenceUrl && (
                  <p className="report-prose">Evidence link: {draft.evidenceUrl}</p>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <footer className="report-footer">MediMap · Public information corrections</footer>
    </div>
  );
}
