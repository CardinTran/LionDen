import { describe, expect, it } from "vitest";

import { profileCommandJson } from "../src/bot/commands/profile.js";

describe("profile command", () => {
  it("exports the expected slash command metadata", () => {
    expect(profileCommandJson.name).toBe("profile");
    expect(profileCommandJson.description).toBe(
      "View your LionDen progression profile."
    );
  });
});
