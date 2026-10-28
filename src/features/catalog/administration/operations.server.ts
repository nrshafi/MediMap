import { requireAdministrator, authFailure } from '../../authentication/server/access.server';
import { requireSameOriginPost } from '../../authentication/server/config.server';
import { AuthError } from '../../authentication/contracts';
import { catalogReadFailure } from '../server/reads.server';
import { CatalogAdministrationRepository } from './repository.server';
import { CatalogEditError, parseEdit, managementHref } from './contracts';

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
  const input: Record<string, string> = {};
  let target: Record<string, string | undefined> = {};
  try {
    if (
      request.headers.get('content-type')?.split(';')[0].trim() !==
      'application/x-www-form-urlencoded'
    )
      throw new CatalogEditError('invalid_request');
    const reader = request.body?.getReader();
    if (!reader) throw new CatalogEditError('invalid_request');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 16384) {
          await reader.cancel();
          throw new CatalogEditError('invalid_request');
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    const form = new URLSearchParams(new TextDecoder('utf-8', { fatal: true }).decode(body));
    for (const [key, value] of form) {
      if (Object.hasOwn(input, key)) throw new CatalogEditError('invalid_request');
      Object.defineProperty(input, key, { value, enumerable: true });
    }
    const edit = parseEdit(input);
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
        : error instanceof AuthError
          ? 'invalid_request'
          : 'unavailable';
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: managementHref({ ...target, code }) },
    });
  }
}
