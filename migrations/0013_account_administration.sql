CREATE TABLE account_status_changes (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  actor_id TEXT NOT NULL REFERENCES accounts(id),
  action TEXT NOT NULL CHECK(action IN ('disable', 'enable')),
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 20 AND 1000),
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX account_status_changes_account ON account_status_changes(account_id, created_at);

CREATE TRIGGER account_status_guard BEFORE INSERT ON account_status_changes BEGIN
  SELECT RAISE(ABORT, 'administrator required') WHERE NOT EXISTS(
    SELECT 1 FROM administrator_grants g JOIN accounts a ON a.id = g.account_id
    WHERE g.account_id = NEW.actor_id AND a.active = 1);
  SELECT RAISE(ABORT, 'own account') WHERE NEW.action = 'disable' AND NEW.account_id = NEW.actor_id;
  SELECT RAISE(ABORT, 'stale account status') WHERE NOT EXISTS(
    SELECT 1 FROM accounts WHERE id = NEW.account_id
    AND active = (CASE NEW.action WHEN 'disable' THEN 1 ELSE 0 END));
END;

CREATE TRIGGER account_status_apply AFTER INSERT ON account_status_changes BEGIN
  UPDATE accounts SET active = (CASE NEW.action WHEN 'disable' THEN 0 ELSE 1 END) WHERE id = NEW.account_id;
  DELETE FROM auth_sessions WHERE account_id = NEW.account_id AND NEW.action = 'disable';
END;

CREATE TRIGGER account_status_update BEFORE UPDATE ON account_status_changes BEGIN SELECT RAISE(ABORT, 'immutable account status history'); END;
CREATE TRIGGER account_status_delete BEFORE DELETE ON account_status_changes BEGIN SELECT RAISE(ABORT, 'immutable account status history'); END;
