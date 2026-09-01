import type { Principal } from "./types.js";

export const hasRole = (principal: Principal | null | undefined, role: string) => principal?.roles.includes(role) ?? false;
export const hasAnyRole = (principal: Principal | null | undefined, roles: string[]) => roles.some((role) => hasRole(principal, role));
export const hasPermission = (principal: Principal | null | undefined, permission: string) => principal?.permissions.includes(permission) ?? false;
export const hasAnyPermission = (principal: Principal | null | undefined, permissions: string[]) => permissions.some((permission) => hasPermission(principal, permission));

export function requireAnyPermission(principal: Principal | null | undefined, permissions: string[]): Principal {
  if (!principal) throw new IapAuthorizationError(401, "unauthenticated");
  if (!hasAnyPermission(principal, permissions)) throw new IapAuthorizationError(403, "forbidden");
  return principal;
}

export function requireAnyRole(principal: Principal | null | undefined, roles: string[]): Principal {
  if (!principal) throw new IapAuthorizationError(401, "unauthenticated");
  if (!hasAnyRole(principal, roles)) throw new IapAuthorizationError(403, "forbidden");
  return principal;
}

export class IapAuthorizationError extends Error {
  constructor(public readonly status: 401 | 403, public readonly code: "unauthenticated" | "forbidden") { super(code); }
}
