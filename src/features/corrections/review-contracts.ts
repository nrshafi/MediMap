import { catalogId, record } from '../catalog/contracts';
import type { ReportIssue, ReportReceipt, ReportTarget } from './contracts';
import { amountMinor } from '../pricing/contracts';

export const resolutionMessages = {
  saved: 'Report resolution saved.',
  invalid_request: 'Check the decision, reason, target revision, and official evidence.',
  conflict: 'The report or target changed. Review the latest record before resolving it.',
  correction_required:
    'Apply and review the correction in the existing editor before accepting this report.',
  evidence_required: 'Review an official source for this provider before resolving the report.',
  unavailable: 'Report review is unavailable. Your typed reason remains below.',
  not_found: 'The selected report was not found.',
} as const;
export class ResolutionError extends Error {
  constructor(public readonly code: Exclude<keyof typeof resolutionMessages, 'saved'>) {
    super(resolutionMessages[code]);
  }
}
export type ReviewQuery = {
  status: 'pending' | 'accepted' | 'rejected' | 'all';
  report?: string;
  after?: { time: number; id: string };
  sourceAfter?: string;
  source?: string;
  limit: number;
};
export type QueueEntry = {
  id: string;
  targetType: ReportTarget['kind'];
  targetId: string;
  issue: ReportIssue;
  status: ReportReceipt['status'];
  createdAt: number;
  providerName: string;
};
export type ReviewSource = {
  id: string;
  url: string;
  kind: 'official_contact' | 'official_tariff';
  currencyEvidence: string | null;
  retrievedAt: string;
};
export type ResolutionRecord = {
  id: string;
  reportId: string;
  outcome: 'accepted' | 'rejected';
  reason: string;
  actorId: string;
  createdAt: number;
  sourceId: string;
  sourceRow: number | null;
  reviewedTarget: ReportTarget;
  resultingPriceId: string | null;
  resultingPriceStatus: 'verified' | 'disputed' | null;
  priceAction: 'none' | 'review_price' | 'unknown';
};
export type ReviewData = {
  query: ReviewQuery;
  queue: { items: QueueEntry[]; nextCursor: string | null };
  selected: null | {
    report: ReportReceipt;
    reporterId: string;
    current: ReportTarget;
    active: boolean;
    pendingPriceReports: number;
    resolution: ResolutionRecord | null;
  };
  sources: { items: ReviewSource[]; nextCursor: string | null };
  selectedSource: ReviewSource | null;
};
export type ResolutionDraft = Record<string, string | undefined>;
export type ResolutionInput = {
  reportId: string;
  outcome: 'accepted' | 'rejected';
  reason: string;
  sourceId: string;
  sourceRow: number | null;
  reviewedRevision: number;
  reviewedPriceId: string | null;
  priceAction: 'none' | 'review_price' | 'unknown';
  amountMinor: number | null;
  effectiveDate: string | null;
};
export function parseResolution(value: unknown): ResolutionInput {
  try {
    const input = record(value);
    const positive = (value: unknown) => {
      if (
        typeof value !== 'string' ||
        !/^[1-9]\d*$/.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) >= Number.MAX_SAFE_INTEGER
      )
        throw new Error();
      return Number(value);
    };
    if (
      (input.outcome !== 'accepted' && input.outcome !== 'rejected') ||
      input.confirmReview !== 'yes' ||
      typeof input.reason !== 'string' ||
      input.reason.trim().length < 20 ||
      input.reason.length > 2000 ||
      [...input.reason].some((character) => {
        const code = character.charCodeAt(0);
        return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
      })
    )
      throw new Error();
    const priceAction = input.priceAction ?? 'none';
    if (priceAction !== 'none' && priceAction !== 'review_price' && priceAction !== 'unknown')
      throw new Error();
    const sourceRow = input.sourceRow ? positive(input.sourceRow) : null;
    if (priceAction === 'review_price' && (!sourceRow || input.standardPrice !== 'yes'))
      throw new Error();
    const effectiveDate =
      input.effectiveDate === '' || input.effectiveDate === undefined ? null : input.effectiveDate;
    if (
      effectiveDate !== null &&
      (typeof effectiveDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) ||
        !Number.isFinite(Date.parse(effectiveDate)) ||
        new Date(effectiveDate).toISOString().slice(0, 10) !== effectiveDate)
    )
      throw new Error();
    return {
      reportId: catalogId(input.reportId),
      outcome: input.outcome,
      reason: input.reason.trim(),
      sourceId: catalogId(input.sourceId),
      sourceRow,
      reviewedRevision: positive(input.reviewedRevision),
      reviewedPriceId: input.reviewedPriceId ? catalogId(input.reviewedPriceId) : null,
      priceAction,
      amountMinor: priceAction === 'review_price' ? amountMinor(input.amount) : null,
      effectiveDate,
    };
  } catch {
    throw new ResolutionError('invalid_request');
  }
}
export function reviewQuery(value: unknown): ReviewQuery {
  try {
    const input = record(value);
    const status = input.status ?? 'pending';
    if (status !== 'pending' && status !== 'accepted' && status !== 'rejected' && status !== 'all')
      throw new Error();
    const limit = input.limit === undefined ? 30 : Number(input.limit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error();
    let after: ReviewQuery['after'];
    if (input.after !== undefined && input.after !== '') {
      if (typeof input.after !== 'string') throw new Error();
      const match = /^(\d{1,16}):([a-z0-9-]+)$/.exec(input.after);
      if (!match || !Number.isSafeInteger(Number(match[1]))) throw new Error();
      after = { time: Number(match[1]), id: catalogId(match[2]) };
    }
    return {
      status,
      limit,
      ...(after ? { after } : {}),
      ...(input.report ? { report: catalogId(input.report) } : {}),
      ...(input.sourceAfter ? { sourceAfter: catalogId(input.sourceAfter) } : {}),
      ...(input.source ? { source: catalogId(input.source) } : {}),
    };
  } catch {
    throw new ResolutionError('invalid_request');
  }
}
export function reviewHref(input: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (value) query.set(key, value);
  return `/admin/reports${query.size ? `?${query}` : ''}`;
}
