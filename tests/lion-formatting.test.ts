import { describe, expect, it } from "vitest";

import { formatLionHelpMessage } from "../src/features/lions/lion-formatting.js";

describe("lion formatting", () => {
  it("keeps public help focused on member gameplay commands", () => {
    const message = formatLionHelpMessage();

    expect(message).toContain("~toplions");
    expect(message).toContain("~nickname");
    expect(message).toContain("~battlehistory");
    expect(message).toContain("~rarecatches");
    expect(message).not.toContain("/lionadmin");
    expect(message).not.toContain("Admin command");
  });
});
