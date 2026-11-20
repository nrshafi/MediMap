import { Link as RouterLink, useRouter } from '@tanstack/react-router';
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from 'react';

type RouterLinkTo = ComponentProps<typeof RouterLink>['to'];

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
  href?: string;
  children?: ReactNode;
}

export function isInternalPageRoute(url?: string): boolean {
  if (!url) return false;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('//') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:')
  ) {
    return false;
  }
  if (url.startsWith('/auth/')) return false;
  if (url.endsWith('.ts') || url.includes('.ts?')) return false;
  return url.startsWith('/');
}

export function Link({ to, href, children, ...props }: LinkProps) {
  const router = useRouter({ warn: false });
  const rawTarget = to ?? href ?? '';

  if (router && isInternalPageRoute(rawTarget)) {
    const [pathname, searchStr] = rawTarget.split('?');
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
        {...(props as unknown as ComponentProps<typeof RouterLink>)}
      >
        {children}
      </RouterLink>
    );
  }

  return (
    <a href={rawTarget} {...props}>
      {children}
    </a>
  );
}
