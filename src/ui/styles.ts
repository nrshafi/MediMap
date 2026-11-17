export const ui = {
  buttonPrimary:
    'inline-flex min-h-touch items-center justify-center gap-2 rounded-sm bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60',
  buttonSecondary:
    'inline-flex min-h-touch items-center justify-center gap-2 rounded-sm border border-border-strong bg-surface px-3 text-sm font-semibold text-primary hover:bg-primary-soft hover:text-primary-strong disabled:cursor-not-allowed disabled:opacity-60',
  buttonGhost:
    'inline-flex min-h-touch items-center justify-center gap-2 rounded-sm px-3 text-sm font-semibold text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60',
  link: 'font-medium text-primary underline-offset-2 hover:underline',
  input:
    'min-h-touch w-full rounded-sm border border-border-strong bg-surface px-2.5 text-base text-ink placeholder:text-muted',
  label: 'flex flex-col gap-1 text-sm font-semibold text-ink',
  chip: 'inline-flex min-h-touch items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-semibold text-ink hover:border-border-strong aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-ink',
  card: 'rounded-md border border-border bg-surface p-4',
  metric: 'rounded-sm bg-surface-sunken p-2 text-xs font-semibold text-ink',
  alertError: 'rounded-sm bg-error-soft p-3 text-sm text-error',
  notice: 'rounded-sm border border-border bg-surface-sunken p-3 text-sm text-muted',
  heading1: 'text-2xl font-bold leading-tight text-ink',
  heading2: 'text-lg font-bold leading-snug text-ink',
  muted: 'text-sm text-muted',
  page: 'mx-auto w-full max-w-5xl px-4 py-6 sm:px-6',
  table:
    'w-full border-collapse text-left text-sm [&_td]:border-t [&_td]:border-border [&_td]:p-2 [&_th]:p-2 [&_th]:align-top',
  select:
    'min-h-touch w-full rounded-sm border border-border-strong bg-surface px-2 text-base text-ink',
  floating:
    'rounded-lg border border-border bg-surface text-ink shadow-[0_8px_24px_rgb(20_61_60/0.16)]',
  tile: 'min-w-0 rounded-sm bg-surface-sunken p-2 text-ink',
  tileLabel: 'text-xs font-semibold text-muted',
  tileValue: 'break-words text-sm font-bold [font-feature-settings:"tnum"_1]',
  price: 'text-xl font-bold leading-tight text-ink [font-feature-settings:"tnum"_1]',
} as const;

export const statusBadge: Record<string, string> = {
  verified:
    'inline-flex items-center gap-1 rounded-full bg-verified-soft px-2 py-1 text-xs font-semibold text-verified',
  disputed:
    'inline-flex items-center gap-1 rounded-full bg-disputed-soft px-2 py-1 text-xs font-semibold text-disputed',
  unknown:
    'inline-flex items-center gap-1 rounded-full bg-unknown-soft px-2 py-1 text-xs font-semibold text-unknown',
};
