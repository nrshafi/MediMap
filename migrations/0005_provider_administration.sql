-- Existing reviewed provider and branch names are ASCII. New writers supply normalized keys.
ALTER TABLE providers ADD COLUMN phone TEXT;
ALTER TABLE providers ADD COLUMN website TEXT;
ALTER TABLE providers ADD COLUMN search_key TEXT NOT NULL DEFAULT '';
ALTER TABLE providers ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0);
ALTER TABLE branches ADD COLUMN alternative_phone TEXT;
ALTER TABLE branches ADD COLUMN website TEXT;
ALTER TABLE branches ADD COLUMN search_key TEXT NOT NULL DEFAULT '';
ALTER TABLE branches ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0);

UPDATE providers SET search_key = lower(trim(name));
UPDATE branches SET search_key = lower(trim(name));
CREATE UNIQUE INDEX providers_search_key ON providers(search_key);
CREATE UNIQUE INDEX branches_provider_search_key ON branches(provider_id, search_key);

CREATE TRIGGER provider_insert_key BEFORE INSERT ON providers
WHEN length(trim(NEW.search_key)) = 0
BEGIN SELECT RAISE(ABORT, 'provider_invalid_record'); END;
CREATE TRIGGER provider_update_key BEFORE UPDATE ON providers
WHEN length(trim(NEW.search_key)) = 0 OR NEW.id != OLD.id
BEGIN SELECT RAISE(ABORT, 'provider_invalid_record'); END;
CREATE TRIGGER branch_insert_key BEFORE INSERT ON branches
WHEN length(trim(NEW.search_key)) = 0
BEGIN SELECT RAISE(ABORT, 'provider_invalid_record'); END;
CREATE TRIGGER branch_update_ownership BEFORE UPDATE ON branches
WHEN length(trim(NEW.search_key)) = 0 OR NEW.id != OLD.id OR NEW.provider_id != OLD.provider_id
BEGIN SELECT RAISE(ABORT, 'provider_invalid_record'); END;

CREATE TRIGGER branch_insert_contact BEFORE INSERT ON branches
WHEN NEW.contact_source_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM sources WHERE id = NEW.contact_source_id AND provider_id = NEW.provider_id AND kind = 'official_contact'
)
BEGIN SELECT RAISE(ABORT, 'provider_invalid_record'); END;
CREATE TRIGGER branch_update_contact BEFORE UPDATE OF contact_source_id ON branches
WHEN NEW.contact_source_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM sources WHERE id = NEW.contact_source_id AND provider_id = NEW.provider_id AND kind = 'official_contact'
)
BEGIN SELECT RAISE(ABORT, 'provider_invalid_record'); END;

CREATE TRIGGER branch_insert_hours BEFORE INSERT ON branches
WHEN NEW.opening_hours IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'provider_invalid_record') WHERE json_valid(NEW.opening_hours) = 0;
  SELECT RAISE(ABORT, 'provider_invalid_record') WHERE json_type(NEW.opening_hours) != 'object'
    OR json_extract(NEW.opening_hours, '$.timeZone') IS NOT 'Asia/Dhaka'
    OR json_type(NEW.opening_hours, '$.days') IS NOT 'object'
    ;
END;
CREATE TRIGGER branch_update_hours BEFORE UPDATE OF opening_hours ON branches
WHEN NEW.opening_hours IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'provider_invalid_record') WHERE json_valid(NEW.opening_hours) = 0;
  SELECT RAISE(ABORT, 'provider_invalid_record') WHERE json_type(NEW.opening_hours) != 'object'
    OR json_extract(NEW.opening_hours, '$.timeZone') IS NOT 'Asia/Dhaka'
    OR json_type(NEW.opening_hours, '$.days') IS NOT 'object'
    ;
END;
