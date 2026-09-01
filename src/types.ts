export interface IapConfig {
  issuer: string;
  clientId: string;
  audience: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  clientSecret?: string;
  scopes?: string[];
}

export interface DiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
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
  roles: string[];
  permissions: string[];
}

export interface AuthorizationRequest {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}
