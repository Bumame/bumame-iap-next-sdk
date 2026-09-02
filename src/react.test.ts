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
    }, "Doctor");
    expect(view).toEqual({ name: "Irfan Ghifari", role: "Doctor", initials: "IG" });
  });
});
