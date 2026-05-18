import { describe, expect, it } from "vitest";

import { lionAdminCommandJson } from "../src/bot/commands/lionadmin.js";

describe("lionadmin command", () => {
  it("exports officer-only lion controls without public message routing", () => {
    expect(lionAdminCommandJson.name).toBe("lionadmin");
    expect(lionAdminCommandJson.default_member_permissions).toBeDefined();
    expect(lionAdminCommandJson.options?.map((option) => option.name)).toEqual([
      "configure",
      "dropnow",
      "clearspawn",
      "cleareffects",
      "grantitem",
      "species",
      "item",
      "pause",
      "resume",
      "status"
    ]);
  });
});
