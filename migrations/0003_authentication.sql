CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  google_subject TEXT NOT NULL UNIQUE CHECK(length(google_subject) BETWEEN 1 AND 255),
  email TEXT NOT NULL CHECK(length(trim(email)) BETWEEN 3 AND 320),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  created_at INTEGER NOT NULL,
  last_signed_in_at INTEGER NOT NULL
) STRICT;

CREATE TABLE administrator_grants (
  account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
  granted_at INTEGER NOT NULL,
  granted_by TEXT NOT NULL CHECK(length(trim(granted_by)) > 0)
) STRICT;

CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL CHECK(length(token_hash) = 64),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at)
) STRICT;
CREATE INDEX auth_sessions_account ON auth_sessions(account_id);
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at);

CREATE TABLE oauth_attempts (
  token_hash TEXT PRIMARY KEY NOT NULL CHECK(length(token_hash) = 64),
  state TEXT NOT NULL,
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at)
) STRICT;
CREATE INDEX oauth_attempts_expiry ON oauth_attempts(expires_at);

CREATE TRIGGER administrator_grant_insert AFTER INSERT ON administrator_grants
BEGIN
  DELETE FROM auth_sessions WHERE account_id = NEW.account_id;
END;
CREATE TRIGGER administrator_grant_update AFTER UPDATE ON administrator_grants
BEGIN
  DELETE FROM auth_sessions WHERE account_id = NEW.account_id;
END;
CREATE TRIGGER administrator_grant_delete AFTER DELETE ON administrator_grants
BEGIN
  DELETE FROM auth_sessions WHERE account_id = OLD.account_id;
END;
