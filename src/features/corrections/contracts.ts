import { catalogId, record } from '../catalog/contracts';
import { contactWebsite } from '../providers/contracts';
import type { WeeklyHours } from '../providers/hours';

export const issueLabels = {
  price: 'Incorrect price',
  availability: 'Service availability',
  hours: 'Opening hours',
  address: 'Branch address',
  phone: 'Telephone details',
  provider_information: 'Provider information',
  duplicate_listing: 'Duplicate listing',
  service_mapping: 'Incorrect service or variant',
} as const;
export type ReportIssue = keyof typeof issueLabels;
export type TargetKind = 'listing' | 'branch' | 'provider';
export const targetIssues: Record<TargetKind, readonly ReportIssue[]> = {
  listing: ['price', 'availability', 'duplicate_listing', 'service_mapping'],
  branch: ['address', 'hours', 'phone'],
  provider: ['provider_information', 'phone'],
};
export const reportMessages = {
  invalid_request: 'Check the selected issue, report details, and optional evidence link.',
  unavailable: 'Your report was not saved. Try again when reporting is available.',
  target_changed: 'The record changed. Review its current details before submitting again.',
  not_found: 'This record is no longer available for reporting.',
  duplicate: 'You already have a pending report for this record and issue.',
  rate_limited: 'You have reached the report limit. Try again after the rolling limit resets.',
} as const;
export class ReportError extends Error {
  constructor(public readonly code: keyof typeof reportMessages) {
    super(reportMessages[code]);
  }
}
export type ReportPrice = {
  id: string;
  amountMinor: number;
  status: 'verified' | 'unverified' | 'disputed';
  sourceId: string | null;
  sourceRow: number | null;
  verifiedAt: string | null;
  effectiveDate: string | null;
  verificationMethod: string | null;
};
export type ReportTarget = {
  kind: TargetKind;
  id: string;
  revision: number;
  providerId: string;
  providerName: string;
  branchId: string | null;
  listingId: string | null;
  branchName: string | null;
  serviceName: string | null;
  providerServiceName: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: WeeklyHours | null;
  price: ReportPrice | null;
};
export type ReportInput = {
  target: TargetKind;
  id: string;
  issue: ReportIssue;
  observedRevision: number;
  observedPriceId: string | null;
  details: string;
  suggestedCorrection: string | null;
  evidenceUrl: string | null;
};
export type ReportDraft = {
  issue?: string;
  details?: string;
  suggestedCorrection?: string;
  evidenceUrl?: string;
};
export type ReportReceipt = {
  id: string;
  issue: ReportIssue;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  target: ReportTarget;
  details: string;
  suggestedCorrection: string | null;
  evidenceUrl: string | null;
};

export function reportTargetQuery(value: unknown): { target: TargetKind; id: string } {
  try {
    const input = record(value);
    if (input.target !== 'listing' && input.target !== 'branch' && input.target !== 'provider')
      throw new Error();
    return { target: input.target, id: catalogId(input.id) };
  } catch {
    throw new ReportError('invalid_request');
  }
}
function prose(value: unknown, minimum: number, maximum: number): string {
  if (
    typeof value !== 'string' ||
    value.trim().length < minimum ||
    value.length > maximum ||
    [...value].some((char) => {
      const code = char.charCodeAt(0);
      return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
    })
  )
    throw new ReportError('invalid_request');
  return value.trim();
}
export function parseReport(value: unknown): ReportInput {
  try {
    const input = record(value);
    const target = reportTargetQuery(input);
    if (
      typeof input.issue !== 'string' ||
      !targetIssues[target.target].some((issue) => issue === input.issue) ||
      input.confirmReport !== 'yes' ||
      typeof input.observedRevision !== 'string' ||
      !/^[1-9]\d*$/.test(input.observedRevision) ||
      !Number.isSafeInteger(Number(input.observedRevision))
    )
      throw new Error();
    const issue = targetIssues[target.target].find((issue) => issue === input.issue);
    if (!issue) throw new Error();
    const observedPriceId =
      input.observedPriceId === '' || input.observedPriceId === undefined
        ? null
        : catalogId(input.observedPriceId);
    if (target.target !== 'listing' && observedPriceId !== null) throw new Error();
    const evidenceUrl = contactWebsite(input.evidenceUrl);
    if (evidenceUrl && !evidenceUrl.startsWith('https://')) throw new Error();
    return {
      ...target,
      issue,
      observedRevision: Number(input.observedRevision),
      observedPriceId,
      details: prose(input.details, 20, 2000),
      suggestedCorrection:
        input.suggestedCorrection === undefined || input.suggestedCorrection === ''
          ? null
          : prose(input.suggestedCorrection, 1, 500),
      evidenceUrl,
    };
  } catch {
    throw new ReportError('invalid_request');
  }
}
export function reportHref(input: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (value) query.set(key, value);
  return `/report${query.size ? `?${query}` : ''}`;
}
