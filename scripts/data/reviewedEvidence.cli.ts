import { captureEvidence } from './reviewedEvidence';
if (!process.argv.includes('--fetch'))
  throw new Error(
    'Use --fetch to capture current official evidence. Existing research files remain unchanged.',
  );
const result = await captureEvidence();
if (
  !result.sources.some((source) => source.id === 'mogh-tests') ||
  !result.sources.some((source) => source.id === 'addin-contact')
)
  throw new Error('Required official evidence is unavailable. Existing evidence was retained.');
await Bun.write('data/catalog/reviewed-evidence.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ sources: result.sources.length, failures: result.failures.length }));
