import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from "jose";
import type { AuthorizationRequest, DiscoveryDocument, IapConfig, Principal, TokenSet } from "./types.js";

const textEncoder = new TextEncoder();
const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const random = (length = 32) => { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return base64url(bytes); };

export class IapClient {
  readonly config: Required<Pick<IapConfig, "issuer" | "clientId" | "audience" | "redirectUri">> & IapConfig;
  private discoveryPromise?: Promise<DiscoveryDocument>;
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: IapConfig) {
    const issuer = config.issuer.trim().replace(/\/$/, "");
    if (!issuer || !config.clientId || !config.audience || !config.redirectUri) throw new Error("issuer, clientId, audience, and redirectUri are required");
    this.config = { ...config, issuer, scopes: config.scopes ?? ["openid", "profile", "email", "roles", "offline_access"] };
  }

  async discover(): Promise<DiscoveryDocument> {
    this.discoveryPromise ??= fetch(`${this.config.issuer}/.well-known/openid-configuration`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(`IAP discovery failed: ${response.status}`);
      const document = await response.json() as DiscoveryDocument;
      if (document.issuer.replace(/\/$/, "") !== this.config.issuer || !document.authorization_endpoint || !document.token_endpoint || !document.jwks_uri) throw new Error("IAP discovery document is invalid");
      return document;
    });
    return this.discoveryPromise;
  }

  async createAuthorizationRequest(): Promise<AuthorizationRequest> {
    const [discovery, codeVerifier] = await Promise.all([this.discover(), Promise.resolve(random(64))]);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", textEncoder.encode(codeVerifier)));
    const state = random(); const nonce = random();
    const url = new URL(discovery.authorization_endpoint);
    url.search = new URLSearchParams({ response_type: "code", client_id: this.config.clientId, redirect_uri: this.config.redirectUri, scope: this.config.scopes!.join(" "), state, nonce, code_challenge: base64url(digest), code_challenge_method: "S256", audience: this.config.audience }).toString();
    return { url: url.toString(), state, nonce, codeVerifier };
  }

  async exchangeCode(code: string, codeVerifier: string, expectedNonce?: string): Promise<TokenSet> {
    const tokens = await this.tokenRequest({ grant_type: "authorization_code", code, redirect_uri: this.config.redirectUri, code_verifier: codeVerifier });
    if (expectedNonce && (!tokens.id_token || decodeJwt(tokens.id_token).nonce !== expectedNonce)) {
      throw new Error("IAP ID token nonce is invalid");
    }
    return tokens;
  }

  async refresh(refreshToken: string): Promise<TokenSet> { return this.tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken }); }

  async verifyAccessToken(token: string): Promise<Principal> {
    const discovery = await this.discover();
    this.jwks ??= createRemoteJWKSet(new URL(discovery.jwks_uri));
    const { payload } = await jwtVerify(token, this.jwks, { issuer: this.config.issuer, audience: this.config.audience, algorithms: ["RS256"] });
    return normalizePrincipal(payload);
  }

  async logoutUrl(idTokenHint?: string): Promise<string> {
    const discovery = await this.discover();
    if (!discovery.end_session_endpoint) throw new Error("IAP does not advertise an end-session endpoint");
    const url = new URL(discovery.end_session_endpoint);
    if (idTokenHint) url.searchParams.set("id_token_hint", idTokenHint);
    if (this.config.postLogoutRedirectUri) url.searchParams.set("post_logout_redirect_uri", this.config.postLogoutRedirectUri);
    return url.toString();
  }

  private async tokenRequest(parameters: Record<string, string>): Promise<TokenSet> {
    const discovery = await this.discover();
    const body = new URLSearchParams({ ...parameters, client_id: this.config.clientId });
    if (this.config.clientSecret) body.set("client_secret", this.config.clientSecret);
    const response = await fetch(discovery.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
    if (!response.ok) throw new Error(`IAP token exchange failed: ${response.status}`);
    return response.json() as Promise<TokenSet>;
  }
}

function normalizePrincipal(payload: JWTPayload): Principal {
  if (!payload.sub || !payload.iss) throw new Error("IAP access token is missing sub or iss");
  const ext = isRecord(payload.ext) ? payload.ext : {};
  return {
    subject: payload.sub,
    issuer: payload.iss,
    audience: typeof payload.aud === "string" ? [payload.aud] : payload.aud ?? [],
    email: stringValue(payload.email) ?? stringValue(ext.email),
    name: stringValue(payload.name) ?? stringValue(ext.name),
    picture: stringValue(payload.picture) ?? stringValue(ext.picture),
    roles: stringArray(ext.roles),
    permissions: stringArray(ext.permissions),
    resourceScopes: resourceScopes(ext.resource_scopes ?? payload.resource_scopes),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const stringValue = (value: unknown) => typeof value === "string" ? value : undefined;
const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const resourceScopes = (value: unknown): Principal["resourceScopes"] => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, raw]) => {
    if (!isRecord(raw) || (raw.mode !== "all" && raw.mode !== "selected")) return [];
    return [[key, { mode: raw.mode, ids: stringArray(raw.ids) }]];
  }));
};
