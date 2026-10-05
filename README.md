# Bumame IAP Next.js SDK

Server-side/BFF helpers for Next.js 15–16 applications using Bumame IAP.

## Install from GitHub

```bash
npm install github:Bumame/bumame-iap-next-sdk#v1.0.0
```

The package repository is public; applications should still pin a released tag.

## Server-only usage

```ts
import { IapClient, requireAnyPermission, requireResource } from "@bumame/iap-next-sdk";

const iap = new IapClient({
  issuer: "https://auth.bumame.com",
  clientId: process.env.IAP_CLIENT_ID!,
  clientSecret: process.env.IAP_CLIENT_SECRET, // omit for public PKCE clients
  tokenEndpointAuthMethod: "client_secret_basic",
  audience: "urn:bumame:cis",
  redirectUri: "https://cis.bumame.com/api/auth/callback",
});

const principal = await iap.verifyAccessToken(accessToken);
requireAnyPermission(principal, ["cis.patient.read"]);
requireResource(principal, "cis.clinics", selectedClinicId);
```

Store `state`, `nonce`, PKCE verifier, and the complete token set in a server-side session store. Put only a random opaque session ID in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. IAP token sets can exceed a browser's per-cookie size limit, even after encryption; do not serialize `TokenSet` into a cookie or split it across cookies. Never expose client secrets or refresh tokens to browser JavaScript. UI checks are for visibility only; the Go backend remains the security boundary. See the [Redis-backed Next.js BFF example](https://docs.iap.bumame.com/implementation/nextjs-bff).

## Token endpoint authentication

Register Next.js BFF clients as **Confidential** in IAP with
`token_endpoint_auth_method=client_secret_basic`. The SDK defaults to Basic when
`clientSecret` is provided; it defaults to `none` when the secret is omitted.
This development update changes the previous secret-in-body default.

| Method | Credential delivery | Required configuration |
| --- | --- | --- |
| `client_secret_basic` | OAuth form-encoded credentials in the HTTP Basic header | Nonempty `clientSecret` |
| `client_secret_post` | `client_id` and `client_secret` in the form body | Nonempty `clientSecret`; explicitly select this method |
| `none` | Only `client_id` in the form body | Omit `clientSecret`; public client with PKCE |

The selected method must match the **individual client's registration** in IAP/Ory.
Discovery advertises server capabilities, not the method registered for a client.
The SDK checks advertised methods when available and never retries with another
authentication method. Code exchange and refresh use the same configuration.
For public clients, omit both `clientSecret` and `tokenEndpointAuthMethod`, or
explicitly choose `none`.

Token endpoint failures throw `IapTokenError`, exported from the main package,
with `status`, `code`, and `authMethod`. Only recognized OAuth error codes are
exposed; provider descriptions and response bodies are excluded because they can
contain credentials. Do not log the client/session object, request body, or
Authorization header. Diagnose `invalid_client` by checking the client's method
and active secret. After correcting configuration, start a new login flow.

## Minimal route-handler flow

`IapServerSession` owns PKCE, callback validation, refresh, and token lifecycle.
The Next app implements `IapSessionStore` with server-side token persistence and
an opaque session-ID cookie.

```ts
const session = new IapServerSession(iap, serverSessionStore);

// /api/auth/login
return Response.redirect((await session.start()).url);

// /api/auth/callback
await session.complete(request.url);

// protected server route
const principal = await session.principal();
requireAnyPermission(principal, ["cis.patient.read"]);
```

## Account menu

Import `IapProfileMenu` from `@bumame/iap-next-sdk/react` in a Client
Component. It renders the provider avatar with an initials fallback, name,
friendly role label, Profile settings link, and application-provided logout
handler. The component accepts `renderProfileLink` when an application wants
to use `next/link` instead of a regular anchor.
