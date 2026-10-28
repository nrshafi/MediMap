import type { D1PreparedStatement } from '@cloudflare/workers-types';
import { catalogId, record, type CatalogQuery, type Page } from '../contracts';
import {
  CatalogEditError,
  managementQuery,
  type CatalogEdit,
  type CategoryRecord,
  type ServiceRecord,
  type AliasRecord,
  type ManagementData,
} from './contracts';

function category(value: unknown): CategoryRecord {
  const row = record(value);
  if (
    typeof row.name !== 'string' ||
    !row.name.trim() ||
    (row.active !== 0 && row.active !== 1) ||
    typeof row.revision !== 'number' ||
    !Number.isSafeInteger(row.revision) ||
    row.revision < 1
  )
    throw new Error('Invalid stored catalog record');
  return {
    id: catalogId(row.id),
    name: row.name,
    active: row.active === 1,
    revision: row.revision,
  };
}
function service(value: unknown): ServiceRecord {
  return { ...category(value), categoryId: catalogId(record(value).category_id) };
}
function alias(value: unknown): AliasRecord {
  const row = record(value);
  if (row.language !== 'en' && row.language !== 'bn') throw new Error('Invalid stored language');
  return { ...category(value), serviceId: catalogId(row.service_id), language: row.language };
}
function page<T extends { id: string }>(
  rows: unknown[],
  query: CatalogQuery,
  decode: (row: unknown) => T,
): Page<T> {
  const items = rows.slice(0, query.limit).map(decode);
  return { items, nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null };
}

export class CatalogAdministrationRepository {
  constructor(private readonly db: D1Database) {}

  async read(input: unknown): Promise<ManagementData> {
    const query = managementQuery(input);
    const [categories, services, selectedCategory, selectedService, aliases] =
      await this.db.batch<unknown>([
        this.db
          .prepare(
            'SELECT id, name, active, revision FROM categories WHERE id > ? ORDER BY id LIMIT ?',
          )
          .bind(query.categories.after ?? '', query.categories.limit + 1),
        this.db
          .prepare(
            'SELECT id, name, category_id, active, revision FROM services WHERE id > ? ORDER BY id LIMIT ?',
          )
          .bind(query.services.after ?? '', query.services.limit + 1),
        this.db
          .prepare('SELECT id, name, active, revision FROM categories WHERE id = ?')
          .bind(query.categoryId ?? ''),
        this.db
          .prepare('SELECT id, name, category_id, active, revision FROM services WHERE id = ?')
          .bind(query.serviceId ?? ''),
        this.db
          .prepare(
            'SELECT id, alias AS name, service_id, language, active, revision FROM service_aliases WHERE service_id = ? AND id > ? ORDER BY id LIMIT ?',
          )
          .bind(query.serviceId ?? '', query.aliases.after ?? '', query.aliases.limit + 1),
      ]);
    return {
      categories: page(categories.results, query.categories, category),
      services: page(services.results, query.services, service),
      category: selectedCategory.results[0] ? category(selectedCategory.results[0]) : null,
      service: selectedService.results[0] ? service(selectedService.results[0]) : null,
      aliases: page(aliases.results, query.aliases, alias),
    };
  }

  async save(edit: CatalogEdit): Promise<void> {
    let statement: D1PreparedStatement;
    const active = Number(edit.active);
    if (edit.entity === 'category') {
      statement =
        edit.mode === 'create'
          ? this.db
              .prepare('INSERT INTO categories(id, name, search_key, active) VALUES (?, ?, ?, ?)')
              .bind(edit.id, edit.name, edit.searchKey, active)
          : this.db
              .prepare(
                'UPDATE categories SET name = ?, search_key = ?, active = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
              )
              .bind(edit.name, edit.searchKey, active, edit.id, edit.revision);
    } else if (edit.entity === 'service') {
      statement =
        edit.mode === 'create'
          ? this.db
              .prepare(
                'INSERT INTO services(id, name, search_key, active, category_id) VALUES (?, ?, ?, ?, ?)',
              )
              .bind(edit.id, edit.name, edit.searchKey, active, edit.categoryId)
          : this.db
              .prepare(
                'UPDATE services SET name = ?, search_key = ?, active = ?, category_id = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
              )
              .bind(edit.name, edit.searchKey, active, edit.categoryId, edit.id, edit.revision);
    } else {
      statement =
        edit.mode === 'create'
          ? this.db
              .prepare(
                'INSERT INTO service_aliases(id, alias, search_key, active, service_id, language) VALUES (?, ?, ?, ?, ?, ?)',
              )
              .bind(edit.id, edit.name, edit.searchKey, active, edit.serviceId, edit.language)
          : this.db
              .prepare(
                'UPDATE service_aliases SET alias = ?, search_key = ?, active = ?, language = ?, revision = revision + 1 WHERE id = ? AND service_id = ? AND revision = ?',
              )
              .bind(
                edit.name,
                edit.searchKey,
                active,
                edit.language,
                edit.id,
                edit.serviceId,
                edit.revision,
              );
    }
    try {
      const result = await statement.run();
      if (result.meta.changes !== 1) throw new CatalogEditError('conflict');
    } catch (error) {
      if (error instanceof CatalogEditError) throw error;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('catalog_term_collision')) throw new CatalogEditError('collision');
      if (message.includes('UNIQUE constraint failed')) throw new CatalogEditError('duplicate');
      if (
        message.includes('FOREIGN KEY constraint failed') ||
        message.includes('catalog_invalid_key')
      )
        throw new CatalogEditError('invalid_request');
      throw new CatalogEditError('unavailable');
    }
  }
}
