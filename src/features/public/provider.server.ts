export const DAILY_MAPPING_LIMIT = 600;
export const PER_SECOND_MAPPING_LIMIT = 4;

export async function reserveMappingRequest(db: Pick<D1Database, 'prepare'>, now = Date.now()) {
  await db.prepare('DELETE FROM mapping_budget WHERE expires_at<=?').bind(now).run();
  const day = new Date(now).toISOString().slice(0, 10),
    second = Math.floor(now / 1000);
  const secondResult = await db
    .prepare(
      'INSERT INTO mapping_budget(bucket,requests,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET requests=requests+1 WHERE requests<? RETURNING requests',
    )
    .bind(`second:${second}`, (second + 1) * 1000, PER_SECOND_MAPPING_LIMIT)
    .all<{ requests: number }>();
  if (secondResult.results.length !== 1) return false;
  // If the daily bucket refuses, the per-second increment stays and expires after one second.
  const dayResult = await db
    .prepare(
      'INSERT INTO mapping_budget(bucket,requests,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET requests=requests+1 WHERE requests<? RETURNING requests',
    )
    .bind(`day:${day}`, Date.parse(`${day}T00:00:00Z`) + 86400000, DAILY_MAPPING_LIMIT)
    .all<{ requests: number }>();
  return dayResult.results.length === 1;
}
export async function providerJson(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) throw new Error('Provider unavailable');
  const reader = response.body.getReader();
  let size = 0;
  let text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new Error('Provider response too large');
      }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } finally {
    reader.releaseLock();
  }
}
