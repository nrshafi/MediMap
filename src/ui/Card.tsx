import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'default' | 'raised' | 'sunken';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  interactive?: boolean;
  as?: 'article' | 'section' | 'div';
  children?: ReactNode;
}

export function Card({
  variant = 'default',
  interactive = false,
  as: Component = 'div',
  className = '',
  children,
  ...props
}: CardProps) {
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
