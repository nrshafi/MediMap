import type { HTMLAttributes, ReactNode } from 'react';

export interface StatTileProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  subtext?: ReactNode;
  as?: 'dl-item' | 'div';
}

export function StatTile({
  label,
  value,
  subtext,
  as = 'dl-item',
  className = '',
  ...props
}: StatTileProps) {
  const container = `min-w-0 rounded-sm bg-surface-sunken p-2 text-ink ${className}`.trim();
  const labelClass = 'text-label font-semibold text-muted';
  const valueClass = 'break-words text-small font-bold [font-feature-settings:"tnum"_1]';

  if (as === 'div') {
    return (
      <div className={container} {...props}>
        <div className={labelClass}>{label}</div>
        <div className={valueClass}>{value}</div>
        {subtext && <div className="mt-0.5 text-xs text-muted">{subtext}</div>}
      </div>
    );
  }

  return (
    <div className={container} {...props}>
      <dt className={labelClass}>{label}</dt>
      <dd className={valueClass}>{value}</dd>
      {subtext && <dd className="mt-0.5 text-xs text-muted">{subtext}</dd>}
    </div>
  );
}
