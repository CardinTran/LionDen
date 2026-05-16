import { describe, expect, it } from "vitest";

import {
  calculateLionMoveDamage,
  determineLionTurnOrder,
  getTypeEffectiveness,
  type LionBattleParticipant
} from "../src/features/lions/lion-battle.service.js";

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
});
