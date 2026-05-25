import { describe, expect, it } from "vitest";

import {
  LION_MESSAGE_COMMANDS,
  parseLionMessageCommand
} from "../src/bot/messages/lions/parsing.js";

describe("lion message command parsing", () => {
  it("normalizes known commands and preserves arguments", () => {
    expect(parseLionMessageCommand("  ~BATTLE accept @Mira  ")).toEqual({
      normalizedCommand: "~battle",
      args: ["accept", "@Mira"]
    });
  });

  it("ignores non-lion message content", () => {
    expect(parseLionMessageCommand("hello team")).toBeNull();
    expect(parseLionMessageCommand("~unknown")).toBeNull();
  });

  it("keeps the public lion command allow-list explicit", () => {
    expect(LION_MESSAGE_COMMANDS).toEqual([
      "~help",
      "~shop",
      "~buy",
      "~bag",
      "~use",
      "~catch",
      "~train",
      "~nickname",
      "~release",
      "~team",
      "~battle",
      "~accept",
      "~decline",
      "~cancelbattle",
      "~battlehistory",
      "~battlestats",
      "~battleboard",
      "~toplions",
      "~lionboard",
      "~rarecatches",
      "~lions",
      "~lion",
      "~wild"
    ]);
  });
});
