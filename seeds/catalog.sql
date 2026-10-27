-- Reviewed subset of official-site research. Never import the research export wholesale.
INSERT INTO categories(id, name) VALUES ('hematology', 'Hematology') ON CONFLICT(id) DO NOTHING;
INSERT INTO services(id, category_id, name)
  VALUES ('complete-blood-count', 'hematology', 'Complete Blood Count') ON CONFLICT(id) DO NOTHING;
INSERT INTO service_aliases(id, service_id, alias, language)
  VALUES ('complete-blood-count-cbc-en', 'complete-blood-count', 'CBC', 'en') ON CONFLICT(id) DO NOTHING;
INSERT INTO providers(id, name)
  VALUES ('addin-medical-college-hospital', 'Ad-din Medical College Hospital') ON CONFLICT(id) DO NOTHING;
INSERT INTO sources(id, provider_id, url, kind, retrieved_at, sha256, source_updated_date, currency_evidence)
  VALUES ('addin-hematology-20261027', 'addin-medical-college-hospital',
    'https://awmch.addinhospital.org/hematology-service-charge', 'official_tariff',
    '2026-10-27T10:28:23.332Z', 'c2f0c2e26eb3c86b4157654741a9f5577c03872f799e20385724b1b5ee8ce5fe',
    '2026-02-23', 'explicit_taka_header') ON CONFLICT(id) DO NOTHING;
INSERT INTO sources(id, provider_id, url, kind, retrieved_at, sha256)
  VALUES ('addin-contact-20261027', 'addin-medical-college-hospital',
    'https://awmch.addinhospital.org/contact/', 'official_contact', '2026-10-27T10:28:23.315Z',
    'f4d487b1e750ef07fc12fcae91ea2222cb030b951901ec540c8b42bf3472be87') ON CONFLICT(id) DO NOTHING;
INSERT INTO branches(id, provider_id, name, address, contact_source_id)
  VALUES ('addin-moghbazar', 'addin-medical-college-hospital', 'Moghbazar',
    '2 Bara Maghbazar, Dhaka 1217', 'addin-contact-20261027') ON CONFLICT(id) DO NOTHING;
INSERT INTO branch_services(id, branch_id, service_id, provider_service_name)
  VALUES ('addin-moghbazar-complete-blood-count', 'addin-moghbazar', 'complete-blood-count', 'CBC')
  ON CONFLICT(id) DO NOTHING;
INSERT INTO prices(id, listing_id, amount_minor, status, source_id, source_row, verified_at, verification_method, created_at)
  VALUES ('addin-moghbazar-cbc-20261027', 'addin-moghbazar-complete-blood-count', 40000, 'verified',
    'addin-hematology-20261027', 1, '2026-10-27T11:20:41Z', 'official_website_review', '2026-10-27T11:20:41Z')
  ON CONFLICT(id) DO NOTHING;
-- Reruns preserve subsequent administrator choices, including a cleared current reference.
UPDATE branch_services SET current_price_id = 'addin-moghbazar-cbc-20261027'
  WHERE id = 'addin-moghbazar-complete-blood-count' AND current_price_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM seed_imports WHERE id = 'catalog-20261027');
INSERT INTO seed_imports(id) VALUES ('catalog-20261027') ON CONFLICT(id) DO NOTHING;
