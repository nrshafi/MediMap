import { catalogId, record } from '../catalog/contracts';
export async function reportReview(db: D1Database, account: string, value: unknown) {
  const input = record(value);
  const id = catalogId(input.review);
  if (
    typeof input.reason !== 'string' ||
    input.reason.trim().length < 20 ||
    input.reason.trim().length > 1000
  )
    throw new Error('Provide 20 to 1000 characters.');
  await db
    .prepare(
      'INSERT INTO review_abuse_reports(id,review_id,reporter_id,reason,created_at) VALUES(?,?,?,?,?)',
    )
    .bind(crypto.randomUUID(), id, account, input.reason.trim(), Date.now())
    .run();
}
export async function moderateReview(db: D1Database, actor: string, value: unknown) {
  const input = record(value);
  const id = catalogId(input.review);
  if (
    !['hide', 'restore', 'remove'].includes(String(input.action)) ||
    typeof input.reason !== 'string' ||
    input.reason.trim().length < 20 ||
    input.reason.trim().length > 1000 ||
    !Number.isSafeInteger(Number(input.revision)) ||
    Number(input.revision) < 1
  )
    throw new Error('Invalid moderation decision.');
  await db
    .prepare(
      'INSERT INTO review_moderation(id,review_id,actor_id,action,reason,previous_revision,created_at) VALUES(?,?,?,?,?,?,?)',
    )
    .bind(
      crypto.randomUUID(),
      id,
      actor,
      input.action,
      input.reason.trim(),
      Number(input.revision),
      Date.now(),
    )
    .run();
}
