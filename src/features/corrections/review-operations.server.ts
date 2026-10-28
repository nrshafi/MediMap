import { requireAdministrator, authFailure } from '../authentication/server/access.server';
import { ResolutionError } from './review-contracts';
import { ReviewReads } from './review-reads.server';
import { requireSameOriginPost } from '../authentication/server/config.server';
import {
  readAdministrationForm,
  InvalidAdministrationForm,
} from '../administration/server/form.server';
import { ResolutionRepository } from './resolution.server';
import { parseResolution, type ResolutionDraft } from './review-contracts';
import { AuthError } from '../authentication/contracts';

export async function readReview(request: Request, db: D1Database, input: unknown) {
  try {
    await requireAdministrator(request, db);
  } catch (error) {
    return authFailure(error);
  }
  try {
    return { ok: true, data: await new ReviewReads(db).read(input) } as const;
  } catch (error) {
    const failure = error instanceof ResolutionError ? error : new ResolutionError('unavailable');
    return { ok: false, code: failure.code, message: failure.message } as const;
  }
}

export async function writeResolution(request: Request, db: D1Database, environment: object) {
  let draft: ResolutionDraft = {};
  const selection = () => ({ report: draft.reportId, source: draft.sourceId, status: 'all' });
  try {
    const session = await requireAdministrator(request, db);
    requireSameOriginPost(request, environment);
    draft = await readAdministrationForm(request, 65536);
    const input = parseResolution(draft);
    const result = await new ResolutionRepository(db).resolve(input, session.user.id);
    return { ok: true, reportId: result.reportId } as const;
  } catch (error) {
    if (error instanceof ResolutionError || error instanceof InvalidAdministrationForm) {
      const code = error instanceof ResolutionError ? error.code : 'invalid_request';
      return {
        ok: false,
        status:
          code === 'conflict' || code === 'correction_required'
            ? 409
            : code === 'not_found'
              ? 404
              : code === 'unavailable'
                ? 503
                : 400,
        code,
        result: await readReview(request, db, selection()),
        draft,
        search: selection(),
      } as const;
    }
    const failure = authFailure(error);
    if (error instanceof AuthError && error.code !== 'invalid_request') {
      try {
        requireSameOriginPost(request, environment);
        draft = await readAdministrationForm(request, 65536);
      } catch {
        /* Do not recover untrusted or malformed bodies. */
      }
    }
    return {
      ok: false,
      status:
        failure.code === 'invalid_request'
          ? 400
          : failure.code === 'forbidden'
            ? 403
            : failure.code === 'unavailable'
              ? 503
              : 401,
      code: failure.code,
      result: failure,
      draft,
      search: selection(),
    } as const;
  }
}
