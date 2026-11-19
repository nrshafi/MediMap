import type { HTMLAttributes, ReactNode } from 'react';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  ...props
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center rounded-md border border-border bg-surface p-6 text-center sm:p-8 ${className}`.trim()}
      {...props}
    >
      {icon && (
        <div
          className="mb-3 flex size-10 items-center justify-center rounded-full bg-surface-sunken text-muted"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-h3 font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-small text-muted">{description}</p>
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
