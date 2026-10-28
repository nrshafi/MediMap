import { AuthStore } from '../authentication/server/store.server';
import { readAuthCookie } from '../authentication/server/cookies.server';
import { requireUser, authFailure } from '../authentication/server/access.server';
import { requireSameOriginPost } from '../authentication/server/config.server';
import { AuthError } from '../authentication/contracts';
import {
  InvalidAdministrationForm,
  readAdministrationForm,
} from '../administration/server/form.server';
import { readReportTarget } from './targets.server';
import { CorrectionRepository } from './repository.server';
import {
  parseReport,
  reportTargetQuery,
  ReportError,
  type ReportDraft,
  type ReportTarget,
} from './contracts';
import type { ReportPageData } from './ReportView';

export async function reportPage(
  request: Request,
  db: D1Database,
  input: unknown,
): Promise<ReportPageData> {
  try {
    const query =
      typeof input === 'object' && input !== null ? Object.fromEntries(Object.entries(input)) : {};
    const session = await new AuthStore(db).session(readAuthCookie(request, 'session'));
    const access =
      session.status === 'authenticated'
        ? 'allowed'
        : session.status === 'expired'
          ? 'expired'
          : 'sign_in';
    if (query.submitted !== undefined) {
      if (session.status !== 'authenticated')
        return { target: null, receipt: null, access, error: null };
      const receipt = await new CorrectionRepository(db).ownReceipt(
        query.submitted,
        session.user.id,
      );
      return {
        target: receipt?.target ?? null,
        receipt,
        access,
        error: receipt ? null : 'not_found',
      };
    }
    if (query.target === undefined && query.id === undefined)
      return { target: null, receipt: null, access, error: null };
    const target = await readReportTarget(db, query);
    return { target, receipt: null, access, error: target ? null : 'not_found' };
  } catch (error) {
    return {
      target: null,
      receipt: null,
      access: 'unavailable',
      error: error instanceof ReportError ? error.code : 'unavailable',
    };
  }
}
export async function submitReport(request: Request, db: D1Database, environment: object) {
  let target: ReportTarget | null = null;
  let draft: ReportDraft = {};
  let raw: Record<string, string> = {};
  try {
    const session = await requireUser(request, db);
    requireSameOriginPost(request, environment);
    raw = await readAdministrationForm(request, 65536);
    draft = {
      issue: raw.issue,
      details: raw.details,
      suggestedCorrection: raw.suggestedCorrection,
      evidenceUrl: raw.evidenceUrl,
    };
    target = await readReportTarget(db, reportTargetQuery(raw));
    const input = parseReport(raw);
    const result = await new CorrectionRepository(db).submit(input, session.user.id);
    return { ok: true, id: result.id } as const;
  } catch (error) {
    if (error instanceof AuthError && error.code === 'invalid_request') {
      return {
        ok: false,
        status: 400,
        data: {
          target: null,
          receipt: null,
          access: 'unavailable',
          error: 'invalid_request',
        } satisfies ReportPageData,
        draft,
      } as const;
    }
    if (error instanceof ReportError || error instanceof InvalidAdministrationForm) {
      const code = error instanceof ReportError ? error.code : 'invalid_request';
      if (code === 'target_changed')
        target = await readReportTarget(db, reportTargetQuery(raw)).catch(() => null);
      return {
        ok: false,
        status:
          code === 'rate_limited'
            ? 429
            : code === 'duplicate' || code === 'target_changed'
              ? 409
              : code === 'not_found'
                ? 404
                : code === 'unavailable'
                  ? 503
                  : 400,
        data: { target, receipt: null, access: 'allowed', error: code } satisfies ReportPageData,
        draft,
      } as const;
    }
    const failure = authFailure(error);
    // Retain same-origin text when a session expires before submission.
    try {
      requireSameOriginPost(request, environment);
      raw = await readAdministrationForm(request, 65536);
      draft = {
        issue: raw.issue,
        details: raw.details,
        suggestedCorrection: raw.suggestedCorrection,
        evidenceUrl: raw.evidenceUrl,
      };
      target = await readReportTarget(db, reportTargetQuery(raw));
    } catch {
      // Access remains denied if the draft cannot be recovered.
    }
    const access =
      failure.code === 'expired'
        ? 'expired'
        : failure.code === 'unauthenticated'
          ? 'sign_in'
          : 'unavailable';
    return {
      ok: false,
      status: access === 'unavailable' ? 503 : 401,
      data: { target, receipt: null, access, error: 'unavailable' } satisfies ReportPageData,
      draft,
    } as const;
  }
}
