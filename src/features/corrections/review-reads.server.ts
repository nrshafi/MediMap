import { catalogId } from '../catalog/contracts';
import { contactWebsite } from '../providers/contracts';
import { utcTimestamp } from '../pricing/contracts';
import { issueLabels, type ReportReceipt } from './contracts';
import { CorrectionRepository, decodeSnapshot } from './repository.server';
import { readReportTarget } from './targets.server';
import {
  ResolutionError,
  reviewQuery,
  type QueueEntry,
  type ReviewData,
  type ReviewSource,
} from './review-contracts';

function entry(row: Record<string, unknown>): QueueEntry {
  const issue = Object.keys(issueLabels).find((key) => key === row.issue_type);
  if (
    !issue ||
    !isIssue(issue) ||
    (row.target_type !== 'listing' &&
      row.target_type !== 'branch' &&
      row.target_type !== 'provider') ||
    (row.status !== 'pending' && row.status !== 'accepted' && row.status !== 'rejected') ||
    typeof row.created_at !== 'number' ||
    !Number.isSafeInteger(row.created_at) ||
    typeof row.provider_name !== 'string'
  )
    throw new Error('Invalid stored queue entry');
  return {
    id: catalogId(row.id),
    targetType: row.target_type,
    targetId: catalogId(row.target_id),
    issue,
    status: row.status,
    createdAt: row.created_at,
    providerName: row.provider_name,
  };
}
function isIssue(value: string): value is keyof typeof issueLabels {
  return Object.hasOwn(issueLabels, value);
}
export function reviewSource(row: Record<string, unknown>): ReviewSource {
  const url = contactWebsite(row.url);
  if (
    !url?.startsWith('https://') ||
    (row.kind !== 'official_contact' && row.kind !== 'official_tariff') ||
    typeof row.retrieved_at !== 'string' ||
    (row.currency_evidence !== null &&
      row.currency_evidence !== 'explicit_taka_header' &&
      row.currency_evidence !== 'explicit_taka_symbol')
  )
    throw new Error('Invalid stored review evidence');
  return {
    id: catalogId(row.id),
    url,
    kind: row.kind,
    retrievedAt: utcTimestamp(row.retrieved_at),
    currencyEvidence: row.currency_evidence,
  };
}
export class ReviewReads {
  constructor(private readonly db: D1Database) {}
  async read(input: unknown): Promise<ReviewData> {
    const query = reviewQuery(input);
    const result = await this.db
      .prepare(
        `SELECT r.id,r.target_type,r.target_id,r.issue_type,r.status,r.created_at,p.name AS provider_name FROM correction_reports r JOIN providers p ON p.id = r.provider_id
      WHERE (? = 'all' OR r.status = ?) AND (r.created_at > ? OR (r.created_at = ? AND r.id > ?)) ORDER BY r.created_at,r.id LIMIT ?`,
      )
      .bind(
        query.status,
        query.status,
        query.after?.time ?? -1,
        query.after?.time ?? -1,
        query.after?.id ?? '',
        query.limit + 1,
      )
      .all<Record<string, unknown>>();
    const rows = result.results.slice(0, query.limit).map(entry);
    const last = rows.at(-1);
    const data: ReviewData = {
      query,
      queue: {
        items: rows,
        nextCursor:
          result.results.length > query.limit && last ? `${last.createdAt}:${last.id}` : null,
      },
      selected: null,
      sources: { items: [], nextCursor: null },
      selectedSource: null,
    };
    if (!query.report) return data;
    const row = await this.db
      .prepare(
        'SELECT reporter_id, target_type, target_id, listing_id, provider_id FROM correction_reports WHERE id = ?',
      )
      .bind(query.report)
      .first<Record<string, unknown>>();
    if (!row) throw new ResolutionError('not_found');
    const reporterId = catalogId(row.reporter_id);
    const report: ReportReceipt | null = await new CorrectionRepository(this.db).ownReceipt(
      query.report,
      reporterId,
    );
    const current = await readReportTarget(
      this.db,
      { target: row.target_type, id: row.target_id },
      true,
    );
    if (!report || !current) throw new ResolutionError('not_found');
    const table =
      current.kind === 'listing'
        ? 'branch_services'
        : current.kind === 'branch'
          ? 'branches'
          : 'providers';
    const active = await this.db
      .prepare(`SELECT active FROM ${table} WHERE id = ?`)
      .bind(current.id)
      .first<number>('active');
    const pending =
      row.listing_id === null
        ? 0
        : await this.db
            .prepare(
              "SELECT COUNT(*) AS count FROM correction_reports WHERE listing_id = ? AND issue_type = 'price' AND status = 'pending'",
            )
            .bind(row.listing_id)
            .first<number>('count');
    data.selected = {
      report,
      reporterId,
      current,
      active: active === 1,
      pendingPriceReports: pending ?? 0,
      resolution: null,
    };
    const resolution = await this.db
      .prepare(
        'SELECT rr.*,pr.status AS resulting_status FROM report_resolutions rr LEFT JOIN prices pr ON pr.id = rr.resulting_price_id WHERE rr.report_id = ?',
      )
      .bind(report.id)
      .first<Record<string, unknown>>();
    if (resolution) {
      if (
        (resolution.outcome !== 'accepted' && resolution.outcome !== 'rejected') ||
        typeof resolution.reason !== 'string' ||
        typeof resolution.created_at !== 'number' ||
        !Number.isSafeInteger(resolution.created_at) ||
        typeof resolution.reviewed_target !== 'string' ||
        (resolution.price_action !== 'none' &&
          resolution.price_action !== 'review_price' &&
          resolution.price_action !== 'unknown') ||
        (resolution.resulting_status !== null &&
          resolution.resulting_status !== 'verified' &&
          resolution.resulting_status !== 'disputed') ||
        (resolution.source_row !== null &&
          (typeof resolution.source_row !== 'number' ||
            !Number.isSafeInteger(resolution.source_row) ||
            resolution.source_row < 1))
      )
        throw new Error('Invalid stored report resolution');
      data.selected.resolution = {
        id: catalogId(resolution.id),
        reportId: report.id,
        outcome: resolution.outcome,
        reason: resolution.reason,
        actorId: catalogId(resolution.actor_id),
        createdAt: resolution.created_at,
        sourceId: catalogId(resolution.source_id),
        sourceRow: resolution.source_row,
        reviewedTarget: decodeSnapshot(JSON.parse(resolution.reviewed_target)),
        resultingPriceId:
          resolution.resulting_price_id === null ? null : catalogId(resolution.resulting_price_id),
        resultingPriceStatus: resolution.resulting_status,
        priceAction: resolution.price_action,
      };
    }
    const sources = await this.db
      .prepare(
        'SELECT id,url,kind,currency_evidence,retrieved_at FROM sources WHERE provider_id = ? AND id > ? ORDER BY id LIMIT ?',
      )
      .bind(current.providerId, query.sourceAfter ?? '', query.limit + 1)
      .all<Record<string, unknown>>();
    data.sources.items = sources.results.slice(0, query.limit).map(reviewSource);
    data.sources.nextCursor =
      sources.results.length > query.limit ? (data.sources.items.at(-1)?.id ?? null) : null;
    const selectedSourceId = query.source ?? current.price?.sourceId;
    if (selectedSourceId) {
      const source = await this.db
        .prepare(
          'SELECT id,url,kind,currency_evidence,retrieved_at FROM sources WHERE provider_id = ? AND id = ?',
        )
        .bind(current.providerId, selectedSourceId)
        .first<Record<string, unknown>>();
      data.selectedSource = source ? reviewSource(source) : null;
    }
    return data;
  }
}
