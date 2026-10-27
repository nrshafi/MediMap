import type {
  OAuthFetch,
  OAuthAttempt,
} from '../../src/features/authentication/server/google.server';

export const settings = {
  origin: 'http://localhost:3000',
  clientId: 'medimap-tests.apps.googleusercontent.com',
  clientSecret: 'test-only-not-a-google-secret',
  sessionSeconds: 7 * 86400,
};
export const environment = {
  AUTH_ORIGIN: settings.origin,
  GOOGLE_CLIENT_ID: settings.clientId,
  GOOGLE_CLIENT_SECRET: settings.clientSecret,
};

function base64url(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function googleFixture(
  attempt: OAuthAttempt,
  overrides: Record<string, unknown> = {},
  invalidSignature = false,
) {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const encode = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)));
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'https://accounts.google.com',
    aud: settings.clientId,
    sub: 'google-test-subject',
    iat: now,
    exp: now + 3600,
    nonce: attempt.nonce,
    email: 'member@example.test',
    email_verified: true,
    ...overrides,
  };
  const input = `${encode({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })}.${encode(payload)}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(input)),
  );
  if (invalidSignature) signature[0] ^= 255;
  const token = `${input}.${base64url(signature)}`;
  const calls: string[] = [];
  const fetcher: OAuthFetch = async (url, init) => {
    calls.push(url);
    if (url === 'https://accounts.google.com/.well-known/openid-configuration')
      return Response.json({
        issuer: 'https://accounts.google.com',
        authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        token_endpoint: 'https://oauth2.googleapis.com/token',
        jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256'],
      });
    if (url === 'https://oauth2.googleapis.com/token') {
      const form = new URLSearchParams(String(init.body));
      if (
        form.get('code_verifier') !== attempt.codeVerifier ||
        form.get('client_secret') !== settings.clientSecret ||
        form.get('redirect_uri') !== `${settings.origin}/auth/google/callback`
      ) {
        return Response.json({ error: 'invalid_grant' }, { status: 400 });
      }
      return Response.json({
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: token,
      });
    }
    if (url === 'https://www.googleapis.com/oauth2/v3/certs')
      return Response.json({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] });
    throw new Error(`Unexpected test request: ${url}`);
  };
  return { fetcher, calls };
}
