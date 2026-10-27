import * as oauth from 'oauth4webapi';
import type { AuthSettings } from './config.server';
import { AuthError } from '../contracts';

export type GoogleIdentity = { subject: string; email: string };
export type OAuthAttempt = { state: string; nonce: string; codeVerifier: string; returnTo: string };
export type OAuthFetch = (url: string, init: RequestInit) => Promise<Response>;

export class GoogleSignIn {
  constructor(
    private readonly settings: AuthSettings,
    private readonly fetcher: OAuthFetch = (url, init) => fetch(url, init),
  ) {}

  private options() {
    return {
      [oauth.customFetch]: (url: string, init: RequestInit) => {
        const target = new URL(url);
        if (
          target.protocol !== 'https:' ||
          !['accounts.google.com', 'oauth2.googleapis.com', 'www.googleapis.com'].includes(
            target.hostname,
          )
        )
          throw new AuthError('unavailable');
        return this.fetcher(url, {
          ...init,
          redirect: 'error',
          signal: AbortSignal.timeout(10_000),
        });
      },
    };
  }

  private async metadata() {
    const issuer = new URL('https://accounts.google.com');
    const response = await oauth.discoveryRequest(issuer, this.options());
    return oauth.processDiscoveryResponse(issuer, response);
  }

  async authorizationUrl(attempt: OAuthAttempt): Promise<string> {
    const metadata = await this.metadata();
    if (!metadata.authorization_endpoint) throw new AuthError('unavailable');
    const url = new URL(metadata.authorization_endpoint);
    if (url.origin !== 'https://accounts.google.com') throw new AuthError('unavailable');
    url.search = new URLSearchParams({
      client_id: this.settings.clientId,
      redirect_uri: `${this.settings.origin}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email',
      state: attempt.state,
      nonce: attempt.nonce,
      code_challenge: await oauth.calculatePKCECodeChallenge(attempt.codeVerifier),
      code_challenge_method: 'S256',
    }).toString();
    return url.href;
  }

  async identity(callback: URL, attempt: OAuthAttempt): Promise<GoogleIdentity> {
    const metadata = await this.metadata();
    const client: oauth.Client = {
      client_id: this.settings.clientId,
      id_token_signed_response_alg: 'RS256',
    };
    const parameters = oauth.validateAuthResponse(metadata, client, callback, attempt.state);
    const response = await oauth.authorizationCodeGrantRequest(
      metadata,
      client,
      oauth.ClientSecretPost(this.settings.clientSecret),
      parameters,
      `${this.settings.origin}/auth/google/callback`,
      attempt.codeVerifier,
      this.options(),
    );
    const result = await oauth.processAuthorizationCodeResponse(metadata, client, response, {
      expectedNonce: attempt.nonce,
      requireIdToken: true,
    });
    await oauth.validateApplicationLevelSignature(metadata, response, this.options());
    const claims = oauth.getValidatedIdTokenClaims(result);
    if (
      !claims ||
      typeof claims.sub !== 'string' ||
      !/^[A-Za-z0-9_-]{1,255}$/.test(claims.sub) ||
      typeof claims.email !== 'string' ||
      claims.email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email) ||
      (claims.email_verified !== true && claims.email_verified !== 'true')
    )
      throw new AuthError('invalid_request');
    return { subject: claims.sub, email: claims.email };
  }
}
