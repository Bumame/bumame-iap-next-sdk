import { describe, expect, it } from "vitest";
import type { AuthorizationRequest, TokenSet } from "./types.js";
import type { IapClient } from "./client.js";
import { IapServerSession, type IapSessionStore } from "./session.js";

class MemoryStore implements IapSessionStore {
  tokens?: TokenSet;
  request?: AuthorizationRequest;
  async readTokens() { return this.tokens; }
  async writeTokens(value: TokenSet) { this.tokens = value; }
  async clearTokens() { this.tokens = undefined; }
  async readAuthorizationRequest() { return this.request; }
  async writeAuthorizationRequest(value: AuthorizationRequest) { this.request = value; }
  async clearAuthorizationRequest() { this.request = undefined; }
}

const request: AuthorizationRequest = {
  url: "https://auth.test/oauth2/auth",
  state: "state-1",
  nonce: "nonce-1",
  codeVerifier: "verifier-1",
};

describe("IapServerSession", () => {
  it("owns callback validation and token persistence", async () => {
    const store = new MemoryStore();
    const tokens: TokenSet = { access_token: "token", token_type: "Bearer", expires_in: 300 };
    const client = {
      createAuthorizationRequest: async () => request,
      exchangeCode: async (code: string, verifier: string, nonce: string) => {
        expect(code).toBe("code-1");
        expect(verifier).toBe(request.codeVerifier);
        expect(nonce).toBe(request.nonce);
        return tokens;
      },
    } as IapClient;
    const session = new IapServerSession(client, store);

    expect(await session.start()).toEqual(request);
    await session.complete("https://app.test/callback?code=code-1&state=state-1");

    expect(store.tokens).toEqual(tokens);
    expect(store.request).toBeUndefined();
  });

  it("clears an invalid callback transaction", async () => {
    const store = new MemoryStore();
    store.request = request;
    const session = new IapServerSession({} as IapClient, store);
    await expect(session.complete("https://app.test/callback?code=x&state=wrong"))
      .rejects.toThrow("invalid state");
    expect(store.request).toBeUndefined();
  });
});
