CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
) STRICT;

CREATE TABLE services (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
) STRICT;

CREATE TABLE service_aliases (
  id TEXT PRIMARY KEY NOT NULL,
  service_id TEXT NOT NULL REFERENCES services(id),
  alias TEXT NOT NULL CHECK(length(trim(alias)) > 0),
  language TEXT NOT NULL CHECK(language IN ('en', 'bn')),
  UNIQUE(service_id, alias, language)
) STRICT;

CREATE TABLE providers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
) STRICT;

CREATE TABLE sources (
  id TEXT PRIMARY KEY NOT NULL,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  url TEXT NOT NULL CHECK(url GLOB 'https://*'),
  kind TEXT NOT NULL CHECK(kind IN ('official_tariff', 'official_contact')),
  retrieved_at TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
  source_updated_date TEXT,
  currency_evidence TEXT CHECK(currency_evidence IN ('explicit_taka_header', 'explicit_taka_symbol')),
  UNIQUE(provider_id, id)
) STRICT;

CREATE TABLE branches (
  id TEXT PRIMARY KEY NOT NULL,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  address TEXT NOT NULL CHECK(length(trim(address)) > 0),
  contact_source_id TEXT,
  phone TEXT,
  opening_hours TEXT,
  latitude REAL,
  longitude REAL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  UNIQUE(id, provider_id),
  FOREIGN KEY(provider_id, contact_source_id) REFERENCES sources(provider_id, id),
  CHECK((latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND
      latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
) STRICT;

CREATE TABLE branch_services (
  id TEXT PRIMARY KEY NOT NULL,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  provider_service_name TEXT NOT NULL CHECK(length(trim(provider_service_name)) > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  current_price_id TEXT,
  UNIQUE(branch_id, service_id),
  FOREIGN KEY(id, current_price_id) REFERENCES prices(listing_id, id)
) STRICT;

CREATE TABLE prices (
  id TEXT PRIMARY KEY NOT NULL,
  listing_id TEXT NOT NULL REFERENCES branch_services(id),
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0 AND amount_minor <= 9007199254740991),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK(currency = 'BDT'),
  status TEXT NOT NULL CHECK(status IN ('unverified', 'verified', 'disputed')),
  source_id TEXT REFERENCES sources(id),
  source_row INTEGER CHECK(source_row > 0),
  verified_at TEXT,
  effective_date TEXT,
  verification_method TEXT CHECK(verification_method = 'official_website_review'),
  created_at TEXT NOT NULL,
  UNIQUE(listing_id, id),
  CHECK(status != 'verified' OR
    (source_id IS NOT NULL AND source_row IS NOT NULL AND verified_at IS NOT NULL AND verification_method IS NOT NULL)),
  CHECK((verified_at IS NULL AND verification_method IS NULL) OR
    (verified_at IS NOT NULL AND verification_method IS NOT NULL AND source_id IS NOT NULL))
) STRICT;

CREATE INDEX services_category ON services(category_id);
CREATE INDEX service_aliases_service ON service_aliases(service_id);
CREATE INDEX branches_provider ON branches(provider_id);
CREATE INDEX branch_services_service ON branch_services(service_id, active, id);
CREATE INDEX prices_listing ON prices(listing_id);

CREATE TABLE seed_imports (
  id TEXT PRIMARY KEY NOT NULL
) STRICT;
