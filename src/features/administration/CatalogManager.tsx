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
import { admin, ActiveBadge, Notice, PageTitle, Section, StateCard } from './adminUi';
import { ui } from '../../ui/styles';

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
    <div className={ui.label}>
      <label htmlFor={id}>{label}</label>
      <select className={admin.input} id={id} name={name} defaultValue={value} required={required}>
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
    <label className={ui.label}>
      {label}
      <input
        className={admin.input}
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
    <form className={admin.form} method="post" action="/admin/catalog/write">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="mode" value={existing ? 'update' : 'create'} />
      {existing ? (
        <>
          <input type="hidden" name="id" value={existing.id} />
          <input type="hidden" name="revision" value={existing.revision} />
          <p className={admin.hint}>
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
        <label className={admin.check}>
          <input className={admin.checkbox} type="checkbox" name="confirm" value="yes" required />
          <span>This correction keeps the same diagnostic meaning.</span>
        </label>
      )}
      <button className={ui.buttonPrimary} type="submit">
        {submit}
      </button>
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
    <Notice role={code === 'saved' ? 'status' : 'alert'}>
      <p>{message}</p>
      {code !== 'saved' && (
        <a className={admin.link} href={managementHref()}>
          Reload catalog management
        </a>
      )}
    </Notice>
  );
}

function NameList({
  items,
  hrefFor,
}: {
  items: readonly { id: string; name: string; active: boolean }[];
  hrefFor: (id: string) => string;
}) {
  return (
    <ul className={admin.list}>
      {items.map((item) => (
        <li key={item.id} className={admin.listRow}>
          <a className={admin.link} href={hrefFor(item.id)}>
            {item.name}
          </a>
          <ActiveBadge active={item.active} />
        </li>
      ))}
    </ul>
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
      <PageTitle eyebrow="Catalog administration" title="Manage diagnostic catalog">
        Maintain categories, canonical services, and English or Bangla aliases. Keep different
        diagnostic variants as separate services.
      </PageTitle>
      {!result.ok ? (
        <StateCard
          title={
            result.code === 'forbidden'
              ? 'Administrator access required'
              : result.code === 'unauthenticated'
                ? 'Sign in to continue'
                : result.code === 'expired'
                  ? 'Session expired'
                  : 'Catalog unavailable'
          }
        >
          <p>{result.message}</p>
          <a
            className={admin.link}
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
        </StateCard>
      ) : (
        <>
          <Feedback code={code} />
          <Notice>
            Deactivation hides a record from public catalog reads and keeps its relationships.
            Inactive terms remain reserved.
          </Notice>
          <div className={admin.twoColumns}>
            <Section id="new-category" title="Add category">
              <EditForm entity="category" submit="Create category" />
            </Section>
            <Section id="new-service" title="Add canonical service">
              <EditForm entity="service" submit="Create service">
                <CategoryField categories={categories} />
              </EditForm>
              <p className={admin.hint}>
                A service can have no branch listings yet. Creating it does not verify a hospital or
                price.
              </p>
            </Section>
          </div>
          <div className={admin.twoColumns}>
            <Section id="category-list" title="Categories">
              <p className={admin.hint}>An inactive category hides all its services.</p>
              <NameList
                items={result.data.categories.items}
                hrefFor={(id) => managementHref({ ...search, category: id, code: undefined })}
              />
              {!result.data.categories.items.length && <p>No categories on this page.</p>}
              {result.data.categories.nextCursor && (
                <a
                  className={admin.link}
                  href={managementHref({
                    ...search,
                    categoryAfter: result.data.categories.nextCursor,
                    code: undefined,
                  })}
                >
                  More categories
                </a>
              )}
            </Section>
            <Section id="service-list" title="Canonical services">
              <NameList
                items={result.data.services.items}
                hrefFor={(id) =>
                  managementHref({
                    ...search,
                    service: id,
                    aliasAfter: undefined,
                    code: undefined,
                  })
                }
              />
              {!result.data.services.items.length && <p>No services on this page.</p>}
              {result.data.services.nextCursor && (
                <a
                  className={admin.link}
                  href={managementHref({
                    ...search,
                    after: result.data.services.nextCursor,
                    code: undefined,
                  })}
                >
                  More services
                </a>
              )}
            </Section>
          </div>
          {search.category && !result.data.category && (
            <Notice role="alert">
              Category not found.{' '}
              <a className={ui.link} href={managementHref()}>
                Reload catalog management
              </a>
            </Notice>
          )}
          {result.data.category && (
            <Section id="edit-category" title="Edit category">
              <EditForm
                key={`category-${result.data.category.id}-${result.data.category.revision}`}
                entity="category"
                existing={result.data.category}
                submit="Save category"
              />
            </Section>
          )}
          {search.service && !result.data.service && (
            <Notice role="alert">
              Service not found.{' '}
              <a className={ui.link} href={managementHref()}>
                Reload catalog management
              </a>
            </Notice>
          )}
          {result.data.service && (
            <>
              <Section id="edit-service" title="Edit service">
                <EditForm
                  key={`service-${result.data.service.id}-${result.data.service.revision}`}
                  entity="service"
                  existing={result.data.service}
                  submit="Save service"
                >
                  <CategoryField categories={categories} value={result.data.service.categoryId} />
                </EditForm>
                <a className={admin.link} href={`/admin/catalog?service=${result.data.service.id}`}>
                  Inspect published service
                </a>
              </Section>
              <Section id="new-alias" title="Add alias">
                <p className="text-sm">
                  For {result.data.service.name}. Add only names that refer to this diagnostic
                  service.
                </p>
                <EditForm entity="alias" submit="Create alias">
                  <input type="hidden" name="serviceId" value={result.data.service.id} />
                  <LanguageField />
                </EditForm>
              </Section>
              <Section id="aliases" title="Aliases">
                {!result.data.aliases.items.length && <p>No aliases on this page.</p>}
                <div className={admin.twoColumns}>
                  {result.data.aliases.items.map((item) => (
                    <section
                      key={item.id}
                      className="grid min-w-0 gap-3 rounded-sm border border-border p-4"
                      aria-label={`Edit alias ${item.name}`}
                    >
                      <h3 className="text-base font-bold text-ink" lang={item.language}>
                        {item.name}
                      </h3>
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
                    className={admin.link}
                    href={managementHref({
                      ...search,
                      aliasAfter: result.data.aliases.nextCursor,
                      code: undefined,
                    })}
                  >
                    More aliases
                  </a>
                )}
              </Section>
            </>
          )}
        </>
      )}
    </AdminLayout>
  );
}
