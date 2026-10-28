import { useId, type ReactNode } from 'react';
import { AdminLayout } from './AdminLayout';
import {
  editMessages,
  managementHref,
  type CategoryRecord,
  type ServiceRecord,
  type AliasRecord,
} from '../catalog/administration/contracts';
import type { readManagement } from '../catalog/administration/operations.server';
import './catalogManager.css';

type FormRecord = CategoryRecord | ServiceRecord | AliasRecord;
function SelectField({
  name,
  label,
  value,
  children,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  children: ReactNode;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="catalog-select-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} defaultValue={value} required={required}>
        {children}
      </select>
    </div>
  );
}
function TextField({
  name,
  label,
  value = '',
  idField = false,
}: {
  name: string;
  label: string;
  value?: string;
  idField?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value}
        required
        minLength={1}
        maxLength={idField ? 120 : 180}
        pattern={idField ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined}
        autoCapitalize={idField ? 'none' : undefined}
        spellCheck={idField ? false : undefined}
      />
    </label>
  );
}
function EditForm({
  entity,
  existing,
  children,
  submit,
}: {
  entity: 'category' | 'service' | 'alias';
  existing?: FormRecord;
  children?: ReactNode;
  submit: string;
}) {
  return (
    <form className="catalog-edit-form" method="post" action="/admin/catalog/write">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="mode" value={existing ? 'update' : 'create'} />
      {existing ? (
        <>
          <input type="hidden" name="id" value={existing.id} />
          <input type="hidden" name="revision" value={existing.revision} />
          <p className="admin-muted">
            Stable ID: <code>{existing.id}</code> · Revision {existing.revision}
          </p>
        </>
      ) : (
        <TextField name="id" label="Stable ID" idField />
      )}
      <TextField
        name="name"
        label={entity === 'alias' ? 'Alias text' : 'Name'}
        value={existing?.name}
      />
      {children}
      <SelectField label="Status" name="active" value={existing?.active === false ? '0' : '1'}>
        <option value="1">Active</option>
        <option value="0">Inactive</option>
      </SelectField>
      {existing && entity !== 'category' && (
        <label className="catalog-confirm">
          <input type="checkbox" name="confirm" value="yes" required />
          <span>This correction keeps the same diagnostic meaning.</span>
        </label>
      )}
      <button type="submit">{submit}</button>
    </form>
  );
}
function CategoryField({
  categories,
  value = '',
}: {
  categories: CategoryRecord[];
  value?: string;
}) {
  return (
    <SelectField label="Category" name="categoryId" value={value} required>
      <option value="" disabled>
        Select a category
      </option>
      {value && !categories.some((item) => item.id === value) && (
        <option value={value}>{value}</option>
      )}
      {categories.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
          {item.active ? '' : ' · inactive'}
        </option>
      ))}
    </SelectField>
  );
}
function LanguageField({ value = 'en' }: { value?: 'en' | 'bn' }) {
  return (
    <SelectField label="Language" name="language" value={value}>
      <option value="en">English</option>
      <option value="bn">Bangla</option>
    </SelectField>
  );
}
function Feedback({ code }: { code?: string }) {
  if (!code || !Object.hasOwn(editMessages, code)) return null;
  const message = Object.entries(editMessages).find(([key]) => key === code)?.[1];
  return (
    <div className="admin-notice" role={code === 'saved' ? 'status' : 'alert'}>
      <p>{message}</p>
      {code !== 'saved' && <a href={managementHref()}>Reload catalog management</a>}
    </div>
  );
}

