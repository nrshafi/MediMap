CREATE TABLE service_reviews (
 id TEXT PRIMARY KEY NOT NULL,
 account_id TEXT NOT NULL REFERENCES accounts(id),
 listing_id TEXT NOT NULL REFERENCES branch_services(id),
 scores TEXT NOT NULL CHECK(json_valid(scores) AND json_array_length(scores)=6),
 body TEXT NOT NULL CHECK(length(body)<=2000),
 visibility TEXT NOT NULL DEFAULT 'visible' CHECK(visibility IN ('visible','hidden','removed')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(account_id,listing_id),
 CHECK(json_extract(scores,'$[0]') BETWEEN 1 AND 5 AND json_type(scores,'$[0]')='integer'),
 CHECK(json_extract(scores,'$[1]') BETWEEN 1 AND 5 AND json_type(scores,'$[1]')='integer'),
 CHECK(json_extract(scores,'$[2]') BETWEEN 1 AND 5 AND json_type(scores,'$[2]')='integer'),
 CHECK(json_extract(scores,'$[3]') BETWEEN 1 AND 5 AND json_type(scores,'$[3]')='integer'),
 CHECK(json_extract(scores,'$[4]') BETWEEN 1 AND 5 AND json_type(scores,'$[4]')='integer'),
 CHECK(json_extract(scores,'$[5]') BETWEEN 1 AND 5 AND json_type(scores,'$[5]')='integer')
) STRICT;
CREATE INDEX service_reviews_public ON service_reviews(listing_id,visibility,created_at,id);
CREATE TABLE service_review_changes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 review_id TEXT NOT NULL REFERENCES service_reviews(id),
 account_id TEXT NOT NULL REFERENCES accounts(id),
 scores TEXT NOT NULL,
 body TEXT NOT NULL,
 changed_at INTEGER NOT NULL
) STRICT;
CREATE INDEX review_changes_account ON service_review_changes(account_id,changed_at);
CREATE TRIGGER service_review_insert_guard BEFORE INSERT ON service_reviews BEGIN
 SELECT RAISE(ABORT,'inactive reviewer') WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND active=1);
 SELECT RAISE(ABORT,'review rate limit') WHERE (SELECT COUNT(*) FROM service_review_changes WHERE account_id=NEW.account_id AND changed_at>NEW.updated_at-86400000)>=5;
END;
CREATE TRIGGER service_review_edit_guard BEFORE UPDATE OF scores,body ON service_reviews BEGIN
 SELECT RAISE(ABORT,'invalid review edit') WHERE NEW.account_id!=OLD.account_id OR NEW.listing_id!=OLD.listing_id OR NEW.created_at!=OLD.created_at OR OLD.visibility='removed' OR NEW.visibility!=OLD.visibility OR NEW.revision!=OLD.revision+1;
 SELECT RAISE(ABORT,'review rate limit') WHERE (SELECT COUNT(*) FROM service_review_changes WHERE account_id=NEW.account_id AND changed_at>NEW.updated_at-86400000)>=5;
END;
CREATE TRIGGER service_review_created AFTER INSERT ON service_reviews BEGIN
 INSERT INTO service_review_changes(review_id,account_id,scores,body,changed_at) VALUES(NEW.id,NEW.account_id,NEW.scores,NEW.body,NEW.updated_at);
END;
CREATE TRIGGER service_review_edited AFTER UPDATE OF scores,body ON service_reviews BEGIN
 INSERT INTO service_review_changes(review_id,account_id,scores,body,changed_at) VALUES(NEW.id,NEW.account_id,NEW.scores,NEW.body,NEW.updated_at);
END;
CREATE TRIGGER service_review_history_update BEFORE UPDATE ON service_review_changes BEGIN SELECT RAISE(ABORT,'immutable review history'); END;
CREATE TRIGGER service_review_history_delete BEFORE DELETE ON service_review_changes BEGIN SELECT RAISE(ABORT,'immutable review history'); END;
