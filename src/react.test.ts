import { describe, expect, it } from "vitest";
import { profileMenuView } from "./react.js";

describe("profileMenuView", () => {
  it("uses display name, friendly role, and initials", () => {
    const view = profileMenuView({
      subject: "user-1",
      issuer: "https://auth.bumame.com",
      audience: ["urn:bumame:cis"],
      email: "irfan.ghifari@bumame.com",
      name: "Irfan Ghifari",
      roles: ["cis.doctor"],
      permissions: [],
      resourceScopes: {},
    }, "Doctor");
    expect(view).toEqual({ name: "Irfan Ghifari", role: "Doctor", initials: "IG" });
  });

  it("turns a namespaced role into a readable label", () => {
    const view = profileMenuView({
      subject: "user-2",
      issuer: "https://auth.bumame.com",
      audience: ["urn:bumame:cis"],
      roles: ["cis.front-office"],
      permissions: [],
      resourceScopes: {},
      name: "Bumame User",
    });
    expect(view.role).toBe("Front Office");
  });

  it("selects the role owned by the active application", () => {
    const view = profileMenuView({
      subject: "user-3",
      issuer: "https://auth.bumame.com",
      audience: ["urn:bumame:crm"],
      roles: ["app-and-data", "vpn.access", "crm.user"],
      permissions: [],
      resourceScopes: {},
      name: "CRM User",
    }, undefined, "crm");

    expect(view.role).toBe("User");
  });
});
