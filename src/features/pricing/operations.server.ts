import { requireAdministrator, authFailure } from '../authentication/server/access.server';
import { requireSameOriginPost } from '../authentication/server/config.server';
import {
  readAdministrationForm,
  InvalidAdministrationForm,
} from '../administration/server/form.server';
import { catalogReadFailure } from '../catalog/server/reads.server';
import { PricingRepository } from './repository.server';
import { PricingError, parsePricingEdit, pricingHref } from './contracts';

export async function readPricing(request: Request, db: D1Database, input: unknown) {
  try {
    await requireAdministrator(request, db);
  } catch (error) {
    return authFailure(error);
  }
  try {
    return { ok: true, data: await new PricingRepository(db).read(input) } as const;
  } catch (error) {
    return catalogReadFailure(error);
  }
}
export async function writePricing(request: Request, db: D1Database, environment: object) {
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
  let actor: string;
  try {
    actor = (await requireAdministrator(request, db)).user.id;
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
    const edit = parsePricingEdit(await readAdministrationForm(request));
    if (edit.entity === 'source') target = { provider: edit.providerId };
    else if (edit.entity === 'price' || edit.mode === 'update') target = { listing: edit.id };
    const selection = await new PricingRepository(db).save(edit, actor);
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: pricingHref({ ...selection, code: 'saved' }) },
    });
  } catch (error) {
    const code =
      error instanceof PricingError
        ? error.code
        : error instanceof InvalidAdministrationForm
          ? 'invalid_request'
          : 'unavailable';
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: pricingHref({ ...target, code }) },
    });
  }
}
