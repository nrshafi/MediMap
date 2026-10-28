export class InvalidAdministrationForm extends Error {}

export async function readAdministrationForm(request: Request): Promise<Record<string, string>> {
  if (
    request.headers.get('content-type')?.split(';')[0].trim() !==
    'application/x-www-form-urlencoded'
  )
    throw new InvalidAdministrationForm();
  const reader = request.body?.getReader();
  if (!reader) throw new InvalidAdministrationForm();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new InvalidAdministrationForm();
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
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    throw new InvalidAdministrationForm();
  }
  const input: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(text)) {
    if (Object.hasOwn(input, key)) throw new InvalidAdministrationForm();
    Object.defineProperty(input, key, { value, enumerable: true });
  }
  return input;
}
