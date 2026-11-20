import type { HTMLAttributes, ReactNode } from 'react';

export type NoticeKind = 'info' | 'warning' | 'error';

export interface NoticeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  kind?: NoticeKind;
  title?: string;
  titleAs?: 'h2' | 'h3' | 'div';
  role?: 'status' | 'alert' | 'none';
  children: ReactNode;
}

const noticeKindStyles: Record<NoticeKind, string> = {
  info: 'border-border bg-surface-sunken text-muted',
  warning: 'border-disputed/40 bg-disputed-soft text-disputed',
  error: 'border-error/40 bg-error-soft text-error',
};

export function Notice({
  kind,
  title,
  titleAs = 'h2',
  role,
  className = '',
  children,
  ...props
}: NoticeProps) {
  const resolvedRole =
    role === 'none' ? undefined : (role ?? (kind === 'error' ? 'alert' : 'status'));
  const resolvedKind = kind ?? (resolvedRole === 'alert' ? 'error' : 'info');
  const base = 'rounded-sm border p-3 text-small';
  const TitleTag = titleAs;

  return (
    <div
      role={resolvedRole}
      className={`${base} ${noticeKindStyles[resolvedKind]} ${className}`.trim()}
      {...props}
    >
      {title && <TitleTag className="mb-1 font-semibold">{title}</TitleTag>}
      {children}
    </div>
  );
}
