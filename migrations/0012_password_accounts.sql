PRAGMA defer_foreign_keys = on;

CREATE TABLE account_email_guard (checked INTEGER NOT NULL) STRICT;
CREATE TRIGGER account_email_guard_check BEFORE INSERT ON account_email_guard
BEGIN
  SELECT RAISE(ABORT, 'Migration 0012 stopped. Two accounts have the same email after trim and lower-case. Resolve the duplicate and apply again.')
  WHERE EXISTS (SELECT 1 FROM accounts GROUP BY lower(trim(email)) HAVING count(*) > 1);
END;
INSERT INTO account_email_guard(checked) VALUES (1);
DROP TRIGGER account_email_guard_check;
DROP TABLE account_email_guard;

CREATE TABLE accounts_backup AS
SELECT id, google_subject, email, lower(trim(email)) AS email_normalized, active, created_at, last_signed_in_at
FROM accounts;

DROP TABLE accounts;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  google_subject TEXT UNIQUE CHECK(google_subject IS NULL OR length(google_subject) BETWEEN 1 AND 255),
  email TEXT NOT NULL CHECK(length(trim(email)) BETWEEN 3 AND 320),
  email_normalized TEXT NOT NULL CHECK(length(email_normalized) BETWEEN 3 AND 320),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  created_at INTEGER NOT NULL,
  last_signed_in_at INTEGER NOT NULL
) STRICT;

INSERT INTO accounts(id, google_subject, email, email_normalized, active, created_at, last_signed_in_at)
SELECT id, google_subject, email, email_normalized, active, created_at, last_signed_in_at FROM accounts_backup;

DROP TABLE accounts_backup;
CREATE UNIQUE INDEX accounts_email_normalized ON accounts(email_normalized);

CREATE TABLE password_credentials (
  account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
  password_hash TEXT NOT NULL CHECK(length(password_hash) BETWEEN 20 AND 512 AND password_hash LIKE 'pbkdf2-sha256$%'),
  updated_at INTEGER NOT NULL
) STRICT;
