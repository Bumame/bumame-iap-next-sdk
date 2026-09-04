# Bumame IAP Next.js SDK

Server-side/BFF helpers for Next.js 15–16 applications using Bumame IAP.

## Install from GitHub

```bash
npm install github:Bumame/bumame-iap-next-sdk#v0.1.0-alpha.3
```

The package repository is public; applications should still pin a released tag.

## Server-only usage

```ts
import { IapClient, requireAnyPermission } from "@bumame/iap-next-sdk";

const iap = new IapClient({
  issuer: "https://auth.bumame.com",
  clientId: process.env.IAP_CLIENT_ID!,
  clientSecret: process.env.IAP_CLIENT_SECRET, // omit for public PKCE clients
  audience: "urn:bumame:cis",
  redirectUri: "https://cis.bumame.com/api/auth/callback",
});

const principal = await iap.verifyAccessToken(accessToken);
requireAnyPermission(principal, ["cis.patient.read"]);
```

Store `state`, `nonce`, PKCE verifier, tokens, and refresh tokens in encrypted, `HttpOnly`, `Secure`, `SameSite=Lax` server cookies or a server session. Never expose client secrets or refresh tokens to browser JavaScript. UI checks are for visibility only; the Go backend remains the security boundary.

## Minimal route-handler flow

`IapServerSession` owns PKCE, callback validation, refresh, and token lifecycle.
The Next app only implements `IapSessionStore` using encrypted HttpOnly cookies
or a server-side session library.

```ts
const session = new IapServerSession(iap, cookieSessionStore);

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
