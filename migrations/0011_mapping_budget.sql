CREATE TABLE mapping_budget (
 bucket TEXT PRIMARY KEY NOT NULL,
 requests INTEGER NOT NULL CHECK(requests>0),
 expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX mapping_budget_expiry ON mapping_budget(expires_at);
