# Google sign-in and server access

The owner selected seven-day absolute sessions without automatic renewal and explicit owner-controlled administrator grants on 27 October 2026.
The implementation uses `oauth4webapi` 3.8.8, Workers Web Crypto, and direct prepared D1 queries.
Google sign-in creates ordinary accounts. It never grants administrator access or merges accounts by email address.

## Local Google configuration

1. Create a Google OAuth client with application type **Web application** in the project's Google Cloud account.
2. Configure the app's consent details and permitted audience for your chosen test account.
3. Register `http://localhost:3000/auth/google/callback` as an authorized redirect URI.
4. Copy `.dev.vars.example` to `.dev.vars` if the secret file does not already exist.
5. Set `AUTH_ORIGIN` to `http://localhost:3000`.
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from that OAuth client in `.dev.vars`.
7. Run `bun run db:setup`.
8. Run `bun run dev`.
9. Open `http://localhost:3000/sign-in` and complete Google sign-in.

Use the exact configured origin. `localhost` and `127.0.0.1` are different origins.
For another port or HTTPS origin, update both `AUTH_ORIGIN` and the Google redirect registration.
The callback path remains `/auth/google/callback`. Production origins require HTTPS.
Only loopback development origins can use HTTP. Production requests also require an explicit matching `AUTH_ORIGIN`.

Keep the client secret in the ignored local secret file. Do not send it in chat, browser code, URL parameters, or logs.
The tracked example contains empty placeholders. It cannot complete Google sign-in.
Deployment and remote secret provisioning require a separate request.

The [Google OpenID Connect guide](https://developers.google.com/identity/openid-connect/openid-connect) describes client creation, consent, redirect registration, and token validation.
Cloudflare documents [local secret files](https://developers.cloudflare.com/workers/configuration/secrets/).

## Account and session contracts

`accounts.id` is the stable MediMap account ID. `accounts.google_subject` uniquely identifies the Google account.
Email addresses can change and need not be unique across account records. Verified Google claims can update the stored email.
Inactive accounts cannot obtain or use a session.

`AuthStore` in `src/features/authentication/server/store.server.ts` provides account persistence, login attempts, sessions, and sign-out.
`signIn` accepts an identity only after the Google adapter validates the OpenID response.
Never call it with account IDs, roles, email claims, or decoded tokens supplied directly by a browser.

Session cookies contain random 256-bit tokens. D1 stores only their SHA-256 hashes.
Sessions expire seven days after creation. Reading a session does not extend it.
Successful sign-in creates a new token and revokes the browser's previous session.
Sign-out revokes the persisted session and clears the browser's session and pending-login cookies.
An absent or invalid session is anonymous. A persisted expired session produces the explicit expired-session state.

HTTPS cookies use the `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/`, without a Domain attribute.
Loopback HTTP development uses unprefixed cookies. Duplicate or malformed authentication cookies do not authenticate.
Account pages, protected inspection responses, and authentication redirects use `Cache-Control: no-store`.

`SessionState` and `AuthenticatedUser` in `contracts.ts` are safe account-view contracts.
They expose the current account ID, email, server-confirmed administrator flag, and session expiry.
They never expose session hashes, cookies, Google subject identifiers, or provider tokens.

## Google flow

`POST /auth/google/start` checks the request origin and creates a ten-minute single-use D1 login attempt.
The authorization request includes state, nonce, an S256 PKCE challenge, and only the `openid email` scopes.
A separate opaque cookie binds that attempt to the initiating browser.
`GET /auth/google/callback` consumes the attempt once, exchanges the authorization code, and validates the identity response.
The adapter checks issuer, audience, nonce, expiry, RS256 signature, and verified email before creating an application session.
Outbound provider requests use HTTPS, a ten-second timeout, and approved Google endpoint hosts. Redirects are rejected.
Google access, refresh, and ID tokens are never stored or returned to browser components.

Failed, cancelled, expired, or replayed callbacks return a fixed sign-in failure message.
Callbacks cannot choose a new return destination. The validated local destination comes from the stored login attempt.
Absolute URLs, protocol-relative URLs, control characters, backslashes, and authentication endpoints cannot be return destinations.

## Server authorization

Import `requireUser` and `requireAdministrator` from `server/access.server.ts` for later account-dependent features.
Both helpers resolve the session and current account state from D1. Administrator checks read the current grant.
Anonymous, expired, forged, inactive, and non-administrator requests cannot pass the relevant checks.
Client-supplied role headers, cookie fields, query values, and account IDs never establish access.

State-changing endpoints must also call `requireSameOriginPost` from `server/config.server.ts` before their database changes.
This helper requires POST and an exact match between the Origin header and the configured app origin.
It rejects requests explicitly marked as cross-site. Browser forms work without JavaScript.

`readAccount` is the safe server function for account and session screens.
`inspectCatalog` now requires administrator access before any catalog inspection query.
The general `readCatalog` contract and public discovery remain public.
No administrator write endpoint or role-management endpoint is part of this milestone.

## Owner-controlled administrator grants

Complete a real Google sign-in before granting access. Inspect the resulting account through your trusted database connection.
Confirm the intended person, stable account ID, and Google subject identifier before continuing.
Use an explicit owner-run database operation. Never add a public grant endpoint or promote by email matching.

The following SQL is a template. Replace both placeholders with the verified account identifiers before executing it.

```sql
INSERT INTO administrator_grants(account_id, granted_at, granted_by)
SELECT id, CAST(strftime('%s', 'now') AS INTEGER) * 1000, 'owner-manual-grant'
FROM accounts
WHERE id = '<verified-account-id>'
  AND google_subject = '<verified-google-subject>'
  AND active = 1
ON CONFLICT(account_id) DO NOTHING;
```

Check that the intended grant exists. Sign in again after a grant change.
Database triggers revoke all sessions for that account when a grant is inserted, updated, or deleted.
To revoke a grant, delete its exact `administrator_grants.account_id` row through the same trusted database connection.
No real account was granted administrator access during implementation.

## Verification and remaining setup

`bun run test:database` runs real local D1 tests for schema constraints, sessions, access checks, and Google protocol handling.
The protocol fixtures use locally signed RS256 identity tokens and intercepted Google HTTP requests. They never contact Google as a user.
Browser tests use separate state in `.bun-tmp/browser-d1-state` with synthetic accounts and persisted test sessions.
They generate isolated Worker configuration and empty test OAuth credentials in `.bun-tmp/browser-config`.
The development database receives no synthetic accounts or administrator grants. There is no application test-login bypass.

Real Google OAuth credentials are not configured. The real provider consent/callback flow remains an acceptance check after configuration.
Until then, the sign-in screen reports missing configuration and disables its Google button.

Official APIs checked on 27 October 2026:

- [oauth4webapi OpenID Connect example](https://github.com/panva/oauth4webapi/blob/main/examples/oidc.ts).
- [Application-level signature validation](https://github.com/panva/oauth4webapi/blob/main/docs/functions/validateApplicationLevelSignature.md).
- [TanStack server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).
- [TanStack authentication primitives](https://tanstack.com/start/latest/docs/framework/react/guide/authentication-server-primitives).
- [Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/).

This document uses STE-guided prose. It does not claim formal ASD-STE100 compliance.
