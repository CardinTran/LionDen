import { describe, expect, it } from "vitest";

import {
  buildPracticeAttendanceCustomId,
  buildPracticeRsvpCustomId,
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

  it("builds stable RSVP and attendance button custom ids", () => {
    expect(buildPracticeRsvpCustomId("session_123", "GOING")).toBe(
      "practice:rsvp:GOING:session_123"
    );
    expect(buildPracticeAttendanceCustomId("session_123", "HERE")).toBe(
      "practice:attendance:HERE:session_123"
    );
  });

  it("formats the attendance announcement message", () => {
    expect(
      formatPracticeAnnouncementMessage({
        startedByDisplayName: "CoachA"
      })
    ).toBe(
      [
        "LionDen practice attendance is live.",
        "Started by CoachA.",
        "Use the RSVP buttons for planning.",
        "Use `I'm Here` or `Not Here` as the actual attendance record."
      ].join("\n")
    );
  });
});
