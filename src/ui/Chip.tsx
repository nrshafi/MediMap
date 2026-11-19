import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  pressed?: boolean;
}

export function Chip({
  type = 'button',
  pressed,
  disabled = false,
  icon,
  className = '',
  children,
  ...props
}: ChipProps) {
  const isPressed = pressed ?? props['aria-pressed'];
  return (
    <button
      type={type}
      aria-pressed={isPressed}
      disabled={disabled}
      className={`inline-flex min-h-touch items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-small font-semibold text-ink transition-colors duration-fast hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-ink disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
