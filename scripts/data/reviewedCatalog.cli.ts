import { readReviewedInputs, seedFile } from './reviewedCatalog';
const { catalog, inventory } = await readReviewedInputs();
const artifacts: [string, string][] = [
  ['data/catalog/reviewed-catalog.json', JSON.stringify(catalog, null, 2) + '\n'],
  ['data/catalog/publication-inventory.json', JSON.stringify(inventory, null, 2) + '\n'],
  ['seeds/reviewed-catalog.sql', seedFile(catalog)],
];
for (const [path, contents] of artifacts) {
  if (process.argv.includes('--write')) await Bun.write(path, contents);
  else if ((await Bun.file(path).text()) !== contents)
    throw new Error(`Stale generated publication artifact: ${path}`);
}
console.log(JSON.stringify(inventory.summary, null, 2));
