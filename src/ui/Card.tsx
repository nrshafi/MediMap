import type { ElementType, HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'default' | 'raised' | 'sunken';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  interactive?: boolean;
  as?: ElementType;
  href?: string;
  to?: string;
  children?: ReactNode;
}

export function Card({
  variant = 'default',
  interactive = false,
  as = 'div',
  className = '',
  children,
  ...props
}: CardProps) {
  const Component = as as ElementType;
  const base = 'rounded-md';

  let variantStyle = '';
  if (variant === 'raised') {
    variantStyle = `border border-border bg-surface shadow-card ${
      interactive
        ? 'cursor-pointer transition-shadow duration-fast hover:border-border-strong hover:shadow-lift'
        : ''
    }`;
  } else if (variant === 'sunken') {
    variantStyle = 'bg-surface-sunken';
  } else {
    variantStyle = `border border-border bg-surface ${
      interactive ? 'cursor-pointer hover:border-border-strong' : ''
    }`;
  }

  const combined = `${base} ${variantStyle} p-4 ${className}`.trim();

  return (
    <Component className={combined} {...props}>
      {children}
    </Component>
  );
}
