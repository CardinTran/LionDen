import { describe, expect, it } from "vitest";

import {
  buildPracticeCheckInCustomId,
  formatPracticeAnnouncementMessage,
  practiceCommandJson
} from "../src/bot/commands/practice.js";

describe("practice command", () => {
  it("exports the expected slash command metadata", () => {
    expect(practiceCommandJson.name).toBe("practice");
    expect(practiceCommandJson.description).toBe(
      "Manage LionDen practice attendance sessions."
    );
    expect(practiceCommandJson.options?.map((option) => option.name)).toEqual([
      "start",
      "end"
    ]);
  });

  it("builds a stable button custom id", () => {
    expect(buildPracticeCheckInCustomId("session_123")).toBe(
      "practice:checkin:session_123"
    );
  });

  it("formats the attendance announcement message", () => {
    expect(
      formatPracticeAnnouncementMessage({
        startedByDisplayName: "CoachA"
      })
    ).toBe(
      [
        "LionDen practice check-in is live.",
        "Started by CoachA.",
        "Click the button below if you're at practice tonight."
      ].join("\n")
    );
  });
});
