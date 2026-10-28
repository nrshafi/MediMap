CREATE TABLE correction_reports (
  id TEXT PRIMARY KEY NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES accounts(id),
  target_type TEXT NOT NULL CHECK(target_type IN ('listing', 'branch', 'provider')),
  target_id TEXT NOT NULL,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  branch_id TEXT REFERENCES branches(id),
  listing_id TEXT REFERENCES branch_services(id),
  issue_type TEXT NOT NULL CHECK(issue_type IN ('price', 'availability', 'hours', 'address', 'phone', 'provider_information', 'duplicate_listing', 'service_mapping')),
  observed_revision INTEGER NOT NULL CHECK(observed_revision > 0),
  observed_price_id TEXT,
  target_snapshot TEXT NOT NULL CHECK(json_valid(target_snapshot) AND json_type(target_snapshot) = 'object'),
  details TEXT NOT NULL CHECK(length(trim(details)) BETWEEN 20 AND 2000),
  suggested_correction TEXT CHECK(suggested_correction IS NULL OR length(suggested_correction) <= 500),
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  FOREIGN KEY(listing_id, observed_price_id) REFERENCES prices(listing_id, id),
  CHECK((target_type = 'listing' AND listing_id IS NOT NULL AND listing_id = target_id AND branch_id IS NOT NULL AND issue_type IN ('price', 'availability', 'duplicate_listing', 'service_mapping')) OR
    (target_type = 'branch' AND branch_id IS NOT NULL AND branch_id = target_id AND listing_id IS NULL AND observed_price_id IS NULL AND issue_type IN ('hours', 'address', 'phone')) OR
    (target_type = 'provider' AND provider_id = target_id AND branch_id IS NULL AND listing_id IS NULL AND observed_price_id IS NULL AND issue_type IN ('provider_information', 'phone')))
) STRICT;
CREATE UNIQUE INDEX correction_pending_duplicate ON correction_reports(reporter_id, target_type, target_id, issue_type) WHERE status = 'pending';
CREATE INDEX correction_reporter_time ON correction_reports(reporter_id, created_at);
CREATE INDEX correction_listing_pending ON correction_reports(listing_id, issue_type, status);

CREATE TRIGGER correction_submission_guard BEFORE INSERT ON correction_reports
BEGIN
  SELECT RAISE(ABORT, 'report_invalid') WHERE NEW.status != 'pending' OR NOT EXISTS (SELECT 1 FROM accounts WHERE id = NEW.reporter_id AND active = 1);
  SELECT RAISE(ABORT, 'report_duplicate') WHERE EXISTS (SELECT 1 FROM correction_reports WHERE reporter_id = NEW.reporter_id AND target_type = NEW.target_type AND target_id = NEW.target_id AND issue_type = NEW.issue_type AND status = 'pending');
  SELECT RAISE(ABORT, 'report_rate_limit') WHERE (SELECT COUNT(*) FROM correction_reports WHERE reporter_id = NEW.reporter_id AND created_at > NEW.created_at - 86400000) >= 5;
  SELECT RAISE(ABORT, 'report_target_changed') WHERE NEW.target_type = 'provider' AND NOT EXISTS (SELECT 1 FROM providers WHERE id = NEW.target_id AND revision = NEW.observed_revision AND active = 1);
  SELECT RAISE(ABORT, 'report_target_changed') WHERE NEW.target_type = 'branch' AND NOT EXISTS (
    SELECT 1 FROM branches b JOIN providers p ON p.id = b.provider_id AND p.active = 1
    WHERE b.id = NEW.target_id AND b.provider_id = NEW.provider_id AND b.revision = NEW.observed_revision AND b.active = 1
  );
  SELECT RAISE(ABORT, 'report_target_changed') WHERE NEW.target_type = 'listing' AND NOT EXISTS (
    SELECT 1 FROM branch_services bs JOIN branches b ON b.id = bs.branch_id AND b.active = 1 JOIN providers p ON p.id = b.provider_id AND p.active = 1
    JOIN services s ON s.id = bs.service_id AND s.active = 1 JOIN categories c ON c.id = s.category_id AND c.active = 1
    WHERE bs.id = NEW.target_id AND bs.branch_id = NEW.branch_id AND b.provider_id = NEW.provider_id AND bs.revision = NEW.observed_revision
      AND bs.current_price_id IS NEW.observed_price_id AND bs.active = 1
  );
