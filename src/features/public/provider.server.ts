export async function reserveMappingRequest(db: D1Database, now = Date.now()) {
  await db.prepare('DELETE FROM mapping_budget WHERE expires_at<=?').bind(now).run();
  const day = new Date(now).toISOString().slice(0, 10),
    second = Math.floor(now / 1000);
  const results = await db.batch([
    db
      .prepare(
        'INSERT INTO mapping_budget(bucket,requests,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET requests=requests+1 WHERE requests<600 RETURNING requests',
      )
      .bind(`day:${day}`, Date.parse(`${day}T00:00:00Z`) + 86400000),
    db
      .prepare(
        'INSERT INTO mapping_budget(bucket,requests,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET requests=requests+1 WHERE requests<2 RETURNING requests',
      )
      .bind(`second:${second}`, (second + 1) * 1000),
  ]);
  return results.every((result) => result.results.length === 1);
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
