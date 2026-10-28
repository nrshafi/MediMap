import { authFailure, requireAdministrator } from '../authentication/server/access.server';
import { requireSameOriginPost } from '../authentication/server/config.server';
import { catalogReadFailure } from '../catalog/server/reads.server';
import {
  readAdministrationForm,
  InvalidAdministrationForm,
} from '../administration/server/form.server';
import { ProviderRepository } from './repository.server';
import { parseProviderEdit, providersHref, ProviderEditError } from './contracts';

export async function readProviders(request: Request, db: D1Database, input: unknown) {
  try {
    await requireAdministrator(request, db);
  } catch (error) {
    return authFailure(error);
  }
  try {
    return { ok: true, data: await new ProviderRepository(db).read(input) } as const;
  } catch (error) {
    return error instanceof ProviderEditError
      ? ({ ok: false, code: error.code, message: error.message } as const)
      : catalogReadFailure(error);
  }
}
export async function writeProviders(request: Request, db: D1Database, environment: object) {
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
  try {
    await requireAdministrator(request, db);
    requireSameOriginPost(request, environment);
  } catch (error) {
    const failure = authFailure(error);
    return Response.json(failure, {
      status:
        failure.code === 'forbidden'
          ? 403
          : failure.code === 'invalid_request'
            ? 400
            : failure.code === 'unavailable'
              ? 503
              : 401,
      headers,
    });
  }
  let target: Record<string, string | undefined> = {};
  try {
    const edit = parseProviderEdit(await readAdministrationForm(request));
    const selection =
      edit.entity === 'provider'
        ? { provider: edit.id }
        : { provider: edit.providerId, branch: edit.id };
    if (edit.mode === 'update') target = selection;
    else if (edit.entity === 'branch') target = { provider: edit.providerId };
    await new ProviderRepository(db).save(edit);
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: providersHref({ ...selection, code: 'saved' }) },
    });
  } catch (error) {
    const code =
      error instanceof ProviderEditError
        ? error.code
        : error instanceof InvalidAdministrationForm
          ? 'invalid_request'
          : 'unavailable';
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: providersHref({ ...target, code }) },
    });
  }
}
