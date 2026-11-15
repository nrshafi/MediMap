CREATE TABLE review_abuse_reports (
 id TEXT PRIMARY KEY NOT NULL,
 review_id TEXT NOT NULL REFERENCES service_reviews(id),
 reporter_id TEXT NOT NULL REFERENCES accounts(id),
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 20 AND 1000),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved')),
 created_at INTEGER NOT NULL
) STRICT;
CREATE UNIQUE INDEX review_abuse_pending ON review_abuse_reports(review_id,reporter_id) WHERE status='pending';
CREATE INDEX review_abuse_reporter ON review_abuse_reports(reporter_id,created_at);
CREATE TABLE review_moderation (
 id TEXT PRIMARY KEY NOT NULL,
 review_id TEXT NOT NULL REFERENCES service_reviews(id),
 actor_id TEXT NOT NULL REFERENCES accounts(id),
 action TEXT NOT NULL CHECK(action IN ('hide','restore','remove')),
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 20 AND 1000),
 previous_revision INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 UNIQUE(review_id,previous_revision)
) STRICT;
CREATE TRIGGER review_abuse_guard BEFORE INSERT ON review_abuse_reports BEGIN
 SELECT RAISE(ABORT,'review report rate limit') WHERE (SELECT COUNT(*) FROM review_abuse_reports WHERE reporter_id=NEW.reporter_id AND created_at>NEW.created_at-86400000)>=5;
 SELECT RAISE(ABORT,'unavailable review') WHERE NOT EXISTS(SELECT 1 FROM service_reviews WHERE id=NEW.review_id AND visibility='visible');
END;
CREATE TRIGGER review_moderation_guard BEFORE INSERT ON review_moderation BEGIN
 SELECT RAISE(ABORT,'administrator required') WHERE NOT EXISTS(SELECT 1 FROM administrator_grants g JOIN accounts a ON a.id=g.account_id WHERE g.account_id=NEW.actor_id AND a.active=1);
 SELECT RAISE(ABORT,'stale moderation') WHERE NOT EXISTS(SELECT 1 FROM service_reviews WHERE id=NEW.review_id AND revision=NEW.previous_revision AND visibility!='removed' AND ((NEW.action='hide' AND visibility='visible') OR (NEW.action='restore' AND visibility='hidden') OR NEW.action='remove'));
END;
CREATE TRIGGER review_moderation_apply AFTER INSERT ON review_moderation BEGIN
 UPDATE service_reviews SET visibility=CASE NEW.action WHEN 'hide' THEN 'hidden' WHEN 'restore' THEN 'visible' ELSE 'removed' END,revision=revision+1 WHERE id=NEW.review_id;
 UPDATE review_abuse_reports SET status='resolved' WHERE review_id=NEW.review_id AND status='pending';
END;
CREATE TRIGGER review_moderation_update BEFORE UPDATE ON review_moderation BEGIN SELECT RAISE(ABORT,'immutable moderation'); END;
CREATE TRIGGER review_moderation_delete BEFORE DELETE ON review_moderation BEGIN SELECT RAISE(ABORT,'immutable moderation'); END;
