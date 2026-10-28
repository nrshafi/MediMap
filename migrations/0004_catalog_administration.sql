-- Existing reviewed names and aliases are ASCII. New writers supply Unicode-normalized keys.
ALTER TABLE categories ADD COLUMN search_key TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0);
ALTER TABLE services ADD COLUMN search_key TEXT NOT NULL DEFAULT '';
ALTER TABLE services ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0);
ALTER TABLE service_aliases ADD COLUMN search_key TEXT NOT NULL DEFAULT '';
ALTER TABLE service_aliases ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0);
ALTER TABLE service_aliases ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1));

UPDATE categories SET search_key = lower(trim(name));
UPDATE services SET search_key = lower(trim(name));
UPDATE service_aliases SET search_key = lower(trim(alias));

CREATE UNIQUE INDEX categories_search_key ON categories(search_key);
CREATE UNIQUE INDEX services_search_key ON services(search_key);
CREATE UNIQUE INDEX aliases_search_key ON service_aliases(search_key);

CREATE TRIGGER category_insert_key BEFORE INSERT ON categories
WHEN length(trim(NEW.search_key)) = 0
BEGIN SELECT RAISE(ABORT, 'catalog_invalid_key'); END;
CREATE TRIGGER category_update_key BEFORE UPDATE ON categories
WHEN length(trim(NEW.search_key)) = 0 OR NEW.id != OLD.id
BEGIN SELECT RAISE(ABORT, 'catalog_invalid_key'); END;
CREATE TRIGGER service_insert_key BEFORE INSERT ON services
WHEN length(trim(NEW.search_key)) = 0
BEGIN SELECT RAISE(ABORT, 'catalog_invalid_key'); END;
CREATE TRIGGER service_update_key BEFORE UPDATE ON services
WHEN length(trim(NEW.search_key)) = 0 OR NEW.id != OLD.id
BEGIN SELECT RAISE(ABORT, 'catalog_invalid_key'); END;
CREATE TRIGGER alias_insert_key BEFORE INSERT ON service_aliases
WHEN length(trim(NEW.search_key)) = 0
BEGIN SELECT RAISE(ABORT, 'catalog_invalid_key'); END;
CREATE TRIGGER alias_update_key BEFORE UPDATE ON service_aliases
WHEN length(trim(NEW.search_key)) = 0 OR NEW.id != OLD.id OR NEW.service_id != OLD.service_id
BEGIN SELECT RAISE(ABORT, 'catalog_invalid_key'); END;

CREATE TRIGGER service_insert_collision BEFORE INSERT ON services
WHEN EXISTS (SELECT 1 FROM service_aliases WHERE search_key = NEW.search_key)
BEGIN SELECT RAISE(ABORT, 'catalog_term_collision'); END;
CREATE TRIGGER service_update_collision BEFORE UPDATE OF search_key ON services
WHEN EXISTS (SELECT 1 FROM service_aliases WHERE search_key = NEW.search_key)
BEGIN SELECT RAISE(ABORT, 'catalog_term_collision'); END;
CREATE TRIGGER alias_insert_collision BEFORE INSERT ON service_aliases
WHEN EXISTS (SELECT 1 FROM services WHERE search_key = NEW.search_key)
BEGIN SELECT RAISE(ABORT, 'catalog_term_collision'); END;
CREATE TRIGGER alias_update_collision BEFORE UPDATE OF search_key ON service_aliases
WHEN EXISTS (SELECT 1 FROM services WHERE search_key = NEW.search_key)
BEGIN SELECT RAISE(ABORT, 'catalog_term_collision'); END;
