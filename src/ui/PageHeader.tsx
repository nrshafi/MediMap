import type { HTMLAttributes, ReactNode } from 'react';

export interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className = '',
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between ${className}`.trim()}
      {...props}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-label font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 font-display text-h1 font-bold text-ink">{title}</h1>
        {description && (
          <div className="mt-2 text-small leading-relaxed text-muted">{description}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:self-start">{actions}</div>}
    </header>
  );
}
