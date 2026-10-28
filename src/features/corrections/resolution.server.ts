import { readReportTarget } from './targets.server';
import { ResolutionError, type ResolutionInput } from './review-contracts';
import { AuthError } from '../authentication/contracts';

export class ResolutionRepository {
  constructor(private readonly db: D1Database) {}
  async resolve(input: ResolutionInput, actorId: string, now = Date.now()) {
    const report = await this.db
      .prepare('SELECT target_type, target_id FROM correction_reports WHERE id = ?')
      .bind(input.reportId)
      .first<Record<string, unknown>>();
    if (!report) throw new ResolutionError('not_found');
    const current = await readReportTarget(
      this.db,
      { target: report.target_type, id: report.target_id },
      true,
    );
    if (!current) throw new ResolutionError('not_found');
    const id = crypto.randomUUID();
    try {
      await this.db
        .prepare(
          `INSERT INTO report_resolutions(id,report_id,actor_id,outcome,reason,source_id,source_row,created_at,reviewed_revision,reviewed_price_id,reviewed_target,confirmed_review,price_action,amount_minor,effective_date,resulting_price_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?)`,
        )
        .bind(
          id,
          input.reportId,
          actorId,
          input.outcome,
          input.reason,
          input.sourceId,
          input.sourceRow,
          now,
          input.reviewedRevision,
          input.reviewedPriceId,
          JSON.stringify(current),
          input.priceAction,
          input.amountMinor,
          input.effectiveDate,
          input.priceAction === 'review_price' ? `${id}-price` : null,
        )
        .run();
      return { reportId: input.reportId, id };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('resolution_forbidden')) throw new AuthError('forbidden');
      if (
        message.includes('resolution_conflict') ||
        message.includes('report_resolutions.report_id') ||
        message.includes('pricing_conflict')
      )
        throw new ResolutionError('conflict');
      if (message.includes('resolution_correction_required'))
        throw new ResolutionError('correction_required');
      if (message.includes('resolution_evidence') || message.includes('FOREIGN KEY'))
        throw new ResolutionError('evidence_required');
      if (message.includes('resolution_invalid')) throw new ResolutionError('invalid_request');
      throw new ResolutionError('unavailable');
    }
  }
}
