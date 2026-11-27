export const ui = {
  link: 'font-medium text-primary underline-offset-2 hover:underline',
  // Replaced by Field component (still used in administrative forms)
  label: 'flex flex-col gap-1 text-small font-semibold text-ink',
  heading1: 'font-display text-h1 font-bold text-ink',
  heading2: 'font-display text-h2 font-bold text-ink',
  heading3: 'font-display text-h3 font-semibold text-ink',
  muted: 'text-small text-muted',
  table:
    'w-full border-collapse text-left text-small [&_td]:border-t [&_td]:border-border [&_td]:p-2 [&_th]:p-2 [&_th]:align-top',
} as const;
