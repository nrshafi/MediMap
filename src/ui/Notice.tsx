import type { HTMLAttributes, ReactNode } from 'react';

export type NoticeKind = 'info' | 'warning' | 'error';

export interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  kind?: NoticeKind;
  title?: string;
  titleAs?: 'h2' | 'h3' | 'div';
  role?: 'status' | 'alert';
  children: ReactNode;
}

const noticeKindStyles: Record<NoticeKind, string> = {
  info: 'border-border bg-surface-sunken text-muted',
  warning: 'border-disputed/40 bg-disputed-soft text-disputed',
  error: 'border-error/40 bg-error-soft text-error',
};

export function Notice({
  kind = 'info',
  title,
  titleAs = 'h2',
  role,
  className = '',
  children,
  ...props
}: NoticeProps) {
  const resolvedRole = role ?? (kind === 'error' ? 'alert' : 'status');
  const base = 'rounded-sm border p-3 text-small';
  const TitleTag = titleAs;

  return (
    <div
      role={resolvedRole}
      className={`${base} ${noticeKindStyles[kind]} ${className}`.trim()}
      {...props}
    >
      {title && <TitleTag className="mb-1 font-semibold">{title}</TitleTag>}
      {children}
    </div>
  );
}
