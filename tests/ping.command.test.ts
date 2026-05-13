import { describe, expect, it } from "vitest";

import { pingCommandJson } from "../src/bot/commands/ping.js";

describe("ping command", () => {
  it("exports the expected slash command metadata", () => {
    expect(pingCommandJson.name).toBe("ping");
    expect(pingCommandJson.description).toBe(
      "Check whether LionDen is online and responsive."
    );
  });
});
