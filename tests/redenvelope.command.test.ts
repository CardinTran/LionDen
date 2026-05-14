import { describe, expect, it } from "vitest";

import {
  buildRedEnvelopeCustomId,
  formatRedEnvelopeClaimedMessage,
  formatRedEnvelopeMessage,
  redEnvelopeCommandJson
} from "../src/bot/commands/redenvelope.js";

describe("redenvelope command", () => {
  it("exports the expected slash command metadata", () => {
    expect(redEnvelopeCommandJson.name).toBe("redenvelope");
    expect(redEnvelopeCommandJson.description).toBe(
      "Create a LionDen red envelope for the server."
    );
    expect(redEnvelopeCommandJson.options?.map((option) => option.name)).toEqual([
      "create"
    ]);
  });

  it("builds a stable claim custom id", () => {
    expect(buildRedEnvelopeCustomId("envelope_123")).toBe(
      "redenvelope:claim:envelope_123"
    );
  });

  it("formats an open red envelope message", () => {
    expect(
      formatRedEnvelopeMessage({
        createdByDisplayName: "OfficerA",
        amount: 40
      })
    ).toBe(
      [
        "A LionDen red envelope has appeared.",
        "Created by OfficerA.",
        "First claim gets 40 coins."
      ].join("\n")
    );
  });

  it("formats a claimed red envelope message", () => {
    expect(
      formatRedEnvelopeClaimedMessage({
        envelope: {
          id: "envelope_123",
          guildId: "guild_123",
          channelId: "channel_123",
          createdByUserId: "officer_123",
          createdByDisplayName: "OfficerA",
          amount: 40,
          status: "CLAIMED",
          messageId: "message_123",
          claimedByUserId: "member_123",
          claimedByDisplayName: "MemberA",
          claimedAt: new Date("2026-05-14T12:30:00.000Z"),
          createdAt: new Date("2026-05-14T12:00:00.000Z"),
          updatedAt: new Date("2026-05-14T12:30:00.000Z")
        }
      })
    ).toBe(
      [
        "A LionDen red envelope has been claimed.",
        "Created by OfficerA.",
        "MemberA claimed 40 coins."
      ].join("\n")
    );
  });
});