export function CatalogManager({
  result,
  code,
  search = {},
}: {
  result: Awaited<ReturnType<typeof readManagement>>;
  code?: string;
  search?: Record<string, string | undefined>;
}) {
  const categories = result.ok ? [...result.data.categories.items] : [];
  if (
    result.ok &&
    result.data.category &&
    !categories.some((item) => item.id === result.data.category?.id)
  ) {
    categories.push(result.data.category);
  }
  return (
    <AdminLayout activeHref="/admin/catalog/manage">
      <div className="admin-title">
        <p className="admin-eyebrow">Catalog administration</p>
        <h1>Manage diagnostic catalog</h1>
        <p>
          Maintain categories, canonical services, and English or Bangla aliases. Keep different
          diagnostic variants as separate services.
        </p>
      </div>
      {!result.ok ? (
        <section className="catalog-state" role="alert">
          <h2>
            {result.code === 'forbidden'
              ? 'Administrator access required'
              : result.code === 'unauthenticated'
                ? 'Sign in to continue'
                : result.code === 'expired'
                  ? 'Session expired'
                  : 'Catalog unavailable'}
          </h2>
          <p>{result.message}</p>
          <a
            href={
              ['unauthenticated', 'expired'].includes(result.code)
                ? '/sign-in?returnTo=%2Fadmin%2Fcatalog%2Fmanage'
                : result.code === 'forbidden'
                  ? '/account'
                  : managementHref()
            }
          >
            {['unauthenticated', 'expired'].includes(result.code)
              ? 'Sign in with Google'
              : result.code === 'forbidden'
                ? 'Open your account'
                : 'Reload catalog management'}
          </a>
        </section>
      ) : (
        <>
          <Feedback code={code} />
          <p className="admin-notice">
            Deactivation hides a record from public catalog reads and keeps its relationships.
            Inactive terms remain reserved.
          </p>
          <div className="catalog-management-grid">
            <section className="catalog-edit-card" aria-labelledby="new-category">
              <h2 id="new-category">Add category</h2>
              <EditForm entity="category" submit="Create category" />
            </section>
            <section className="catalog-edit-card" aria-labelledby="new-service">
              <h2 id="new-service">Add canonical service</h2>
              <EditForm entity="service" submit="Create service">
                <CategoryField categories={categories} />
              </EditForm>
              <p className="admin-muted">
                A service can have no branch listings yet. Creating it does not verify a hospital or
                price.
              </p>
            </section>
          </div>
          <div className="catalog-management-grid">
            <section className="catalog-edit-card" aria-labelledby="category-list">
              <h2 id="category-list">Categories</h2>
              <p className="admin-muted">An inactive category hides all its services.</p>
              <ul className="catalog-management-list">
                {result.data.categories.items.map((item) => (
                  <li key={item.id}>
                    <a href={managementHref({ ...search, category: item.id, code: undefined })}>
                      {item.name}
                    </a>
                    <span>{item.active ? 'Active' : 'Inactive'}</span>
                  </li>
                ))}
              </ul>
              {!result.data.categories.items.length && <p>No categories on this page.</p>}
              {result.data.categories.nextCursor && (
                <a
                  href={managementHref({
                    ...search,
                    categoryAfter: result.data.categories.nextCursor,
                    code: undefined,
                  })}
                >
                  More categories
                </a>
              )}
            </section>
            <section className="catalog-edit-card" aria-labelledby="service-list">
              <h2 id="service-list">Canonical services</h2>
              <ul className="catalog-management-list">
                {result.data.services.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={managementHref({
                        ...search,
                        service: item.id,
                        aliasAfter: undefined,
                        code: undefined,
                      })}
                    >
                      {item.name}
                    </a>
                    <span>{item.active ? 'Active' : 'Inactive'}</span>
                  </li>
                ))}
              </ul>
              {!result.data.services.items.length && <p>No services on this page.</p>}
              {result.data.services.nextCursor && (
                <a
                  href={managementHref({
                    ...search,
                    after: result.data.services.nextCursor,
                    code: undefined,
                  })}
                >
                  More services
                </a>
              )}
            </section>
          </div>
          {search.category && !result.data.category && (
            <p role="alert">
              Category not found. <a href={managementHref()}>Reload catalog management</a>
            </p>
          )}
          {result.data.category && (
            <section className="catalog-edit-card" aria-labelledby="edit-category">
              <h2 id="edit-category">Edit category</h2>
              <EditForm
                key={`category-${result.data.category.id}-${result.data.category.revision}`}
                entity="category"
                existing={result.data.category}
                submit="Save category"
              />
            </section>
          )}
          {search.service && !result.data.service && (
            <p role="alert">
              Service not found. <a href={managementHref()}>Reload catalog management</a>
            </p>
          )}
          {result.data.service && (
            <>
              <section className="catalog-edit-card" aria-labelledby="edit-service">
                <h2 id="edit-service">Edit service</h2>
                <EditForm
                  key={`service-${result.data.service.id}-${result.data.service.revision}`}
                  entity="service"
                  existing={result.data.service}
                  submit="Save service"
                >
                  <CategoryField categories={categories} value={result.data.service.categoryId} />
                </EditForm>
                <a href={`/admin/catalog?service=${result.data.service.id}`}>
                  Inspect published service
                </a>
              </section>
              <section className="catalog-edit-card" aria-labelledby="new-alias">
                <h2 id="new-alias">Add alias</h2>
                <p>
                  For {result.data.service.name}. Add only names that refer to this diagnostic
                  service.
                </p>
                <EditForm entity="alias" submit="Create alias">
                  <input type="hidden" name="serviceId" value={result.data.service.id} />
                  <LanguageField />
                </EditForm>
              </section>
              <section className="catalog-edit-card" aria-labelledby="aliases">
                <h2 id="aliases">Aliases</h2>
                {!result.data.aliases.items.length && <p>No aliases on this page.</p>}
                <div className="catalog-management-grid">
                  {result.data.aliases.items.map((item) => (
                    <section
                      key={item.id}
                      className="catalog-alias"
                      aria-label={`Edit alias ${item.name}`}
                    >
                      <h3 lang={item.language}>{item.name}</h3>
                      <EditForm
                        key={`${item.id}-${item.revision}`}
                        entity="alias"
                        existing={item}
                        submit="Save alias"
                      >
                        <input type="hidden" name="serviceId" value={item.serviceId} />
                        <LanguageField value={item.language} />
                      </EditForm>
                    </section>
                  ))}
                </div>
                {result.data.aliases.nextCursor && (
                  <a
                    href={managementHref({
                      ...search,
                      aliasAfter: result.data.aliases.nextCursor,
                      code: undefined,
                    })}
                  >
                    More aliases
                  </a>
                )}
              </section>
            </>
          )}
        </>
      )}
    </AdminLayout>
  );
}
