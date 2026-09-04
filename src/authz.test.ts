import { describe, expect, it } from "vitest";
import { hasPermission, hasResource, hasRole, requireAnyPermission } from "./authz.js";
import type { Principal } from "./types.js";

const principal: Principal = { subject: "user-1", issuer: "https://auth.bumame.com", audience: ["urn:bumame:cis"], picture: "https://example.com/avatar.jpg", roles: ["cis.doctor"], permissions: ["cis.patient.read"], resourceScopes: { "cis.clinics": { mode: "selected", ids: ["7"] } } };

describe("authorization", () => {
  it("checks normalized roles and permissions", () => { expect(hasRole(principal, "cis.doctor")).toBe(true); expect(hasPermission(principal, "cis.patient.read")).toBe(true); });
  it("denies missing permission", () => { expect(() => requireAnyPermission(principal, ["cis.patient.delete"])).toThrowError("forbidden"); });
  it("checks resource scopes", () => { expect(hasResource(principal, "cis.clinics", "7")).toBe(true); expect(hasResource(principal, "cis.clinics", "8")).toBe(false); });
});
