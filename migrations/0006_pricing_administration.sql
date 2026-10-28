ALTER TABLE branch_services ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0);
ALTER TABLE sources ADD COLUMN collector TEXT;
ALTER TABLE sources ADD COLUMN notes TEXT;
ALTER TABLE sources ADD COLUMN recorded_by TEXT REFERENCES accounts(id);
ALTER TABLE sources ADD COLUMN recorded_at TEXT;
ALTER TABLE prices ADD COLUMN notes TEXT;
ALTER TABLE prices ADD COLUMN created_by TEXT REFERENCES accounts(id);
CREATE UNIQUE INDEX source_snapshot_identity ON sources(provider_id, url, retrieved_at, sha256, kind);

CREATE TABLE listing_changes (
  id TEXT PRIMARY KEY NOT NULL,
  listing_id TEXT NOT NULL REFERENCES branch_services(id),
  previous_revision INTEGER NOT NULL CHECK(previous_revision > 0),
  previous_label TEXT NOT NULL,
  previous_active INTEGER NOT NULL CHECK(previous_active IN (0, 1)),
  previous_price_id TEXT,
  actor_id TEXT NOT NULL REFERENCES accounts(id),
  action TEXT NOT NULL CHECK(action IN ('listing', 'price', 'clear')),
  created_at TEXT NOT NULL,
  UNIQUE(listing_id, previous_revision),
  FOREIGN KEY(listing_id, previous_price_id) REFERENCES prices(listing_id, id)
) STRICT;

CREATE TRIGGER listing_change_guard BEFORE INSERT ON listing_changes
WHEN NOT EXISTS (SELECT 1 FROM branch_services WHERE id = NEW.listing_id AND revision = NEW.previous_revision)
BEGIN SELECT RAISE(ABORT, 'pricing_conflict'); END;
CREATE TRIGGER listing_identity BEFORE UPDATE OF id, branch_id, service_id ON branch_services
WHEN NEW.id != OLD.id OR NEW.branch_id != OLD.branch_id OR NEW.service_id != OLD.service_id
BEGIN SELECT RAISE(ABORT, 'pricing_invalid'); END;
CREATE TRIGGER price_provider_source BEFORE INSERT ON prices
WHEN NEW.source_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM sources s JOIN branch_services bs ON bs.id = NEW.listing_id JOIN branches b ON b.id = bs.branch_id
  WHERE s.id = NEW.source_id AND s.provider_id = b.provider_id AND s.kind = 'official_tariff'
)
BEGIN SELECT RAISE(ABORT, 'pricing_invalid'); END;
CREATE TRIGGER source_snapshot_update BEFORE UPDATE ON sources
BEGIN SELECT RAISE(ABORT, 'Retain immutable source snapshots'); END;
CREATE TRIGGER source_snapshot_delete BEFORE DELETE ON sources
BEGIN SELECT RAISE(ABORT, 'Retain immutable source snapshots'); END;
CREATE TRIGGER listing_changes_update BEFORE UPDATE ON listing_changes
BEGIN SELECT RAISE(ABORT, 'Retain listing change history'); END;
CREATE TRIGGER listing_changes_delete BEFORE DELETE ON listing_changes
BEGIN SELECT RAISE(ABORT, 'Retain listing change history'); END;
