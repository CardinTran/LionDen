import { describe, expect, it } from "vitest";

import {
  formatLionHelpMessage,
  formatTeamBattleLionMessage
} from "../src/features/lions/lion-formatting.js";
import type {
  LionSpeciesRecord,
  UserLionWithSpeciesRecord
} from "../src/features/lions/lion-creature.service.js";

const now = new Date("2026-05-15T12:00:00.000Z");

const buildSpecies = (
  overrides: Partial<LionSpeciesRecord> = {}
): LionSpeciesRecord => ({
  id: "species-a",
  publicId: "L001",
  slug: "rdl-lion-001",
  name: "RDL Lion 001",
  imagePath: "assets/lions/cards/rdl-lion-001.jpg",
  rarity: "COMMON",
  baseCatchRate: 70,
  baseValue: 1,
  spawnWeight: 100,
  primaryType: "FIRE",
  secondaryType: null,
  baseHp: 50,
  baseAttack: 16,
  baseDefense: 10,
  baseSpeed: 12,
  abilityKey: "steady-heart",
  abilityName: "Steady Heart",
  abilityDescription: "A dependable passive trait.",
  description: "A test lion.",
  isEnabled: true,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildOwnedLion = (
  overrides: Partial<UserLionWithSpeciesRecord> = {}
): UserLionWithSpeciesRecord => ({
  id: "owned-a",
  guildId: "guild_123",
  userId: "user-a",
  ownerDisplayName: "User A",
  lionSpeciesId: "species-a",
  nickname: null,
  level: 5,
  experience: 0,
  sourceType: "WILD_CATCH",
  sourceReferenceId: null,
  lastTrainedAt: null,
  lastBattledAt: null,
  acquiredAt: now,
  createdAt: now,
  updatedAt: now,
  species: buildSpecies(),
  ...overrides
});

describe("lion formatting", () => {
  it("keeps public help focused on member gameplay commands", () => {
    const message = formatLionHelpMessage();

    expect(message).toContain("~toplions");
    expect(message).toContain("~nickname");
    expect(message).toContain("~favorite");
    expect(message).toContain("~showcase");
    expect(message).toContain("~release");
    expect(message).toContain("~battle accept");
    expect(message).toContain("~duel @user");
    expect(message).toContain("~battle decline");
    expect(message).toContain("~battle training");
    expect(message).toContain("~battlehistory");
    expect(message).toContain("~battleboard");
    expect(message).toContain("~rarecatches");
    expect(message).toContain("team battles currently resolve automatically");
    expect(message).toContain("does not affect team battle history yet");
    expect(message).not.toContain("/lionadmin");
    expect(message).not.toContain("Admin command");
  });

  it("formats team battles with transparent round logs and winner reasoning", () => {
    const firstLion = buildOwnedLion({
      id: "owned-a",
      nickname: "Blaze",
      species: buildSpecies({
        publicId: "L001",
        name: "Fire Lion",
        primaryType: "FIRE"
      })
    });
    const secondLion = buildOwnedLion({
      id: "owned-b",
      userId: "user-b",
      nickname: "Sprout",
      species: buildSpecies({
        id: "species-b",
        publicId: "L002",
        name: "Nature Lion",
        primaryType: "NATURE"
      })
    });
    const message = formatTeamBattleLionMessage({
      battle: {
        firstTeam: [firstLion],
        secondTeam: [secondLion],
        winnerSide: "first",
        loserSide: "second",
        rounds: [
          {
            round: 1,
            attackerLionId: firstLion.id,
            attackerName: "Blaze",
            defenderLionId: secondLion.id,
            defenderName: "Sprout",
            move: {
              key: "ember-pounce",
              name: "Ember Pounce",
              type: "FIRE",
              power: 48,
              accuracy: 95
            },
            damage: 42,
            effectiveness: 2,
            defenderHpAfter: 0
          }
        ],
        finalHp: {
          [firstLion.id]: 31,
          [secondLion.id]: 0
        },
        participantLionIds: {
          first: [firstLion.id],
          second: [secondLion.id]
        }
      },
      firstDisplayName: "Mira",
      secondDisplayName: "Cardin",
      winnerRewards: [],
      loserRewards: [],
      mvpLion: firstLion
    });

    expect(message).toContain("Mira's team defeated Cardin's team.");
    expect(message).toContain("Why Mira won:");
    expect(message).toContain("dealt 42 total damage");
    expect(message).toContain("knocked out 1/1 opposing lions");
    expect(message).toContain(
      "Round 1: Blaze used Ember Pounce [FIRE], dealing 42 damage"
    );
    expect(message).toContain("type advantage x2");
  });
});
