import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import {
  branches,
  sources,
  clean,
  parseAddin,
  parseBmu,
  parseFarabi,
  parseHolyFamily,
  parseMogh,
  sourceUpdatedDate,
  type PublishedRow,
} from './hospitalTariffs';

export type EvidenceSource = {
  id: string;
  branchId: string;
  url: string;
  retrievedAt: string;
  sha256: string;
  sourceUpdatedDate: string | null;
  currencyEvidence: 'explicit_taka_header' | 'explicit_taka_symbol' | null;
  currencyScope: string;
  addressEvidence: string | null;
  rows: PublishedRow[];
};
export type EvidenceFile = {
  schemaVersion: 1;
  capturedAt: string;
  sources: EvidenceSource[];
  failures: { id: string; url: string; checkedAt: string; reason: string }[];
};
export function visibleText(html: string): string {
  const window = new Window({
    settings: {
      enableJavaScriptEvaluation: false,
      disableJavaScriptFileLoading: true,
      enableCSSFileLoading: false,
      enableImageFileLoading: false,
    },
  });
  const document = new window.DOMParser().parseFromString(html, 'text/html');
  for (const element of document.querySelectorAll('script,style,noscript')) element.remove();
  return clean(document.body.textContent);
}
export function parseHolyCovid(html: string): PublishedRow[] {
  const text = visibleText(html);
  const pcr = /RT-PCR TEST for Covid-19\s*Test Rate:\s*(\d+)\s*TK/i.exec(text);
  const antigen = /Covid-19 Rapid Antigen Test\s*Test Rate:\s*(\d+)\s*TK/i.exec(text);
  if (!pcr || !antigen || !text.includes('Home collection service charge:500 tk'))
    throw new Error('Missing item-specific Holy Family Tk labels');
  return [
    {
      sourceId: 'holy-family-covid',
      sourceRow: '1',
      department: 'COVID-19 diagnostics',
      providerServiceName: 'RT-PCR TEST for Covid-19',
      publishedPrice: pcr[1],
    },
    {
      sourceId: 'holy-family-covid',
      sourceRow: '2',
      department: 'COVID-19 diagnostics',
      providerServiceName: 'Covid-19 Rapid Antigen Test',
      publishedPrice: antigen[1],
    },
  ];
}
export async function captureEvidence(): Promise<EvidenceFile> {
  const definitions = [
    ...sources,
    {
      id: 'holy-family-covid',
      url: 'https://holyfamily.com.bd/about/covid-information',
      branchId: 'holy-family-eskatan',
      kind: 'holy-covid' as const,
    },
  ];
  const result: EvidenceFile = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    sources: [],
    failures: [],
  };
  await mkdir('.bun-tmp/reviewed-catalog', { recursive: true });
  // Limit concurrent public-page requests. No authenticated requests or form submissions occur.
  for (let start = 0; start < definitions.length; start += 2) {
    const batch = definitions.slice(start, start + 2);
    const captures = await Promise.allSettled(
      batch.map(async (definition) => {
        const response = await fetch(definition.url, { signal: AbortSignal.timeout(30000) });
        if (
          !response.ok ||
          !response.headers.get('content-type')?.includes('text/html') ||
          new URL(response.url).hostname !== new URL(definition.url).hostname
        )
          throw new Error('Official HTML unavailable or redirected to another host');
        const bytes = new Uint8Array(await response.arrayBuffer());
        const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        const text = visibleText(html);
        const rows =
          definition.kind === 'addin' && definition.department
            ? parseAddin(html, definition.id, definition.department)
            : definition.kind === 'mogh'
              ? parseMogh(html, definition.id)
              : definition.kind === 'holy-family'
                ? parseHolyFamily(html, definition.id)
                : definition.kind === 'bmu'
                  ? parseBmu(html, definition.id)
                  : definition.kind === 'farabi'
                    ? parseFarabi(html, definition.id)
                    : definition.kind === 'holy-covid'
                      ? parseHolyCovid(html)
                      : [];
        const address =
          definition.kind === 'contact'
            ? branches.find((branch) => branch.id === definition.branchId)?.address
            : null;
        if (definition.kind === 'contact' && (!address || !text.includes(address)))
          throw new Error('Official branch address changed or unavailable');
        if (definition.kind !== 'contact' && !rows.length)
          throw new Error('No supported tariff rows');
        await writeFile(`.bun-tmp/reviewed-catalog/${definition.id}.html`, bytes);
        return {
          id: definition.id,
          branchId: definition.branchId,
          url: definition.url,
          retrievedAt: new Date().toISOString(),
          sha256: createHash('sha256').update(bytes).digest('hex'),
          sourceUpdatedDate: sourceUpdatedDate(html),
          currencyEvidence:
            definition.kind === 'addin' || definition.kind === 'holy-covid'
              ? ('explicit_taka_header' as const)
              : definition.kind === 'mogh'
                ? ('explicit_taka_symbol' as const)
                : null,
          currencyScope:
            definition.kind === 'holy-covid'
              ? 'Only the two explicitly labelled Tk test rates; exclude the separate home-collection charge.'
              : definition.kind === 'addin'
                ? 'Explicit Taka/Tk service-charge label.'
                : definition.kind === 'mogh'
                  ? 'Visible taka symbol on every item, matching directory metadata.'
                  : 'No item-level currency confirmation.',
          addressEvidence: address ?? null,
          rows,
        };
      }),
    );
    for (let i = 0; i < captures.length; i++) {
      const capture = captures[i];
      const definition = batch[i];
      if (capture.status === 'fulfilled') {
        result.sources.push(capture.value);
        console.log(`${definition.id}: ${capture.value.rows.length} rows`);
      } else {
        result.failures.push({
          id: definition.id,
          url: definition.url,
          checkedAt: new Date().toISOString(),
          reason:
            capture.reason instanceof Error ? capture.reason.message : 'Source capture failed',
        });
        console.log(`${definition.id}: unavailable`);
      }
    }
  }
  return result;
}
