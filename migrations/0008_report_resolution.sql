CREATE TABLE report_resolutions (
  id TEXT PRIMARY KEY NOT NULL,
  report_id TEXT NOT NULL UNIQUE REFERENCES correction_reports(id),
  actor_id TEXT NOT NULL REFERENCES accounts(id),
  outcome TEXT NOT NULL CHECK(outcome IN ('accepted', 'rejected')),
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 20 AND 2000),
  source_id TEXT NOT NULL REFERENCES sources(id),
  source_row INTEGER CHECK(source_row > 0),
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  reviewed_revision INTEGER NOT NULL CHECK(reviewed_revision > 0),
  reviewed_price_id TEXT REFERENCES prices(id),
  reviewed_target TEXT NOT NULL CHECK(json_valid(reviewed_target) AND json_type(reviewed_target) = 'object'),
  confirmed_review INTEGER NOT NULL CHECK(confirmed_review = 1),
  price_action TEXT NOT NULL DEFAULT 'none' CHECK(price_action IN ('none', 'review_price', 'unknown')),
  amount_minor INTEGER CHECK(amount_minor > 0 AND amount_minor <= 9007199254740991),
  effective_date TEXT,
  resulting_price_id TEXT REFERENCES prices(id) DEFERRABLE INITIALLY DEFERRED,
  CHECK((price_action = 'none' AND amount_minor IS NULL AND resulting_price_id IS NULL) OR
    (price_action = 'unknown' AND amount_minor IS NULL AND resulting_price_id IS NULL) OR
    (price_action = 'review_price' AND amount_minor IS NOT NULL AND source_row IS NOT NULL AND resulting_price_id IS NOT NULL))
) STRICT;
CREATE INDEX report_resolution_actor ON report_resolutions(actor_id, created_at);

CREATE TRIGGER report_resolution_guard BEFORE INSERT ON report_resolutions
BEGIN
  SELECT RAISE(ABORT, 'resolution_forbidden') WHERE NOT EXISTS (
    SELECT 1 FROM accounts a JOIN administrator_grants g ON g.account_id = a.id WHERE a.id = NEW.actor_id AND a.active = 1
  );
  SELECT RAISE(ABORT, 'resolution_conflict') WHERE NOT EXISTS (SELECT 1 FROM correction_reports WHERE id = NEW.report_id AND status = 'pending');
  SELECT RAISE(ABORT, 'resolution_evidence') WHERE NOT EXISTS (
    SELECT 1 FROM correction_reports r JOIN sources s ON s.provider_id = r.provider_id
    WHERE r.id = NEW.report_id AND s.id = NEW.source_id
      AND (r.target_type = 'listing' OR s.kind = 'official_contact')
  );
  SELECT RAISE(ABORT, 'resolution_conflict') WHERE EXISTS (
    SELECT 1 FROM correction_reports r WHERE r.id = NEW.report_id AND r.target_type = 'provider' AND NOT EXISTS (
      SELECT 1 FROM providers WHERE id = r.target_id AND revision = NEW.reviewed_revision
    )
  );
  SELECT RAISE(ABORT, 'resolution_conflict') WHERE EXISTS (
    SELECT 1 FROM correction_reports r WHERE r.id = NEW.report_id AND r.target_type = 'branch' AND NOT EXISTS (
      SELECT 1 FROM branches WHERE id = r.target_id AND revision = NEW.reviewed_revision
    )
  );
  SELECT RAISE(ABORT, 'resolution_conflict') WHERE EXISTS (
    SELECT 1 FROM correction_reports r WHERE r.id = NEW.report_id AND r.target_type = 'listing' AND NOT EXISTS (
      SELECT 1 FROM branch_services WHERE id = r.target_id AND revision = NEW.reviewed_revision AND current_price_id IS NEW.reviewed_price_id
    )
  );
  SELECT RAISE(ABORT, 'resolution_correction_required') WHERE NEW.outcome = 'accepted' AND EXISTS (
    SELECT 1 FROM correction_reports WHERE id = NEW.report_id AND issue_type != 'price' AND observed_revision >= NEW.reviewed_revision
  );
  SELECT RAISE(ABORT, 'resolution_invalid') WHERE NEW.price_action != 'none' AND EXISTS (SELECT 1 FROM correction_reports WHERE id = NEW.report_id AND issue_type != 'price');
  SELECT RAISE(ABORT, 'resolution_invalid') WHERE NEW.reviewed_price_id IS NOT NULL AND EXISTS (SELECT 1 FROM correction_reports WHERE id = NEW.report_id AND target_type != 'listing');
  SELECT RAISE(ABORT, 'resolution_invalid') WHERE NEW.price_action = 'none' AND EXISTS (SELECT 1 FROM correction_reports WHERE id = NEW.report_id AND issue_type = 'price');
  SELECT RAISE(ABORT, 'resolution_evidence') WHERE NEW.price_action = 'review_price' AND NOT EXISTS (
    SELECT 1 FROM sources WHERE id = NEW.source_id AND kind = 'official_tariff' AND currency_evidence IS NOT NULL
  );
  SELECT RAISE(ABORT, 'resolution_invalid') WHERE NEW.price_action = 'review_price' AND NEW.resulting_price_id != NEW.id || '-price';
  SELECT RAISE(ABORT, 'resolution_invalid') WHERE NEW.outcome = 'rejected' AND EXISTS (
    SELECT 1 FROM correction_reports r JOIN branch_services bs ON bs.id = r.listing_id LEFT JOIN prices pr ON pr.id = bs.current_price_id AND pr.listing_id = bs.id
    WHERE r.id = NEW.report_id AND r.issue_type = 'price' AND (
      (NEW.price_action = 'unknown' AND bs.current_price_id IS NOT NULL) OR
      (NEW.price_action = 'review_price' AND (bs.current_price_id IS NULL OR pr.amount_minor != NEW.amount_minor OR pr.effective_date IS NOT NEW.effective_date))
    )
  );
