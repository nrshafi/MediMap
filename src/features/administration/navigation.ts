export type AdministrationNavItem = { href: string; label: string };

export const coreAdministrationNavigation: readonly AdministrationNavItem[] = [
  { href: '/admin/catalog', label: 'Catalog' },
  { href: '/admin/catalog/manage', label: 'Manage catalog' },
  { href: '/admin/providers', label: 'Providers and branches' },
  { href: '/admin/prices', label: 'Prices and sources' },
  { href: '/admin/reports', label: 'Correction reports' },
];
