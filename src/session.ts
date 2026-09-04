import { decodeJwt } from "jose";
import type { AuthorizationRequest, Principal, TokenSet } from "./types.js";
import { IapClient } from "./client.js";

/** Adapter for encrypted HttpOnly cookies or a server-side session. */
export interface IapSessionStore {
  readTokens(): Promise<TokenSet | undefined>;
  writeTokens(tokens: TokenSet): Promise<void>;
  clearTokens(): Promise<void>;
  readAuthorizationRequest(): Promise<AuthorizationRequest | undefined>;
  writeAuthorizationRequest(request: AuthorizationRequest): Promise<void>;
  clearAuthorizationRequest(): Promise<void>;
}

/** Server-side OIDC orchestration for Next.js route handlers. */
export class IapServerSession {
  constructor(readonly client: IapClient, readonly store: IapSessionStore) {}

  async start(): Promise<AuthorizationRequest> {
    const request = await this.client.createAuthorizationRequest();
    await this.store.writeAuthorizationRequest(request);
    return request;
  }

  async complete(callback: URL | string): Promise<TokenSet> {
    const url = typeof callback === "string" ? new URL(callback) : callback;
    const error = url.searchParams.get("error");
    if (error) throw new Error(url.searchParams.get("error_description") || error);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const request = await this.store.readAuthorizationRequest();
    if (!code || !state || !request || state !== request.state) {
      throw new Error("IAP callback is missing or has an invalid state");
    }
    try {
      const tokens = await this.client.exchangeCode(code, request.codeVerifier);
      await this.store.writeTokens(tokens);
      return tokens;
    } finally {
      await this.store.clearAuthorizationRequest();
    }
  }

  async accessToken(minimumValiditySeconds = 30): Promise<string | undefined> {
    const tokens = await this.store.readTokens();
    if (!tokens) return undefined;
    if (!expiresSoon(tokens.access_token, minimumValiditySeconds)) return tokens.access_token;
    if (!tokens.refresh_token) {
      await this.store.clearTokens();
      return undefined;
    }
    const refreshed = await this.client.refresh(tokens.refresh_token);
    await this.store.writeTokens({
      ...refreshed,
      refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
      id_token: refreshed.id_token ?? tokens.id_token,
    });
    return refreshed.access_token;
  }

  async principal(): Promise<Principal | undefined> {
    const token = await this.accessToken();
    return token ? this.client.verifyAccessToken(token) : undefined;
  }

  async logout(): Promise<void> {
    await Promise.all([this.store.clearTokens(), this.store.clearAuthorizationRequest()]);
  }
}

function expiresSoon(token: string, minimumValiditySeconds: number): boolean {
  try {
    const exp = decodeJwt(token).exp;
    return !exp || exp <= Math.floor(Date.now() / 1000) + minimumValiditySeconds;
  } catch {
    return true;
  }
}
