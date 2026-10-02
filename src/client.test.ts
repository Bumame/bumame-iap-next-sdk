import { afterEach, describe, expect, it, vi } from "vitest";
import { IapClient, IapTokenError } from "./client.js";
import type { IapConfig, TokenEndpointAuthMethod } from "./types.js";

const config: IapConfig = {
  issuer: "https://auth.test",
  clientId: "backoffice-next-bff",
  audience: "urn:bumame:bo",
  redirectUri: "http://localhost:3000/api/auth/callback",
};
const discovery = {
  issuer: config.issuer,
  authorization_endpoint: `${config.issuer}/oauth2/auth`,
  token_endpoint: `${config.issuer}/oauth2/token`,
  jwks_uri: `${config.issuer}/.well-known/jwks.json`,
  token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
};
const tokens = { access_token: "access-token", token_type: "Bearer", expires_in: 300 };

function mockRequests(tokenResponse = Response.json(tokens), metadata = discovery) {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json(metadata))
    .mockResolvedValueOnce(tokenResponse);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("token endpoint authentication", () => {
  for (const method of ["client_secret_basic", "client_secret_post", "none"] as const) {
    for (const grant of ["authorization_code", "refresh_token"] as const) {
      it(`${method} sends exactly one authentication method for ${grant}`, async () => {
        const fetchMock = mockRequests();
        const client = new IapClient({ ...config, tokenEndpointAuthMethod: method,
          ...(method !== "none" ? { clientSecret: "test-secret" } : {}) });
        const result = grant === "authorization_code"
          ? await client.exchangeCode("new-code", "pkce-verifier")
          : await client.refresh("refresh-token");
        expect(result).toEqual(tokens);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const [url, request] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(url).toBe(discovery.token_endpoint);
        expect(request.method).toBe("POST");
        expect(request.cache).toBe("no-store");
        const headers = new Headers(request.headers);
        expect(headers.get("content-type")).toBe("application/x-www-form-urlencoded");
        const body = request.body as URLSearchParams;
        expect(body.get("grant_type")).toBe(grant);
        if (grant === "authorization_code") {
          expect(body.get("code")).toBe("new-code");
          expect(body.get("code_verifier")).toBe("pkce-verifier");
          expect(body.get("redirect_uri")).toBe(config.redirectUri);
        } else expect(body.get("refresh_token")).toBe("refresh-token");
        if (method === "client_secret_basic") {
          expect(headers.get("authorization")).toBe(`Basic ${Buffer.from(`${config.clientId}:test-secret`).toString("base64")}`);
          expect(body.has("client_id")).toBe(false);
          expect(body.has("client_secret")).toBe(false);
        } else {
          expect(headers.has("authorization")).toBe(false);
          expect(body.get("client_id")).toBe(config.clientId);
          expect(body.get("client_secret")).toBe(method === "client_secret_post" ? "test-secret" : null);
        }
      });
    }
  }

  it("defaults to Basic with a secret and form-encodes special characters before base64", async () => {
    const fetchMock = mockRequests();
    const client = new IapClient({ ...config, clientId: "client: +é", clientSecret: "secret:/ +&=" });
    expect(client.config.tokenEndpointAuthMethod).toBe("client_secret_basic");
    await client.exchangeCode("code", "verifier");
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    const header = new Headers(request.headers).get("authorization")!;
    expect(Buffer.from(header.slice(6), "base64").toString("utf8"))
      .toBe("client%3A+%2B%C3%A9:secret%3A%2F+%2B%26%3D");
  });

  it("defaults to none without a secret", () => {
    expect(new IapClient(config).config.tokenEndpointAuthMethod).toBe("none");
  });

  it.each(["client_secret_basic", "client_secret_post"] as const)("requires a nonblank secret for %s", (method) => {
    for (const clientSecret of [undefined, "", "   "]) {
      expect(() => new IapClient({ ...config, tokenEndpointAuthMethod: method, clientSecret })).toThrow("clientSecret is required");
    }
  });

  it("rejects secrets for none, including empty strings", () => {
    for (const clientSecret of ["secret", ""]) {
      expect(() => new IapClient({ ...config, tokenEndpointAuthMethod: "none", clientSecret })).toThrow("must be omitted");
    }
  });

  it("rejects unsupported methods at runtime", () => {
    expect(() => new IapClient({ ...config, tokenEndpointAuthMethod: "private_key_jwt" as TokenEndpointAuthMethod }))
      .toThrow("Unsupported tokenEndpointAuthMethod");
  });

  it("does not send credentials when discovery excludes the selected method", async () => {
    const fetchMock = mockRequests(Response.json(tokens), { ...discovery, token_endpoint_auth_methods_supported: ["none"] });
    await expect(new IapClient({ ...config, clientSecret: "secret" }).refresh("refresh-token"))
      .rejects.toThrow("does not advertise client_secret_basic");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("works when discovery omits authentication method metadata", async () => {
    const { token_endpoint_auth_methods_supported: _, ...metadata } = discovery;
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(metadata)).mockResolvedValueOnce(Response.json(tokens));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new IapClient({ ...config, clientSecret: "secret" }).refresh("refresh-token")).resolves.toEqual(tokens);
  });

  it("returns safe OAuth error metadata without retrying or exposing provider descriptions", async () => {
    const fetchMock = mockRequests(Response.json({ error: "invalid_client", error_description: "echoed-secret", error_hint: "echoed-token" }, { status: 401 }));
    const error = await new IapClient({ ...config, clientSecret: "secret" }).exchangeCode("code", "verifier").catch((value: unknown) => value);
    expect(error).toBeInstanceOf(IapTokenError);
    expect(error).toMatchObject({ status: 401, code: "invalid_client", authMethod: "client_secret_basic" });
    expect(String(error)).toContain("invalid_client");
    expect(JSON.stringify(error)).not.toContain("echoed-");
    expect(String(error)).not.toContain("echoed-");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(["html", "unknown_code", "invalid_json_shape"])("handles %s errors without exposing raw content", async (kind) => {
    const response = kind === "html" ? new Response("<html>secret</html>", { status: 502 })
      : Response.json(kind === "unknown_code" ? { error: "echoed-secret" } : null, { status: 400 });
    mockRequests(response);
    await expect(new IapClient(config).refresh("refresh-token"))
      .rejects.toMatchObject({ status: response.status, code: "token_exchange_failed", authMethod: "none" });
  });
});
