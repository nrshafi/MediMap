import type { ReactNode } from 'react';
import { ui } from '../../ui/styles';

export const admin = {
  form: 'grid gap-4',
  input: ui.input,
  textarea: `${ui.input} min-h-24 resize-y py-2`,
  check: 'flex min-h-touch items-start gap-3 text-sm font-normal leading-snug text-ink',
  checkbox: 'mt-0.5 size-5 shrink-0 accent-primary',
  hint: 'text-sm leading-snug text-muted',
  twoColumns: 'grid gap-4 lg:grid-cols-2',
  card: 'min-w-0 rounded-md border border-border bg-surface p-5 [overflow-wrap:anywhere]',
  cardTitle: 'mb-4 text-lg font-bold leading-snug text-ink',
  link: 'inline-flex min-h-touch items-center font-medium text-primary underline-offset-2 hover:underline',
  list: 'divide-y divide-border',
  listRow: 'flex min-w-0 items-center justify-between gap-4 py-1',
  stack: 'grid gap-4',
  prose: 'whitespace-pre-wrap [overflow-wrap:anywhere]',
  fieldset: 'grid min-w-0 gap-3 rounded-sm border border-border p-4',
  legend: 'px-2 text-sm font-semibold text-ink',
  filter: 'flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4',
  dt: 'text-xs font-semibold text-muted',
  dd: 'mt-1 text-sm leading-snug text-ink [overflow-wrap:anywhere]',
  record: 'min-w-0 rounded-md border border-border bg-surface',
} as const;

export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h1 className={`${ui.heading1} mt-1`}>{title}</h1>
      {children && <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

export function Notice({ children, role }: { children: ReactNode; role?: 'status' | 'alert' }) {
  return (
    <div
      role={role}
      className={
        role === 'alert'
          ? 'rounded-sm border border-error/30 bg-error-soft p-3 text-sm text-error'
          : ui.notice
      }
    >
      {children}
    </div>
  );
}

export function StateCard({
  title,
  children,
  plain = false,
  label,
}: {
  title: string;
  children?: ReactNode;
  plain?: boolean;
  label?: string;
}) {
  return (
    <section
      className={`${admin.card} grid gap-2`}
      role={plain || label ? undefined : 'alert'}
      aria-label={label}
    >
      <h2 className={ui.heading2}>{title}</h2>
      {children}
    </section>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`${admin.card} grid gap-3`} aria-labelledby={id}>
      <h2 id={id} className={ui.heading2}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`shrink-0 ${
        active
          ? 'inline-flex items-center rounded-full bg-verified-soft px-2 py-1 text-xs font-semibold text-verified'
          : 'inline-flex items-center rounded-full bg-unknown-soft px-2 py-1 text-xs font-semibold text-unknown'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
