export type TokenEndpointAuthMethod = "client_secret_basic" | "client_secret_post" | "none";

export interface IapConfig {
  issuer: string;
  clientId: string;
  audience: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  clientSecret?: string;
  /** Defaults to client_secret_basic with a secret, otherwise none. */
  tokenEndpointAuthMethod?: TokenEndpointAuthMethod;
  scopes?: string[];
}

export interface DiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  token_endpoint_auth_methods_supported?: string[];
  jwks_uri: string;
  end_session_endpoint?: string;
}

export interface TokenSet {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface Principal {
  subject: string;
  issuer: string;
  audience: string[];
  email?: string;
  name?: string;
  picture?: string;
  roles: string[];
  permissions: string[];
  resourceScopes: Record<string, ResourceScope>;
}

export interface ResourceScope { mode: "all" | "selected"; ids: string[]; }

export interface AuthorizationRequest {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}
