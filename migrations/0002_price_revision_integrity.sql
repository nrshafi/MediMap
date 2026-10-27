CREATE TRIGGER verified_price_source_insert BEFORE INSERT ON prices
WHEN NEW.status = 'verified' AND NOT EXISTS (
  SELECT 1 FROM sources s JOIN branch_services bs ON bs.id = NEW.listing_id
  JOIN branches b ON b.id = bs.branch_id
  WHERE s.id = NEW.source_id AND s.provider_id = b.provider_id
    AND s.kind = 'official_tariff' AND s.currency_evidence IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'Verified price requires an official provider tariff with currency evidence');
END;

CREATE TRIGGER price_revision_update BEFORE UPDATE ON prices
BEGIN
  SELECT RAISE(ABORT, 'Price revisions are immutable; insert a new revision');
END;

CREATE TRIGGER price_revision_delete BEFORE DELETE ON prices
BEGIN
  SELECT RAISE(ABORT, 'Retain price history');
END;
