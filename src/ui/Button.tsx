import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Link as RouterLink, useRouter } from '@tanstack/react-router';
import { Link } from './Link';

type RouterLinkTo = ComponentProps<typeof RouterLink>['to'];

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'default' | 'small';

const baseClasses =
  'inline-flex min-h-touch items-center justify-center gap-2 rounded-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong',
  secondary:
    'border border-border-strong bg-surface text-primary hover:bg-primary-soft hover:text-primary-strong',
  ghost: 'text-primary hover:bg-primary-soft',
  danger: 'bg-error text-on-primary hover:bg-error-strong',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'px-3 py-2 text-small',
  small: 'px-2.5 py-1 text-label',
};

export function buttonStyles({
  variant = 'primary',
  size = 'default',
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  as?: 'a' | typeof RouterLink | typeof Link;
  to?: string;
}

export function ButtonLink({
  variant = 'primary',
  size = 'default',
  className = '',
  children,
  icon,
  as: Component,
  to,
  href,
  ...props
}: ButtonLinkProps) {
  const router = useRouter({ warn: false });
  const target = to ?? href ?? '';
  const styles = buttonStyles({ variant, size, className });

  const shouldUseRouterLink =
    (Component === RouterLink || Component === Link || to !== undefined) && Boolean(router);

  if (shouldUseRouterLink) {
    const [pathname, searchStr] = target.split('?');
    const search = searchStr
      ? Object.fromEntries(
          Array.from(new URLSearchParams(searchStr).entries()).map(([k, v]) => {
            const num = Number(v);
            return [k, !isNaN(num) && v.trim() !== '' ? num : v];
          }),
        )
      : undefined;

    return (
      <RouterLink
        to={pathname as unknown as RouterLinkTo}
        search={(search ? () => search : undefined) as never}
        className={styles}
        {...(props as unknown as ComponentProps<typeof RouterLink>)}
      >
        {icon}
        {children}
      </RouterLink>
    );
  }

  return (
    <a href={target} className={styles} {...props}>
      {icon}
      {children}
    </a>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'default',
  pending = false,
  disabled = false,
  className = '',
  children,
  icon,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending ? 'true' : undefined}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {pending ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
