import { useId, type ReactNode } from 'react';
import type { Choice, ListingRecord, SourceRecord } from '../pricing/contracts';

function Input({
  name,
  label,
  value = '',
  required = false,
  type = 'text',
  pattern,
  maxLength = 180,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
  type?: string;
  pattern?: string;
  maxLength?: number;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value}
        required={required}
        type={type}
        pattern={pattern}
        maxLength={maxLength}
      />
    </label>
  );
}
function Select({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="catalog-select-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} defaultValue={value}>
        {children}
      </select>
    </div>
  );
}
function Check({ name, children }: { name: string; children: ReactNode }) {
  return (
    <label className="catalog-confirm">
      <input name={name} type="checkbox" value="yes" required />
      <span>{children}</span>
    </label>
  );
}
function Id() {
  return (
    <Input name="id" label="Stable ID" required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
  );
}
function Revision({ listing }: { listing: ListingRecord }) {
  return (
    <>
      <input name="id" type="hidden" value={listing.id} />
      <input name="revision" type="hidden" value={listing.revision} />
      <p className="admin-muted">
        Stable ID: <code>{listing.id}</code> · Revision {listing.revision}
      </p>
    </>
  );
}
function Notes({
  name = 'notes',
  label = 'Notes',
  value = '',
}: {
  name?: string;
  label?: string;
  value?: string;
}) {
  return (
    <label>
      {label}
      <textarea name={name} defaultValue={value} maxLength={1000} rows={3} />
    </label>
  );
}
export function decimalBdt(minor: number) {
  const integer = BigInt(minor);
  return `${integer / 100n}.${String(integer % 100n).padStart(2, '0')}`;
}

export function SourceForm({ provider }: { provider: Choice }) {
  return (
    <form className="catalog-edit-form pricing-form" method="post" action="/admin/prices/write">
      <input name="entity" type="hidden" value="source" />
      <input name="providerId" type="hidden" value={provider.id} />
      <p>Provider: {provider.name}</p>
      <Id />
      <Input
        name="url"
        label="Official source URL"
        type="url"
        required
        maxLength={2048}
        pattern="https://.*"
      />
      <Select name="kind" label="Source kind" value="official_tariff">
        <option value="official_tariff">Official tariff</option>
        <option value="official_contact">Official contact page</option>
      </Select>
      <Input name="retrievedAt" label="Collection timestamp (UTC)" required maxLength={24} />
      <p className="admin-muted">
        Enter the actual collection time, such as 2026-10-28T09:00:00Z. Submission time is recorded
        separately.
      </p>
      <Input
        name="sha256"
        label="Snapshot SHA-256"
        required
        maxLength={64}
        pattern="[a-fA-F0-9]{64}"
      />
      <Input name="collector" label="Actual collector reference" required maxLength={120} />
      <Input name="sourceUpdatedDate" label="Website update date" type="date" />
      <Select name="currencyEvidence" label="Tariff currency evidence" value="">
        <option value="">Unknown or not applicable</option>
        <option value="explicit_taka_header">Explicit taka header</option>
        <option value="explicit_taka_symbol">Explicit taka symbol</option>
      </Select>
      <Notes />
      <Check name="confirmSource">
        These are the actual details of a reviewed official source snapshot.
      </Check>
      <button type="submit">Create source snapshot</button>
    </form>
  );
}
export function ListingForm({
  existing,
  branches = [],
  services = [],
}: {
  existing?: ListingRecord;
  branches?: Choice[];
  services?: Choice[];
}) {
  return (
    <form className="catalog-edit-form pricing-form" method="post" action="/admin/prices/write">
      <input name="entity" type="hidden" value="listing" />
      <input name="mode" type="hidden" value={existing ? 'update' : 'create'} />
      {existing ? (
        <>
          <Revision listing={existing} />
          <p>
            {existing.serviceName} at {existing.branchName}
          </p>
        </>
      ) : (
        <>
          <Id />
          <Select name="branchId" label="Branch" value="">
            <option value="">Select a branch</option>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select name="serviceId" label="Canonical service" value="">
            <option value="">Select a service</option>
            {services.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </>
      )}
      <Input
        name="providerServiceName"
        label="Original provider service label"
        value={existing?.providerServiceName}
        required
      />
      <Select name="active" label="Availability" value={existing?.active ? '1' : '0'}>
        <option value="0">Inactive listing</option>
        <option value="1">Active listing</option>
      </Select>
      <Check name="confirmMapping">
        The provider label refers to this canonical diagnostic service and variant.
      </Check>
      <button type="submit">
        {existing ? 'Save availability' : 'Create branch-service listing'}
      </button>
    </form>
  );
}
export function PriceForm({
  listing,
  sources,
}: {
  listing: ListingRecord;
  sources: SourceRecord[];
}) {
  const price = listing.price;
  return (
    <form className="catalog-edit-form pricing-form" method="post" action="/admin/prices/write">
      <input name="entity" type="hidden" value="price" />
      <input name="action" type="hidden" value="set" />
      <Revision listing={listing} />
      <Input
        name="amount"
        label="Standard price (BDT)"
        value={price ? decimalBdt(price.amountMinor) : ''}
        required
        maxLength={17}
        pattern="[0-9]+(\.[0-9]{1,2})?"
      />
      <Select name="status" label="Price status" value={price?.status ?? 'unverified'}>
        <option value="unverified">Unverified</option>
        <option value="verified">Verified on official website</option>
        <option value="disputed">Disputed</option>
      </Select>
      <Select name="sourceId" label="Official tariff source" value={price?.sourceId ?? ''}>
        <option value="">Source unknown</option>
        {sources
          .filter((source) => source.kind === 'official_tariff')
          .map((source) => (
            <option key={source.id} value={source.id}>
              {source.id}
            </option>
          ))}
      </Select>
      <Input
        name="sourceRow"
        label="Source row number"
        value={price?.sourceRow?.toString()}
        pattern="[1-9][0-9]*"
        maxLength={15}
      />
      <Input
        name="effectiveDate"
        label="Tariff effective date"
        type="date"
        value={price?.effectiveDate ?? ''}
      />
      <p className="admin-muted">
        Leave an unknown effective date blank. A verified price requires an official provider
        tariff, explicit taka evidence, and its row number.
      </p>
      <label className="catalog-confirm">
        <input name="confirmReview" type="checkbox" value="yes" />
        <span>I reviewed this tariff and price now. Required for verified status.</span>
      </label>
      <Check name="standardPrice">
        This is a standard base price without a promotion or discount.
      </Check>
      <Notes label="Revision notes" />
      <button type="submit">Save new price revision</button>
    </form>
  );
}
export function ClearPriceForm({ listing }: { listing: ListingRecord }) {
  return (
    <form className="catalog-edit-form pricing-form" method="post" action="/admin/prices/write">
      <input name="entity" type="hidden" value="price" />
      <input name="action" type="hidden" value="clear" />
      <Revision listing={listing} />
      <Check name="confirmClear">
        Set the current price to unknown and retain all previous revisions.
      </Check>
      <button type="submit">Set current price to unknown</button>
    </form>
  );
}
