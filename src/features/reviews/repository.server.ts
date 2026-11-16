import { catalogId } from '../catalog/contracts';
import { reviewInput } from './contracts';
export class ReviewRepository {
  constructor(private db: D1Database) {}
  async aggregate(kind: 'branch' | 'provider', id: string) {
    const clause = kind === 'branch' ? 'b.id=?' : 'p.id=?';
    return this.db
      .prepare(
        `SELECT COUNT(*) AS count,AVG((json_extract(r.scores,'$[0]')+json_extract(r.scores,'$[1]')+json_extract(r.scores,'$[2]')+json_extract(r.scores,'$[3]')+json_extract(r.scores,'$[4]')+json_extract(r.scores,'$[5]'))/6.0) AS mean FROM service_reviews r JOIN branch_services bs ON bs.id=r.listing_id JOIN branches b ON b.id=bs.branch_id JOIN providers p ON p.id=b.provider_id JOIN services s ON s.id=bs.service_id JOIN categories c ON c.id=s.category_id WHERE r.visibility='visible' AND bs.active=1 AND b.active=1 AND p.active=1 AND s.active=1 AND c.active=1 AND ${clause}`,
      )
      .bind(catalogId(id))
      .first<{ count: number; mean: number | null }>();
  }
  async list(listing: string, after?: string) {
    catalogId(listing);
    if (after) catalogId(after);
    return (
      await this.db
        .prepare(
          "SELECT id,scores,body,created_at,updated_at FROM service_reviews WHERE listing_id=? AND visibility='visible' AND id>? ORDER BY id LIMIT 21",
        )
        .bind(listing, after ?? '')
        .all<{ id: string; scores: string; body: string; created_at: number; updated_at: number }>()
    ).results;
  }
  async own(listing: string, account: string) {
    return this.db
      .prepare(
        'SELECT id,scores,body,revision,visibility FROM service_reviews WHERE listing_id=? AND account_id=?',
      )
      .bind(catalogId(listing), account)
      .first<{ id: string; scores: string; body: string; revision: number; visibility: string }>();
  }
  async summary(listing: string) {
    return this.db
      .prepare(
        "SELECT COUNT(*) AS count,AVG((json_extract(scores,'$[0]')+json_extract(scores,'$[1]')+json_extract(scores,'$[2]')+json_extract(scores,'$[3]')+json_extract(scores,'$[4]')+json_extract(scores,'$[5]'))/6.0) AS mean FROM service_reviews WHERE listing_id=? AND visibility='visible'",
      )
      .bind(catalogId(listing))
      .first<{ count: number; mean: number | null }>();
  }
  async save(account: string, value: unknown) {
    const input = reviewInput(value),
      now = Date.now();
    const result = await this.db
      .prepare(
        `INSERT INTO service_reviews(id,account_id,listing_id,scores,body,created_at,updated_at)
 SELECT ?,?,?,?,?,?,? WHERE ?=0 AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND active=1)
 AND EXISTS(SELECT 1 FROM branch_services bs JOIN branches b ON b.id=bs.branch_id JOIN providers p ON p.id=b.provider_id JOIN services s ON s.id=bs.service_id JOIN categories c ON c.id=s.category_id WHERE bs.id=? AND bs.active=1 AND b.active=1 AND p.active=1 AND s.active=1 AND c.active=1)
 ON CONFLICT(account_id,listing_id) DO NOTHING`,
      )
      .bind(
        crypto.randomUUID(),
        account,
        input.listing,
        JSON.stringify(input.scores),
        input.body,
        now,
        now,
        input.revision,
        account,
        input.listing,
      )
      .run();
    if (input.revision === 0) {
      if (result.meta.changes < 1)
        throw new Error('Review already exists or listing is unavailable.');
      return;
    }
    const edit = await this.db
      .prepare(
        "UPDATE service_reviews SET scores=?,body=?,updated_at=?,revision=revision+1 WHERE listing_id=? AND account_id=? AND revision=? AND visibility!='removed' AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND active=1)",
      )
      .bind(
        JSON.stringify(input.scores),
        input.body,
        now,
        input.listing,
        account,
        input.revision,
        account,
      )
      .run();
    if (edit.meta.changes < 1)
      throw new Error('Review changed or cannot be edited. Reload before trying again.');
  }
}
