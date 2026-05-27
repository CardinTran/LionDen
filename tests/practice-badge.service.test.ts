import { describe, expect, it, vi } from "vitest";

import type {
  BadgeDefinitionRecord,
  UserBadgeRecord
} from "../src/features/challenges/weekly-challenge.service.js";
import {
  awardPracticeBadge,
  awardPracticeBadgesForCompletedSession,
  backfillPracticeBadges,
  evaluateUserPracticeBadgeEligibility,
  listUserPracticeBadges,
  syncDefaultPracticeBadgeDefinitions,
  type PracticeBadgeStore
} from "../src/features/practice/practice-badge.service.js";
import type {
  PracticeAttendanceStatus,
  PracticeCheckInRecord,
  PracticeSessionRecord
} from "../src/features/practice/practice.service.js";

const now = new Date("2026-05-27T12:00:00.000Z");

const buildSession = (
  index: number,
  overrides: Partial<PracticeSessionRecord> = {}
): PracticeSessionRecord => ({
  id: `session_${index}`,
  guildId: "guild_123",
  startedByUserId: "coach_123",
  startedByDisplayName: "Coach",
  announcementChannelId: "channel_123",
  source: "MANUAL",
  scheduledDateKey: null,
  scheduledStartAt: null,
  scheduledEndAt: null,
  rsvpMessageId: null,
  rsvpPostedAt: null,
  attendanceMessageId: null,
  attendancePostedAt: null,
  status: "ENDED",
  startedAt: new Date(Date.UTC(2026, 0, index, 23)),
  endedAt: new Date(Date.UTC(2026, 0, index + 1, 1)),
  endedByUserId: "coach_123",
  ...overrides
});

