import { describe, expect, it } from "vitest";

import {
  calculateLionMoveDamage,
  determineLionTurnOrder,
  getLionMoveSet,
  getTypeEffectiveness,
  resolveAutoLionBattle,
  resolveAutoLionTeamBattle,
  type LionBattleParticipant
} from "../src/features/lions/lion-battle.service.js";
import type {
  LionSpeciesRecord,
  UserLionWithSpeciesRecord
} from "../src/features/lions/lion-creature.service.js";

const now = new Date("2026-05-15T12:00:00.000Z");

const buildParticipant = (
  overrides: Partial<LionBattleParticipant> = {}
): LionBattleParticipant => ({
  id: "lion-a",
  level: 10,
  primaryType: "FIRE",
  secondaryType: null,
  stats: {
    hp: 80,
    attack: 24,
    defense: 16,
    speed: 12
  },
  ...overrides
});

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

describe("lion battle service", () => {
  it("calculates single and dual type effectiveness", () => {
    expect(
      getTypeEffectiveness({
        attackType: "FIRE",
        defenderPrimaryType: "NATURE"
      })
    ).toBe(2);
    expect(
      getTypeEffectiveness({
        attackType: "FIRE",
        defenderPrimaryType: "WATER"
      })
    ).toBe(0.5);
    expect(
      getTypeEffectiveness({
        attackType: "FIRE",
        defenderPrimaryType: "NATURE",
        defenderSecondaryType: "METAL"
      })
    ).toBe(4);
  });

  it("uses level, move power, attack, defense, STAB, and type matchup for damage", () => {
    const damage = calculateLionMoveDamage({
      attacker: buildParticipant(),
      defender: buildParticipant({
        id: "lion-b",
        primaryType: "NATURE",
        stats: {
          hp: 80,
          attack: 16,
          defense: 12,
          speed: 8
        }
      }),
      move: {
        type: "FIRE",
        power: 50
      },
      randomModifier: 1
    });

    expect(damage).toBe(33);
  });

  it("orders turns by speed and uses id as deterministic tie-breaker", () => {
    expect(
      determineLionTurnOrder(
        buildParticipant({
          id: "lion-b",
          stats: {
            hp: 1,
            attack: 1,
            defense: 1,
            speed: 20
          }
        }),
        buildParticipant({
          id: "lion-a",
          stats: {
            hp: 1,
            attack: 1,
            defense: 1,
            speed: 10
          }
        })
      )[0].id
    ).toBe("lion-b");

    expect(
      determineLionTurnOrder(
        buildParticipant({
          id: "lion-b"
        }),
        buildParticipant({
          id: "lion-a"
        })
      )[0].id
    ).toBe("lion-a");
  });

  it("builds a small default moveset from lion typing", () => {
    expect(
      getLionMoveSet(
        buildOwnedLion({
          species: buildSpecies({
            primaryType: "FIRE",
            secondaryType: "WIND"
          })
        })
      ).map((move) => move.key)
    ).toEqual(["ember-pounce", "gale-strike", "pounce"]);
  });

  it("resolves a quick auto battle with a winner and round log", () => {
    const result = resolveAutoLionBattle({
      firstLion: buildOwnedLion({
        id: "owned-a",
        species: buildSpecies({
          name: "Fire Lion",
          primaryType: "FIRE",
          baseAttack: 20,
          baseSpeed: 14
        })
      }),
      secondLion: buildOwnedLion({
        id: "owned-b",
        userId: "user-b",
        species: buildSpecies({
          id: "species-b",
          name: "Nature Lion",
          primaryType: "NATURE",
          baseDefense: 8,
          baseSpeed: 8
        })
      }),
      random: () => 1
    });

    expect(result.winner.id).toBe("owned-a");
    expect(result.rounds.length).toBeGreaterThan(0);
    expect(result.finalHp["owned-b"]).toBe(0);
  });

  it("resolves a team battle by sending in the next team lion after a faint", () => {
    const result = resolveAutoLionTeamBattle({
      firstTeam: [
        buildOwnedLion({
          id: "owned-a1",
          species: buildSpecies({
            id: "species-a1",
            name: "First Scout",
            primaryType: "NATURE",
            baseHp: 20,
            baseAttack: 8,
            baseDefense: 6,
            baseSpeed: 6
          })
        }),
        buildOwnedLion({
          id: "owned-a2",
          species: buildSpecies({
            id: "species-a2",
            name: "First Anchor",
            primaryType: "WATER",
            baseHp: 90,
            baseAttack: 26,
            baseDefense: 18,
            baseSpeed: 15
          })
        })
      ],
      secondTeam: [
        buildOwnedLion({
          id: "owned-b1",
          userId: "user-b",
          species: buildSpecies({
            id: "species-b1",
            name: "Second Bruiser",
            primaryType: "FIRE",
            baseHp: 65,
            baseAttack: 26,
            baseDefense: 10,
            baseSpeed: 18
          })
        })
      ],
      random: () => 1,
      maxRounds: 20
    });

    expect(result.winnerSide).toBe("first");
    expect(result.participantLionIds.first).toEqual(["owned-a1", "owned-a2"]);
    expect(result.participantLionIds.second).toEqual(["owned-b1"]);
    expect(result.finalHp["owned-a1"]).toBe(0);
    expect(result.finalHp["owned-a2"]).toBeGreaterThan(0);
    expect(result.finalHp["owned-b1"]).toBe(0);
  });
});
