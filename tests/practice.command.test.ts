import { describe, expect, it } from "vitest";

import {
  buildPracticeAttendanceCustomId,
  buildPracticeRsvpCustomId,
  formatPracticeAttendanceMessage,
  formatPracticeRsvpMessage,
  practiceCommandJson
} from "../src/bot/commands/practice.js";

describe("practice command", () => {
  it("exports the expected slash command metadata", () => {
    expect(practiceCommandJson.name).toBe("practice");
    expect(practiceCommandJson.description).toBe(
      "Manage LionDen practice attendance sessions."
    );
    expect(practiceCommandJson.options?.map((option) => option.name)).toEqual([
      "configure",
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

  it("formats the RSVP announcement message", () => {
    expect(
      formatPracticeRsvpMessage({
        startedByDisplayName: "CoachA"
      })
    ).toBe(
      [
        "LionDen practice RSVP is open.",
        "Started by CoachA.",
        "Use these buttons for planning only."
      ].join("\n")
    );
  });

  it("formats the attendance announcement message", () => {
    expect(
      formatPracticeAttendanceMessage({
        startedByDisplayName: "CoachA"
      })
    ).toBe(
      [
        "LionDen practice attendance is open.",
        "Started by CoachA.",
        "Use `I'm Here` or `Not Here` as the official attendance record."
      ].join("\n")
    );
  });
});
