# Security review

Date: 27 November 2026, Asia/Dhaka. Reviewer: nrshafi, with an AI agent. The `/security-review` skill was not available, so the review was done by hand.

## Scope

- Authentication changes of step 15 (commit `121f674`: schema, hashing, rules) and step 16 (commit `b22c716`: password endpoints, forms).
- Account administration of step 18 (migration `0013`, `/admin/accounts`, `/admin/accounts/write`).
- Reviewed data of steps 10 and 11 (the `data:` commits): seeds, evidence URLs and SQL generation.
- Every administrator route, every SQL statement, and the places where secrets could reach a log or a URL.

This is a code review. It is not a penetration test. No deployed environment was tested.

## Method

1. Read the diffs of the commits above and the current source of `src/features/authentication/`, `src/features/administration/` and the route files.
2. Searched for SQL built with `${}` in `src/`, for `console.*` in `src/`, for `dangerouslySetInnerHTML`, and for `target="_blank"` without `rel`.
3. Checked that each `src/routes/admin.*` route reaches `requireAdministrator` on the server (read and write).
4. Added tests for the new page: guests, ordinary users, expired sessions, forged roles, cross-origin posts, self-disable, stale changes, disable, enable (`tests/auth/account-administration.integration.ts`).

## Findings

| ID | Area | Finding | Status |
| --- | --- | --- | --- |
| S1 | Account state | A refused Google sign-in of a disabled account still updated its email and `last_signed_in_at`, because the upsert had no active check. No session started. | Fixed. The upsert updates only `WHERE accounts.active = 1`. A test checks that the row is unchanged. |
| S2 | Rate limiting | No limit on password sign-in, sign-up or change. An attacker can guess passwords without a limit, create many accounts, and use CPU with each request. | Open. The owner accepted this on 27 November 2026. A limit needs a new design (for example a Cloudflare rate-limiting rule or a D1 counter). |
| S3 | CPU time | One PBKDF2 derivation with 100,000 iterations takes about 60 ms in local workerd. The Workers Free plan allows 10 ms of CPU time for each request. | Open. Release blocker. Measure on the first deployment. If the request fails, use a paid plan after owner approval, or remove password sign-in. |
| S4 | Iteration cap | The production PBKDF2 iteration cap is not in the official Cloudflare Web Crypto page (checked 27 November 2026: the page does not mention iterations). The 100,000 value comes from workerd issue 1346. Local workerd accepts more. | Open. Verify on the first deployment. OWASP recommends 600,000, so the stored value is below that recommendation. The hash string holds the iteration count, so a later version can raise it. |
| S5 | Account enumeration | Sign-up shows "This email already has an account" for a used email. | Open, accepted by the owner on 27 November 2026. Sign-in gives the same error for an unknown email, a Google-only account and a wrong password, and runs one derivation in each case. |
| S6 | Request size | The password forms read `request.formData()` without an own size limit. Only the platform limit applies. The password length is checked before hashing (a new password 128 characters at most, a current or sign-in password 256 at most), so a large body does not reach PBKDF2. | Open, low. Add `readAdministrationForm`-style limits if abuse appears. |
| S7 | Browser hardening | The application sets no `Content-Security-Policy` or `frame-ancestors`. The session cookie is `SameSite=Lax`, so a cross-site frame does not carry the session. | Open, low. Add headers after the release candidate. |
| S8 | Administrator lockout | An administrator can disable another administrator. The acting administrator stays active, so at least one active administrator remains. A disabled administrator can be enabled by another administrator only. | Accepted by design. Each change is in `account_status_changes`. |
| S9 | Observability | Automatic invocation logs are off. Traces have zero sampling. The password endpoints put no password, hash or email in a URL, log or body. Redirects carry fixed error codes. | No problem found. The query-string redaction check stays open from step 6 for OAuth and location URLs. |

## Checks that passed

| Topic | Result |
| --- | --- |
| Same origin | Every POST endpoint calls `requireSameOriginPost` first. It needs an `Origin` header that equals `AUTH_ORIGIN` (or the request origin on loopback) and rejects `Sec-Fetch-Site: cross-site`. A missing `Origin` is rejected. This includes `/admin/accounts/write`. Tests cover a wrong origin and a missing origin. |
| Session tokens | 32 random bytes from Web Crypto. D1 stores the SHA-256 hash only. A session lasts 7 days with no renewal. Sign-in, sign-up and Google sign-in replace the previous token. Sign-out deletes the session. A password change deletes every other session. Disabling an account deletes all its sessions in the same statement. |
| Cookie flags | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age`. On HTTPS the name has the `__Host-` prefix and the cookie has `Secure`. A request with two cookies of the same name gives no session. |
| Password storage | PBKDF2-HMAC-SHA-256, 16-byte random salt, 32-byte key, constant-time compare, Unicode NFC. The hash and salt are stored in one versioned string. A malformed string returns false. |
| Error messages | Sign-in gives one message for an unknown email, a Google-only account and a wrong password. The inactive-account message shows only after a correct password. |
| Authorization | All `admin.*` read functions and write routes call `requireAdministrator` on the server. The role comes from `administrator_grants`, never from a cookie, header or form field. A forged role field gives no access (tested). |
| Disable guard | Triggers in migration `0013` check that the actor is an active administrator, refuse a self-disable, refuse a change that does not match the current state, and make the history immutable. The checks run in the database, not only in the route. |
| SQL | Every statement uses `prepare` with bound values. The only built SQL is the placeholder list for `IN (...)` in `src/features/reviews/repository.server.ts`, which has no user text. The account search escapes `%`, `_` and the escape character, then binds the text. Search text and cursor have length and format checks. |
| Secrets | `GOOGLE_CLIENT_SECRET` and the map keys stay out of the browser files. `release:package` scans `dist/client` for those names, for the name of a removed provider key and for session SQL. The list never selects a hash, a Google subject or a session token. Password sign-in needs no new secret. |
| Step 10 and 11 data | The seeds hold no account, session, grant or password rows. SQL strings are escaped by `sql()` in `scripts/data/reviewedCatalog.ts` (the generator, not request data). Every source URL in the seeds starts with `https://` and points to a hospital or research site. Links open with `rel="noreferrer"`. Administrator-entered URLs must be `http:` or `https:` without credentials. |

## Release blockers from this review

1. S3: password hash CPU time on the deployed Worker.
2. S4: production PBKDF2 iteration cap.

S2 is accepted for the release candidate and stays in "Open questions" of `context/progress-tracker.md`.
