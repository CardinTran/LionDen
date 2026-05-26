import { beforeEach, describe, expect, it } from "vitest";

import {
  acceptLionDuelChallenge,
  applyLionDuelAction,
  cancelLionDuel,
  clearLionDuelStore,
  createLionDuelChallenge
} from "../src/features/lions/lion-duel.service.js";
import type {
  LionSpeciesRecord,
  UserLionWithSpeciesRecord
} from "../src/features/lions/lion-creature.service.js";

const now = new Date("2026-05-25T12:00:00.000Z");

const buildSpecies = (
  overrides: Partial<LionSpeciesRecord> = {}
): LionSpeciesRecord => ({
  id: "species_123",
  publicId: "L001",
  slug: "rdl-lion-001",
  name: "RDL Lion 001",
  imagePath: "assets/lions/cards/rdl-lion-001.jpg",
  rarity: "COMMON",
  baseCatchRate: 70,
  baseValue: 1,
  spawnWeight: 100,
  primaryType: "NEUTRAL",
  secondaryType: null,
  baseHp: 50,
  baseAttack: 10,
  baseDefense: 10,
  baseSpeed: 10,
  abilityKey: "steady-heart",
  abilityName: "Steady Heart",
  abilityDescription: "A dependable passive trait.",
  description: "A local test lion.",
  isEnabled: true,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildOwnedLion = (
  overrides: Partial<UserLionWithSpeciesRecord> = {}
): UserLionWithSpeciesRecord => ({
  id: "owned_123",
  guildId: "guild_123",
  userId: "user_123",
  ownerDisplayName: "Mira",
  lionSpeciesId: "species_123",
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

const createDuel = () =>
  createLionDuelChallenge({
    guildId: "guild_123",
    channelId: "channel_123",
    challengerUserId: "user_123",
    challengerDisplayName: "Mira",
    challengerLion: buildOwnedLion({
      id: "owned_fast",
      userId: "user_123",
      species: buildSpecies({
        baseSpeed: 20,
        primaryType: "FIRE"
      })
    }),
    opponentUserId: "user_456",
    opponentDisplayName: "Cardin",
    opponentLion: buildOwnedLion({
      id: "owned_slow",
      userId: "user_456",
      ownerDisplayName: "Cardin",
      species: buildSpecies({
        id: "species_456",
        publicId: "L002",
        slug: "rdl-lion-002",
        name: "RDL Lion 002",
        baseSpeed: 8,
        primaryType: "NATURE"
      })
    }),
    now
  });

describe("lion duel service", () => {
  beforeEach(() => {
    clearLionDuelStore();
  });

  it("creates a pending 1v1 duel without recording battle history", () => {
    const result = createDuel();

    expect(result.outcome).toBe("created");
    expect(result.duel.status).toBe("PENDING");
    expect(result.duel.challenger.userId).toBe("user_123");
    expect(result.duel.opponent.userId).toBe("user_456");
    expect(result.duel.turnUserId).toBeNull();
  });

  it("prevents overlapping active duel challenges", () => {
    const first = createDuel();
    const second = createDuel();

    expect(first.outcome).toBe("created");
    expect(second.outcome).toBe("active_duel_exists");
    expect(second.duel.id).toBe(first.duel.id);
  });

  it("accepts a duel and assigns first turn by lion speed", () => {
    const created = createDuel();
    const accepted = acceptLionDuelChallenge({
      duelId: created.duel.id,
      userId: "user_456",
      now
    });

    expect(accepted.outcome).toBe("accepted");
    expect(accepted.duel?.status).toBe("ACTIVE");
    expect(accepted.duel?.turnUserId).toBe("user_123");
  });

  it("rejects accept attempts from users who are not the opponent", () => {
    const created = createDuel();
    const accepted = acceptLionDuelChallenge({
      duelId: created.duel.id,
      userId: "user_789",
      now
    });

    expect(accepted.outcome).toBe("not_opponent");
    expect(accepted.duel?.status).toBe("PENDING");
  });

  it("applies turn actions and ends when a lion reaches zero HP", () => {
    const created = createDuel();
    acceptLionDuelChallenge({
      duelId: created.duel.id,
      userId: "user_456",
      now
    });

    const result = applyLionDuelAction({
      duelId: created.duel.id,
      userId: "user_123",
      action: "special",
      now,
      random: () => 1
    });

    expect(result.outcome).toBe("updated");
    expect(result.duel?.opponent.hp).toBeLessThan(
      result.duel?.opponent.maxHp ?? 0
    );
    expect(result.duel?.turnUserId).toBe("user_456");
  });

  it("guards to reduce the next incoming damage", () => {
    const guardedDuel = createDuel();
    acceptLionDuelChallenge({
      duelId: guardedDuel.duel.id,
      userId: "user_456",
      now
    });
    applyLionDuelAction({
      duelId: guardedDuel.duel.id,
      userId: "user_123",
      action: "guard",
      now
    });
    const guardedHit = applyLionDuelAction({
      duelId: guardedDuel.duel.id,
      userId: "user_456",
      action: "basic",
      now,
      random: () => 1
    });
    const guardedDamage =
      guardedDuel.duel.challenger.maxHp - (guardedHit.duel?.challenger.hp ?? 0);

    clearLionDuelStore();
    const unguardedDuel = createDuel();
    acceptLionDuelChallenge({
      duelId: unguardedDuel.duel.id,
      userId: "user_456",
      now
    });
    applyLionDuelAction({
      duelId: unguardedDuel.duel.id,
      userId: "user_123",
      action: "basic",
      now,
      random: () => 1
    });
    const unguardedHit = applyLionDuelAction({
      duelId: unguardedDuel.duel.id,
      userId: "user_456",
      action: "basic",
      now,
      random: () => 1
    });
    const unguardedDamage =
      unguardedDuel.duel.challenger.maxHp -
      (unguardedHit.duel?.challenger.hp ?? 0);

    expect(guardedDamage).toBeLessThan(unguardedDamage);
  });

  it("supports participant cancellation", () => {
    const created = createDuel();
    const result = cancelLionDuel({
      duelId: created.duel.id,
      userId: "user_123",
      now
    });

    expect(result.outcome).toBe("canceled");
    expect(result.duel?.status).toBe("CANCELED");
  });

  it("expires pending challenges deterministically", () => {
    const created = createDuel();
    const result = acceptLionDuelChallenge({
      duelId: created.duel.id,
      userId: "user_456",
      now: new Date(now.getTime() + 3 * 60_000)
    });

    expect(result.outcome).toBe("expired");
    expect(result.duel?.status).toBe("CANCELED");
    expect(result.duel?.log.at(-1)).toBe("The duel challenge expired.");
  });
});
