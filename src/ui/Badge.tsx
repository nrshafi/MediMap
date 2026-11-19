import type { HTMLAttributes, ReactNode } from 'react';
import type { CurrentPrice } from '../features/catalog/contracts';
import { priceStatus } from '../features/public/format';

export type BadgeTone = 'verified' | 'disputed' | 'unknown' | 'error' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

export const badgeToneClasses: Record<BadgeTone, string> = {
  verified: 'bg-verified-soft text-verified',
  disputed: 'bg-disputed-soft text-disputed',
  unknown: 'bg-unknown-soft text-unknown',
  error: 'bg-error-soft text-error',
  neutral: 'bg-surface-sunken text-muted',
};

export function Badge({ tone = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-label font-semibold ${badgeToneClasses[tone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  price?: CurrentPrice | null;
  tone?: 'verified' | 'disputed' | 'unknown';
  label?: string;
  children?: ReactNode;
}

export function StatusBadge({
  price,
  tone,
  label,
  children,
  className = '',
  ...props
}: StatusBadgeProps) {
  if (price !== undefined) {
    const status = priceStatus(price);
    return (
      <Badge tone={status.tone} className={className} {...props}>
        {children ?? label ?? status.label}
      </Badge>
    );
  }

  const resolvedTone = tone ?? 'unknown';
  const defaultLabel =
    resolvedTone === 'verified'
      ? 'Verified'
      : resolvedTone === 'disputed'
        ? 'Disputed, under review'
        : 'Price unknown';

  return (
    <Badge tone={resolvedTone} className={className} {...props}>
      {children ?? label ?? defaultLabel}
    </Badge>
  );
}
