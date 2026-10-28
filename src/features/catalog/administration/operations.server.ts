import { requireAdministrator, authFailure } from '../../authentication/server/access.server';
import { requireSameOriginPost } from '../../authentication/server/config.server';
import { AuthError } from '../../authentication/contracts';
import { catalogReadFailure } from '../server/reads.server';
import { CatalogAdministrationRepository } from './repository.server';
import { CatalogEditError, parseEdit, managementHref } from './contracts';
import {
  readAdministrationForm,
  InvalidAdministrationForm,
} from '../../administration/server/form.server';

export async function readManagement(request: Request, db: D1Database, input: unknown) {
  try {
    await requireAdministrator(request, db);
  } catch (error) {
    return authFailure(error);
  }
  try {
    return { ok: true, data: await new CatalogAdministrationRepository(db).read(input) } as const;
  } catch (error) {
    return catalogReadFailure(error);
  }
}

export async function writeManagement(request: Request, db: D1Database, environment: object) {
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
  try {
    await requireAdministrator(request, db);
    requireSameOriginPost(request, environment);
  } catch (error) {
    const failure = authFailure(error);
    const status =
      failure.code === 'forbidden'
        ? 403
        : failure.code === 'invalid_request'
          ? 400
          : failure.code === 'unavailable'
            ? 503
            : 401;
    return Response.json(failure, { status, headers });
  }
  let target: Record<string, string | undefined> = {};
  try {
    const edit = parseEdit(await readAdministrationForm(request));
    const selection =
      edit.entity === 'category'
        ? { category: edit.id }
        : { service: edit.entity === 'service' ? edit.id : edit.serviceId };
    if (edit.mode === 'update' || edit.entity === 'alias') target = selection;
    await new CatalogAdministrationRepository(db).save(edit);
    return new Response(null, {
      status: 303,
      headers: {
        ...headers,
        Location: managementHref({
          code: 'saved',
          ...selection,
        }),
      },
    });
  } catch (error) {
    const code =
      error instanceof CatalogEditError
        ? error.code
        : error instanceof AuthError || error instanceof InvalidAdministrationForm
          ? 'invalid_request'
          : 'unavailable';
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: managementHref({ ...target, code }) },
    });
  }
}