END;

CREATE TRIGGER correction_dispute_price AFTER INSERT ON correction_reports
WHEN NEW.issue_type = 'price'
BEGIN
  INSERT INTO listing_changes(id, listing_id, previous_revision, previous_label, previous_active, previous_price_id, actor_id, action, created_at)
    SELECT NEW.id || '-change', bs.id, bs.revision, bs.provider_service_name, bs.active, bs.current_price_id, NEW.reporter_id, 'price', strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at / 1000.0, 'unixepoch')
    FROM branch_services bs JOIN prices pr ON pr.id = bs.current_price_id AND pr.listing_id = bs.id WHERE bs.id = NEW.listing_id AND pr.status != 'disputed';
  INSERT INTO prices(id, listing_id, amount_minor, currency, status, source_id, source_row, verified_at, effective_date, verification_method, created_at, notes, created_by)
    SELECT NEW.id || '-disputed', bs.id, pr.amount_minor, pr.currency, 'disputed', pr.source_id, pr.source_row, pr.verified_at, pr.effective_date, pr.verification_method,
      strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at / 1000.0, 'unixepoch'), 'Pending incorrect-price report', NEW.reporter_id
    FROM branch_services bs JOIN prices pr ON pr.id = bs.current_price_id AND pr.listing_id = bs.id WHERE bs.id = NEW.listing_id AND pr.status != 'disputed';
  UPDATE branch_services SET current_price_id = NEW.id || '-disputed', revision = revision + 1
    WHERE id = NEW.listing_id AND EXISTS (SELECT 1 FROM prices WHERE id = NEW.id || '-disputed' AND listing_id = NEW.listing_id);
END;

CREATE TRIGGER correction_submission_immutable BEFORE UPDATE ON correction_reports
WHEN NEW.id != OLD.id OR NEW.reporter_id != OLD.reporter_id OR NEW.target_type != OLD.target_type OR NEW.target_id != OLD.target_id
  OR NEW.provider_id != OLD.provider_id OR NEW.branch_id IS NOT OLD.branch_id OR NEW.listing_id IS NOT OLD.listing_id OR NEW.issue_type != OLD.issue_type
  OR NEW.observed_revision != OLD.observed_revision OR NEW.observed_price_id IS NOT OLD.observed_price_id OR NEW.target_snapshot != OLD.target_snapshot
  OR NEW.details != OLD.details OR NEW.suggested_correction IS NOT OLD.suggested_correction OR NEW.evidence_url IS NOT OLD.evidence_url OR NEW.created_at != OLD.created_at
BEGIN SELECT RAISE(ABORT, 'Retain original correction report'); END;
CREATE TRIGGER correction_submission_delete BEFORE DELETE ON correction_reports
BEGIN SELECT RAISE(ABORT, 'Retain correction report history'); END;
CREATE TRIGGER pending_report_verified_price BEFORE INSERT ON prices
WHEN NEW.status = 'verified' AND EXISTS (SELECT 1 FROM correction_reports WHERE listing_id = NEW.listing_id AND issue_type = 'price' AND status = 'pending')
BEGIN SELECT RAISE(ABORT, 'price_report_pending'); END;
CREATE TRIGGER pending_report_verified_pointer BEFORE UPDATE OF current_price_id ON branch_services
WHEN EXISTS (SELECT 1 FROM correction_reports WHERE listing_id = NEW.id AND issue_type = 'price' AND status = 'pending')
  AND EXISTS (SELECT 1 FROM prices WHERE id = NEW.current_price_id AND listing_id = NEW.id AND status = 'verified')
BEGIN SELECT RAISE(ABORT, 'price_report_pending'); END;
