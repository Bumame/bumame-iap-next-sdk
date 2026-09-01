# Bumame IAP Next.js SDK

Server-side/BFF helpers for Next.js 15–16 applications using Bumame IAP.

## Install from private GitHub

```bash
npm install github:Bumame/bumame-iap-next-sdk#v0.1.0-alpha.1
```

The developer and CI identity must have repository read access. Keep the repository private.

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
