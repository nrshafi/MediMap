import type { ReactNode } from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { fieldControlStyles } from '../../ui/Field';
import { ui } from '../../ui/styles';

export { Notice } from '../../ui/Notice';

export const admin = {
  form: 'grid gap-4',
  textarea: `${fieldControlStyles} min-h-24 resize-y py-2`,
  check: 'flex min-h-touch items-start gap-3 text-small font-normal leading-snug text-ink',
  checkbox: 'mt-0.5 size-5 shrink-0 accent-primary',
  hint: 'text-small leading-snug text-muted',
  twoColumns: 'grid gap-4 lg:grid-cols-2',
  link: 'inline-flex min-h-touch items-center font-medium text-primary underline-offset-2 hover:underline',
  list: 'divide-y divide-border',
  listRow: 'flex min-w-0 items-center justify-between gap-4 py-1',
  stack: 'grid gap-4',
  prose: 'whitespace-pre-wrap [overflow-wrap:anywhere]',
  fieldset: 'grid min-w-0 gap-3 rounded-sm border border-border p-4',
  legend: 'px-2 text-small font-semibold text-ink',
  filter: 'flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4',
  dt: 'text-label font-semibold text-muted',
  dd: 'mt-1 text-small leading-snug text-ink [overflow-wrap:anywhere]',
} as const;

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
    <Card
      as="section"
      variant="default"
      className="min-w-0 grid gap-2 [overflow-wrap:anywhere]"
      role={plain || label ? undefined : 'alert'}
      aria-label={label}
    >
      <h2 className={ui.heading2}>{title}</h2>
      {children}
    </Card>
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
    <Card
      as="section"
      variant="default"
      className="min-w-0 grid gap-3 [overflow-wrap:anywhere]"
      aria-labelledby={id}
    >
      <h2 id={id} className={ui.heading2}>
        {title}
      </h2>
      {children}
    </Card>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? 'verified' : 'unknown'} className="shrink-0">
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}
