import { useId, type ReactNode } from 'react';
import type { ProviderRecord, BranchRecord, ContactSource } from '../providers/contracts';
import { dayHoursInput, weekDays } from '../providers/hours';

function Field({
  name,
  label,
  value = '',
  required = false,
  maxLength = 180,
  pattern,
  type = 'text',
  min,
  max,
  step,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
  maxLength?: number;
  pattern?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value}
        required={required}
        maxLength={maxLength}
        pattern={pattern}
        type={type}
        min={min}
        max={max}
        step={step}
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
function Identity({ existing }: { existing?: ProviderRecord }) {
  return existing ? (
    <>
      <input type="hidden" name="id" value={existing.id} />
      <input type="hidden" name="revision" value={existing.revision} />
      <p className="admin-muted">
        Stable ID: <code>{existing.id}</code> · Revision {existing.revision}
      </p>
    </>
  ) : (
    <Field name="id" label="Stable ID" required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
  );
}
function Status({ existing }: { existing?: ProviderRecord }) {
  return (
    <Select name="active" label="Status" value={existing?.active ? '1' : '0'}>
      <option value="0">Inactive</option>
      <option value="1">Active</option>
    </Select>
  );
}
function Contacts({ existing }: { existing?: ProviderRecord }) {
  return (
    <>
      <Field
        name="phone"
        label="Primary telephone"
        value={existing?.phone ?? ''}
        type="tel"
        maxLength={30}
      />
      <Field
        name="website"
        label="Website"
        value={existing?.website ?? ''}
        type="url"
        maxLength={2048}
      />
    </>
  );
}
export function ProviderForm({ existing }: { existing?: ProviderRecord }) {
  return (
    <form className="catalog-edit-form" method="post" action="/admin/providers/write">
      <input type="hidden" name="entity" value="provider" />
      <input type="hidden" name="mode" value={existing ? 'update' : 'create'} />
      <Identity existing={existing} />
      <Field name="name" label="Provider name" value={existing?.name} required />
      <Contacts existing={existing} />
      <Status existing={existing} />
      <button type="submit">{existing ? 'Save provider' : 'Create provider'}</button>
    </form>
  );
}
export function BranchForm({
  provider,
  existing,
  sources,
}: {
  provider: ProviderRecord;
  existing?: BranchRecord;
  sources: ContactSource[];
}) {
  return (
    <form className="catalog-edit-form" method="post" action="/admin/providers/write">
      <input type="hidden" name="entity" value="branch" />
      <input type="hidden" name="mode" value={existing ? 'update' : 'create'} />
      <input type="hidden" name="providerId" value={provider.id} />
      <p>Provider: {provider.name}</p>
      <Identity existing={existing} />
      <Field name="name" label="Branch name" value={existing?.name} required />
      <Field name="address" label="Address" value={existing?.address} required maxLength={500} />
      <Contacts existing={existing} />
      <Field
        name="alternativePhone"
        label="Alternative telephone"
        value={existing?.alternativePhone ?? ''}
        type="tel"
        maxLength={30}
      />
      <div className="provider-coordinate-fields">
        <Field
          name="latitude"
          type="number"
          min={-90}
          max={90}
          step="any"
          label="Latitude"
          value={existing?.latitude?.toString()}
          maxLength={30}
        />
        <Field
          name="longitude"
          type="number"
          min={-180}
          max={180}
          step="any"
          label="Longitude"
          value={existing?.longitude?.toString()}
          maxLength={30}
        />
      </div>
      <p className="admin-muted">
        Leave both coordinates blank if unknown. Latitude ranges from -90 to 90; longitude ranges
        from -180 to 180.
      </p>
      <fieldset className="provider-hours">
        <legend>Usual weekly hours · Asia/Dhaka</legend>
        <p>
          Leave a day blank if unknown. Enter closed or periods such as 08:00-13:00, 16:00-22:00.
        </p>
        <p>
          Use 00:00-24:00 for all day. An earlier closing time continues into the next day. Maximum
          four periods per day.
        </p>
        {weekDays.map((day) => (
          <Field
            key={day}
            name={`hours_${day}`}
            label={day[0].toUpperCase() + day.slice(1)}
            value={dayHoursInput(existing?.openingHours?.days[day] ?? null)}
            maxLength={120}
          />
        ))}
      </fieldset>
      <Select
        name="contactSourceId"
        label="Official contact source"
        value={existing?.contactSourceId ?? ''}
      >
        <option value="">No source selected</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.id}
          </option>
        ))}
      </Select>
      <label className="catalog-confirm">
        <input type="checkbox" name="confirmContact" value="yes" />
        <span>I checked these branch details against the selected official contact source.</span>
      </label>
      <p className="admin-muted">
        An active branch requires an official contact source and confirmation. Keep unsupported
        branches inactive. Leave unknown contacts and hours blank.
      </p>
      <Status existing={existing} />
      <button type="submit">{existing ? 'Save branch' : 'Create branch'}</button>
    </form>
  );
}
