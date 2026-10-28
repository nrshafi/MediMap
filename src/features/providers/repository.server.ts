import type { D1PreparedStatement } from '@cloudflare/workers-types';
import { catalogId, record, type Page, type CatalogQuery } from '../catalog/contracts';
import {
  contactPhone,
  contactWebsite,
  providerQuery,
  ProviderEditError,
  type ProviderRecord,
  type BranchRecord,
  type ProviderManagement,
  type ProviderEdit,
  type ContactSource,
} from './contracts';
import { storedHours } from './hours';

function provider(value: unknown): ProviderRecord {
  const row = record(value);
  if (
    typeof row.name !== 'string' ||
    !row.name.trim() ||
    (row.active !== 0 && row.active !== 1) ||
    typeof row.revision !== 'number' ||
    !Number.isSafeInteger(row.revision) ||
    row.revision < 1
  )
    throw new Error('Invalid stored provider');
  return {
    id: catalogId(row.id),
    name: row.name,
    phone: contactPhone(row.phone),
    website: contactWebsite(row.website),
    active: row.active === 1,
    revision: row.revision,
  };
}
function branch(value: unknown): BranchRecord {
  const row = record(value);
  if (
    typeof row.address !== 'string' ||
    !row.address.trim() ||
    (row.latitude !== null &&
      (typeof row.latitude !== 'number' ||
        !Number.isFinite(row.latitude) ||
        Math.abs(row.latitude) > 90)) ||
    (row.longitude !== null &&
      (typeof row.longitude !== 'number' ||
        !Number.isFinite(row.longitude) ||
        Math.abs(row.longitude) > 180)) ||
    (row.latitude === null) !== (row.longitude === null)
  )
    throw new Error('Invalid stored branch');
  return {
    ...provider(value),
    providerId: catalogId(row.provider_id),
    address: row.address,
    alternativePhone: contactPhone(row.alternative_phone),
    latitude: row.latitude,
    longitude: row.longitude,
    contactSourceId: row.contact_source_id === null ? null : catalogId(row.contact_source_id),
    openingHours: storedHours(row.opening_hours),
  };
}
function source(value: unknown): ContactSource {
  const row = record(value);
  const url = contactWebsite(row.url);
  if (!url || !url.startsWith('https://')) throw new Error('Invalid stored contact source');
  return { id: catalogId(row.id), providerId: catalogId(row.provider_id), url };
}
function page<T extends { id: string }>(
  rows: unknown[],
  query: CatalogQuery,
  decode: (value: unknown) => T,
): Page<T> {
  const items = rows.slice(0, query.limit).map(decode);
  return { items, nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null };
}
const providerColumns = 'id, name, phone, website, active, revision';
const branchColumns = `${providerColumns}, provider_id, address, alternative_phone, latitude, longitude, contact_source_id, opening_hours`;
const selectedProvider = 'COALESCE(?, (SELECT provider_id FROM branches WHERE id = ?))';