END;

CREATE TRIGGER report_resolution_apply AFTER INSERT ON report_resolutions
BEGIN
  UPDATE correction_reports SET status = NEW.outcome WHERE id = NEW.report_id;
  INSERT INTO listing_changes(id, listing_id, previous_revision, previous_label, previous_active, previous_price_id, actor_id, action, created_at)
    SELECT NEW.id || '-change', bs.id, bs.revision, bs.provider_service_name, bs.active, bs.current_price_id, NEW.actor_id, 'price', strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at / 1000.0, 'unixepoch')
    FROM correction_reports r JOIN branch_services bs ON bs.id = r.listing_id WHERE r.id = NEW.report_id AND r.issue_type = 'price';
  INSERT INTO prices(id, listing_id, amount_minor, currency, status, source_id, source_row, verified_at, verification_method, effective_date, created_at, notes, created_by)
    SELECT NEW.resulting_price_id, r.listing_id, NEW.amount_minor, 'BDT',
      CASE WHEN EXISTS (SELECT 1 FROM correction_reports pending WHERE pending.listing_id = r.listing_id AND pending.issue_type = 'price' AND pending.status = 'pending') THEN 'disputed' ELSE 'verified' END,
      NEW.source_id, NEW.source_row, strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at / 1000.0, 'unixepoch'), 'official_website_review', NEW.effective_date,
      strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at / 1000.0, 'unixepoch'), 'Administrator report resolution', NEW.actor_id
    FROM correction_reports r WHERE r.id = NEW.report_id AND r.issue_type = 'price' AND NEW.price_action = 'review_price';
  UPDATE branch_services SET current_price_id = NEW.resulting_price_id, revision = revision + 1
    WHERE id = (SELECT listing_id FROM correction_reports WHERE id = NEW.report_id AND issue_type = 'price');
END;

CREATE TRIGGER report_status_resolution BEFORE UPDATE OF status ON correction_reports
WHEN NEW.status != OLD.status AND (OLD.status != 'pending' OR NEW.status = 'pending' OR NOT EXISTS (
  SELECT 1 FROM report_resolutions WHERE report_id = OLD.id AND outcome = NEW.status
))
BEGIN SELECT RAISE(ABORT, 'Retain an authorized resolution before changing report status'); END;
CREATE TRIGGER report_resolution_update BEFORE UPDATE ON report_resolutions
BEGIN SELECT RAISE(ABORT, 'Retain immutable report resolutions'); END;
CREATE TRIGGER report_resolution_delete BEFORE DELETE ON report_resolutions
BEGIN SELECT RAISE(ABORT, 'Retain report resolution history'); END;