const buildCheckIn = (
  sessionId: string,
  overrides: Partial<PracticeCheckInRecord> = {}
): PracticeCheckInRecord => ({
  id: `${sessionId}_${overrides.userId ?? "user_123"}`,
  sessionId,
  guildId: "guild_123",
  userId: "user_123",
  displayName: "Mira",
  rsvpStatus: null,
  attendanceStatus: "HERE",
  rewardAppliedAt: new Date("2026-01-02T01:00:00.000Z"),
  rewardXp: 30,
  checkedInAt: new Date("2026-01-02T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  ...overrides
});

const createStore = (input: {
  sessions: PracticeSessionRecord[];
  checkIns: PracticeCheckInRecord[];
  definitions?: BadgeDefinitionRecord[];
  awards?: UserBadgeRecord[];
}): PracticeBadgeStore & {
  definitions: BadgeDefinitionRecord[];
  awards: UserBadgeRecord[];
} => {
  const definitions = [...(input.definitions ?? [])];
  const awards = [...(input.awards ?? [])];

  return {
    definitions,
    awards,
    practiceSession: {
      findMany: vi.fn(async ({ where, orderBy, take }) => {
        let sessions = input.sessions.filter((session) => {
          const endedAt = session.endedAt;

          if (
            session.guildId !== where.guildId ||
            session.status !== where.status ||
            !endedAt
          ) {
            return false;
          }

          if (where.endedAt?.gte && endedAt < where.endedAt.gte) {
            return false;
          }

          if (where.endedAt?.lte && endedAt > where.endedAt.lte) {
            return false;
          }

          return true;
        });
        const direction = orderBy?.[0]?.endedAt ?? "desc";

        sessions = sessions.sort((first, second) => {
          const delta =
            (first.endedAt?.getTime() ?? 0) - (second.endedAt?.getTime() ?? 0);
          return direction === "asc" ? delta : -delta;
        });

        return take ? sessions.slice(0, take) : sessions;
      })
    },
    practiceCheckIn: {
      findMany: vi.fn(async ({ where }) =>
        input.checkIns.filter((checkIn) => {
          const sessionMatches =
            typeof where.sessionId === "object"
              ? where.sessionId.in.includes(checkIn.sessionId)
              : where.sessionId === undefined ||
                checkIn.sessionId === where.sessionId;

          return (
            checkIn.guildId === where.guildId &&
            sessionMatches &&
            (where.userId === undefined || checkIn.userId === where.userId) &&
            (where.attendanceStatus === undefined ||
              checkIn.attendanceStatus === where.attendanceStatus)
          );
        })
      )
    },
    badgeDefinition: {
      upsert: vi.fn(async ({ where, create, update }) => {
        const existing = definitions.find(
          (definition) => definition.badgeKey === where.badgeKey
        );

        if (existing) {
          Object.assign(existing, update, {
            updatedAt: now
          });
          return existing;
        }

        const definition = {
          id: `definition_${definitions.length + 1}`,
          createdAt: now,
          updatedAt: now,
          ...create
        };
        definitions.push(definition);
        return definition;
      }),
      findUnique: vi.fn(async ({ where }) =>
        definitions.find((definition) => definition.badgeKey === where.badgeKey) ??
        null
      ),
      findMany: vi.fn(async (args) => {
        const keys = args?.where?.badgeKey?.in;

        return definitions
          .filter(
            (definition) =>
              (!keys || keys.includes(definition.badgeKey)) &&
              (args?.where?.isEnabled === undefined ||
                definition.isEnabled === args.where.isEnabled)
          )
          .sort((first, second) => first.badgeKey.localeCompare(second.badgeKey));
      }),
      count: vi.fn(async ({ where }) =>
        definitions.filter(
          (definition) =>
            (!where.badgeKey?.in || where.badgeKey.in.includes(definition.badgeKey)) &&
            (where.isEnabled === undefined || definition.isEnabled === where.isEnabled)
        ).length
      )
    },
    userBadge: {
      findUnique: vi.fn(async ({ where }) =>
        awards.find(
          (award) =>
            award.guildId === where.guildId_userId_badgeKey.guildId &&
            award.userId === where.guildId_userId_badgeKey.userId &&
            award.badgeKey === where.guildId_userId_badgeKey.badgeKey
        ) ?? null
      ),
      findMany: vi.fn(async ({ where, orderBy }) => {
        let result = awards.filter(
          (award) =>
            award.guildId === where.guildId &&
            (where.userId === undefined || award.userId === where.userId) &&
            (where.badgeKey === undefined ||
              where.badgeKey.in.includes(award.badgeKey))
        );
        const direction = orderBy?.[0]?.awardedAt ?? "desc";

        result = result.sort((first, second) => {
          const delta = first.awardedAt.getTime() - second.awardedAt.getTime();
          return direction === "asc" ? delta : -delta;
        });

        return result;
      }),
      create: vi.fn(async ({ data }) => {
        const award = {
          id: `award_${awards.length + 1}`,
          ...data
        };
        awards.push(award);
        return award;
      })
    }
  };
};

const createAttendedSeries = (count: number, userId = "user_123") => {
  const sessions = Array.from({ length: count }, (_value, index) =>
    buildSession(index + 1)
  );
  const checkIns = sessions.map((session) =>
    buildCheckIn(session.id, {
      userId
    })
  );

  return {
    sessions,
    checkIns
  };
};

describe("practice badge service", () => {
  it("syncs default practice badge definitions idempotently while preserving disabled definitions", async () => {
    const store = createStore({
      sessions: [],
      checkIns: [],
      definitions: [
        {
          id: "definition_1",
          badgeKey: "first-practice",
          title: "Old First Practice",
          description: "Old description.",
          isEnabled: false,
          createdAt: now,
          updatedAt: now
        }
      ]
    });

    await syncDefaultPracticeBadgeDefinitions(store);
    await syncDefaultPracticeBadgeDefinitions(store);

    expect(store.definitions).toHaveLength(6);
    expect(
      store.definitions.find((definition) => definition.badgeKey === "first-practice")
        ?.isEnabled
    ).toBe(false);
  });

  it("awards a badge idempotently and skips disabled definitions", async () => {
    const store = createStore({
      sessions: [],
      checkIns: [],
      definitions: [
        {
          id: "definition_1",
          badgeKey: "first-practice",
          title: "First Practice",
          description: "Attend your first practice.",
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id: "definition_2",
          badgeKey: "perfect-week",
          title: "Perfect Week",
          description: "Attend every practice in a week.",
          isEnabled: false,
          createdAt: now,
          updatedAt: now
        }
      ]
    });

    await expect(
      awardPracticeBadge(store, {
        guildId: "guild_123",
        userId: "user_123",
        badgeKey: "first-practice",
        awardedAt: now
      })
    ).resolves.toMatchObject({
      outcome: "awarded"
    });
    await expect(
      awardPracticeBadge(store, {
        guildId: "guild_123",
        userId: "user_123",
        badgeKey: "first-practice",
        awardedAt: now
      })
    ).resolves.toMatchObject({
      outcome: "already_awarded"
    });
    await expect(
      awardPracticeBadge(store, {
        guildId: "guild_123",
        userId: "user_123",
        badgeKey: "perfect-week",
        awardedAt: now
      })
    ).resolves.toMatchObject({
      outcome: "definition_disabled"
    });
    expect(store.awards).toHaveLength(1);
  });

  it("evaluates First Practice, streak, regular, and veteran eligibility from attended history", async () => {
    const { sessions, checkIns } = createAttendedSeries(25);
    const store = createStore({
      sessions,
      checkIns
    });

    await expect(
      evaluateUserPracticeBadgeEligibility(store, {
        guildId: "guild_123",
        userId: "user_123",
        now
      })
    ).resolves.toEqual([
      "first-practice",
      "three-practice-streak",
      "five-practice-streak",
      "perfect-week",
      "practice-regular",
      "practice-veteran"
    ]);
  });

  it("does not count Not Here, no response, active, or future sessions", async () => {
    const sessions = [
      buildSession(1),
      buildSession(2),
      buildSession(3),
      buildSession(4, {
        status: "ACTIVE",
        endedAt: null
      }),
      buildSession(5, {
        endedAt: new Date("2026-06-01T01:00:00.000Z")
      })
    ];
    const store = createStore({
      sessions,
      checkIns: [
        buildCheckIn("session_1"),
        buildCheckIn("session_2", {
          attendanceStatus: "NOT_HERE" as PracticeAttendanceStatus,
          rewardXp: 0
        }),
        buildCheckIn("session_3", {
          attendanceStatus: null,
          rewardXp: 0
        }),
        buildCheckIn("session_4"),
        buildCheckIn("session_5")
      ]
    });

    await expect(
      evaluateUserPracticeBadgeEligibility(store, {
        guildId: "guild_123",
        userId: "user_123",
        now
      })
    ).resolves.toEqual(["first-practice"]);
  });

  it("awards Perfect Week for one completed practice in the week", async () => {
    const store = createStore({
      sessions: [buildSession(1)],
      checkIns: [buildCheckIn("session_1")]
    });

    await expect(
      evaluateUserPracticeBadgeEligibility(store, {
        guildId: "guild_123",
        userId: "user_123",
        now
      })
    ).resolves.toEqual(["first-practice", "perfect-week"]);
  });

  it("requires every completed practice in a week for Perfect Week", async () => {
    const sessions = [buildSession(1), buildSession(2)];
    const store = createStore({
      sessions,
      checkIns: [
        buildCheckIn("session_1"),
        buildCheckIn("session_2", {
          attendanceStatus: "NOT_HERE",
          rewardXp: 0
        })
      ]
    });

    await expect(
      evaluateUserPracticeBadgeEligibility(store, {
        guildId: "guild_123",
        userId: "user_123",
        now
      })
    ).resolves.toEqual(["first-practice"]);
  });

  it("awards eligible badges for completed session attendees only", async () => {
    const { sessions, checkIns } = createAttendedSeries(3);
    const store = createStore({
      sessions,
      checkIns: [
        ...checkIns,
        buildCheckIn("session_3", {
          userId: "user_456",
          displayName: "Kai",
          attendanceStatus: "NOT_HERE",
          rewardXp: 0
        })
      ]
    });

    const summary = await awardPracticeBadgesForCompletedSession(store, {
      guildId: "guild_123",
      practiceId: "session_3",
      now
    });

    expect(summary.awarded).toBe(3);
    expect(store.awards.map((award) => award.badgeKey)).toEqual([
      "first-practice",
      "three-practice-streak",
      "perfect-week"
    ]);
    expect(store.awards.some((award) => award.userId === "user_456")).toBe(false);

    const secondSummary = await awardPracticeBadgesForCompletedSession(store, {
      guildId: "guild_123",
      practiceId: "session_3",
      now
    });

    expect(secondSummary.awarded).toBe(0);
    expect(secondSummary.alreadyAwarded).toBe(3);
  });

  it("backfills existing attendance history idempotently", async () => {
    const { sessions, checkIns } = createAttendedSeries(10);
    const store = createStore({
      sessions,
      checkIns
    });

    const summary = await backfillPracticeBadges(store, {
      guildId: "guild_123",
      now
    });
    const secondSummary = await backfillPracticeBadges(store, {
      guildId: "guild_123",
      now
    });

    expect(summary.awarded).toBe(5);
    expect(secondSummary.awarded).toBe(0);
    expect(secondSummary.alreadyAwarded).toBe(5);
  });

  it("lists only practice badges with definitions", async () => {
    const store = createStore({
      sessions: [],
      checkIns: [],
      definitions: [
        {
          id: "definition_1",
          badgeKey: "first-practice",
          title: "First Practice",
          description: "Attend your first practice.",
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id: "definition_2",
          badgeKey: "weekly-starter",
          title: "Weekly Starter",
          description: "Complete a weekly challenge.",
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        }
      ],
      awards: [
        {
          id: "award_1",
          guildId: "guild_123",
          userId: "user_123",
          badgeKey: "first-practice",
          awardedAt: now
        },
        {
          id: "award_2",
          guildId: "guild_123",
          userId: "user_123",
          badgeKey: "weekly-starter",
          awardedAt: now
        }
      ]
    });

    await expect(
      listUserPracticeBadges(store, {
        guildId: "guild_123",
        userId: "user_123"
      })
    ).resolves.toHaveLength(1);
  });
});