export class ProviderRepository {
  constructor(private readonly db: D1Database) {}
  async read(input: unknown): Promise<ProviderManagement> {
    const query = providerQuery(input);
    const [providers, branches, selectedBranch, providerRow, sources, selectedSource] =
      await this.db.batch<unknown>([
        this.db
          .prepare(`SELECT ${providerColumns} FROM providers WHERE id > ? ORDER BY id LIMIT ?`)
          .bind(query.providers.after ?? '', query.providers.limit + 1),
        this.db
          .prepare(
            `SELECT ${branchColumns} FROM branches WHERE (? IS NULL OR provider_id = ?) AND id > ? ORDER BY id LIMIT ?`,
          )
          .bind(
            query.providerId ?? null,
            query.providerId ?? null,
            query.branches.after ?? '',
            query.branches.limit + 1,
          ),
        this.db
          .prepare(`SELECT ${branchColumns} FROM branches WHERE id = ?`)
          .bind(query.branchId ?? ''),
        this.db
          .prepare(`SELECT ${providerColumns} FROM providers WHERE id = ${selectedProvider}`)
          .bind(query.providerId ?? null, query.branchId ?? ''),
        this.db
          .prepare(
            `SELECT id, provider_id, url FROM sources WHERE kind = 'official_contact' AND provider_id = ${selectedProvider} AND id > ? ORDER BY id LIMIT ?`,
          )
          .bind(
            query.providerId ?? null,
            query.branchId ?? '',
            query.sources.after ?? '',
            query.sources.limit + 1,
          ),
        this.db
          .prepare(
            "SELECT s.id, s.provider_id, s.url FROM sources s JOIN branches b ON b.contact_source_id = s.id AND b.provider_id = s.provider_id WHERE b.id = ? AND s.kind = 'official_contact'",
          )
          .bind(query.branchId ?? ''),
      ]);
    const currentBranch = selectedBranch.results[0] ? branch(selectedBranch.results[0]) : null;
    if (currentBranch && query.providerId && currentBranch.providerId !== query.providerId)
      throw new ProviderEditError('invalid_request');
    return {
      providers: page(providers.results, query.providers, provider),
      branches: page(branches.results, query.branches, branch),
      provider: providerRow.results[0] ? provider(providerRow.results[0]) : null,
      branch: currentBranch,
      sources: page(sources.results, query.sources, source),
      selectedSource: selectedSource.results[0] ? source(selectedSource.results[0]) : null,
    };
  }

  async save(edit: ProviderEdit): Promise<void> {
    let statement: D1PreparedStatement;
    if (edit.entity === 'provider') {
      statement =
        edit.mode === 'create'
          ? this.db
              .prepare(
                'INSERT INTO providers(id, name, search_key, phone, website, active) VALUES (?, ?, ?, ?, ?, ?)',
              )
              .bind(
                edit.id,
                edit.name,
                edit.searchKey,
                edit.phone,
                edit.website,
                Number(edit.active),
              )
          : this.db
              .prepare(
                'UPDATE providers SET name = ?, search_key = ?, phone = ?, website = ?, active = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
              )
              .bind(
                edit.name,
                edit.searchKey,
                edit.phone,
                edit.website,
                Number(edit.active),
                edit.id,
                edit.revision,
              );
    } else {
      const values = [
        edit.name,
        edit.searchKey,
        edit.address,
        edit.phone,
        edit.alternativePhone,
        edit.website,
        edit.latitude,
        edit.longitude,
        edit.contactSourceId,
        edit.openingHours === null ? null : JSON.stringify(edit.openingHours),
        Number(edit.active),
      ];
      statement =
        edit.mode === 'create'
          ? this.db
              .prepare(
                'INSERT INTO branches(name, search_key, address, phone, alternative_phone, website, latitude, longitude, contact_source_id, opening_hours, active, id, provider_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              )
              .bind(...values, edit.id, edit.providerId)
          : this.db
              .prepare(
                'UPDATE branches SET name = ?, search_key = ?, address = ?, phone = ?, alternative_phone = ?, website = ?, latitude = ?, longitude = ?, contact_source_id = ?, opening_hours = ?, active = ?, revision = revision + 1 WHERE id = ? AND provider_id = ? AND revision = ?',
              )
              .bind(...values, edit.id, edit.providerId, edit.revision);
    }
    try {
      const result = await statement.run();
      if (result.meta.changes !== 1) throw new ProviderEditError('conflict');
    } catch (error) {
      if (error instanceof ProviderEditError) throw error;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('UNIQUE constraint failed')) throw new ProviderEditError('duplicate');
      if (
        message.includes('FOREIGN KEY constraint failed') ||
        message.includes('provider_invalid_record')
      )
        throw new ProviderEditError('invalid_request');
      throw new ProviderEditError('unavailable');
    }
  }
}
