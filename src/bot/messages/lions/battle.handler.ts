import {
  getLionBattleMvpLionId,
  resolveAutoLionTeamBattle
} from "../../../features/lions/lion-battle.service.js";
import {
  acceptLionBattleChallenge,
  awardBattleLionExperience,
  buildTrainingNpcLionTeam,
  cancelLionBattleChallenge,
  createLionBattleChallenge,
  declineLionBattleChallenge,
  findPendingLionBattleChallengeForOpponent,
  getOwnedLionDisplayName,
  getUserLionBattleCooldown,
  LION_BATTLE_LOSS_XP,
  LION_BATTLE_WIN_XP,
  LION_TRAINING_NPC_DISPLAY_NAME,
  LION_TRAINING_NPC_USER_ID,
  listUserLionTeam,
  markLionBattleChallengeResolved,
  recordLionBattle,
  type UserLionTeamSlotWithLionRecord,
  type UserLionWithSpeciesRecord
} from "../../../features/lions/lion-creature.service.js";
import { recordWeeklyChallengeProgressSafely } from "../../../features/challenges/weekly-challenge-hooks.js";
import {
  formatExistingLionBattleChallengeMessage,
  formatLionBattleChallengeAcceptedMessage,
  formatLionBattleChallengeCanceledMessage,
  formatLionBattleChallengeDeclinedMessage,
  formatLionBattleChallengeMessage,
  formatTeamBattleLionMessage
} from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommand } from "./parsing.js";
import type { LionMessageCommandHandler } from "./types.js";

const getBattleSubcommand = (
  normalizedCommand: LionMessageCommand,
  args: string[]
): "accept" | "decline" | null => {
  if (normalizedCommand === "~accept") {
    return "accept";
  }

  if (normalizedCommand === "~decline") {
    return "decline";
  }

  if (normalizedCommand !== "~battle") {
    return null;
  }

  const subcommand = args[0]?.toLowerCase();

  if (subcommand === "accept" || subcommand === "decline") {
    return subcommand;
  }

  return null;
};

const resolveAndRecordTeamBattle = async (input: {
  guildId: string;
  now: Date;
  firstUserId: string;
  firstDisplayName: string;
  firstTeam: UserLionTeamSlotWithLionRecord[];
  secondUserId: string;
  secondDisplayName: string;
  secondTeam: UserLionWithSpeciesRecord[] | UserLionTeamSlotWithLionRecord[];
  challengeId?: string | null;
}): Promise<string> => {
  const firstTeamLions = input.firstTeam.map((slot) => slot.lion);
  const secondTeamLions = input.secondTeam.map((entry) =>
    "lion" in entry ? entry.lion : entry
  );
  const battle = resolveAutoLionTeamBattle({
    firstTeam: firstTeamLions,
    secondTeam: secondTeamLions,
    random: Math.random
  });
  const lionById = new Map(
    [...firstTeamLions, ...secondTeamLions].map((lion) => [lion.id, lion])
  );
  const getRewardLions = (
    side: "first" | "second"
  ): UserLionWithSpeciesRecord[] =>
    battle.participantLionIds[side]
      .map((lionId) => lionById.get(lionId))
      .filter((lion): lion is UserLionWithSpeciesRecord => Boolean(lion))
      .filter((lion) => lion.userId !== LION_TRAINING_NPC_USER_ID);
  const winnerLions = getRewardLions(battle.winnerSide);
  const loserLions = getRewardLions(battle.loserSide);
  const [winnerRewards, loserRewards] = await Promise.all([
    Promise.all(
      winnerLions.map((lion) =>
        awardBattleLionExperience(prisma, {
          lion,
          gainedExperience: LION_BATTLE_WIN_XP,
          now: input.now
        })
      )
    ),
    Promise.all(
      loserLions.map((lion) =>
        awardBattleLionExperience(prisma, {
          lion,
          gainedExperience: LION_BATTLE_LOSS_XP,
          now: input.now
        })
      )
    )
  ]);
  const mvpLionId = getLionBattleMvpLionId(battle);
  const mvpLion = mvpLionId ? (lionById.get(mvpLionId) ?? null) : null;
  const winnerUserId =
    battle.winnerSide === "first" ? input.firstUserId : input.secondUserId;
  const loserUserId =
    battle.loserSide === "first" ? input.firstUserId : input.secondUserId;
  const winnerDisplayName =
    battle.winnerSide === "first"
      ? input.firstDisplayName
      : input.secondDisplayName;
  const loserDisplayName =
    battle.loserSide === "first"
      ? input.firstDisplayName
      : input.secondDisplayName;
  const battleRecord = await recordLionBattle(prisma, {
    guildId: input.guildId,
    challengerUserId: input.firstUserId,
    challengerDisplayName: input.firstDisplayName,
    opponentUserId: input.secondUserId,
    opponentDisplayName: input.secondDisplayName,
    winnerUserId,
    winnerDisplayName,
    loserUserId,
    loserDisplayName,
    winnerSide: battle.winnerSide,
    challengerTeamLionIds: firstTeamLions.map((lion) => lion.id),
    opponentTeamLionIds: secondTeamLions.map((lion) => lion.id),
    participantLionIds: [
      ...battle.participantLionIds.first,
      ...battle.participantLionIds.second
    ],
    mvpLionId,
    mvpLionName: mvpLion ? getOwnedLionDisplayName(mvpLion) : null,
    roundsCount: battle.rounds.length,
    createdAt: input.now
  });

  if (input.challengeId) {
    await markLionBattleChallengeResolved(prisma, {
      challengeId: input.challengeId,
      battleRecordId: battleRecord.id
    });
  }

  return formatTeamBattleLionMessage({
    battle,
    firstDisplayName: input.firstDisplayName,
    secondDisplayName: input.secondDisplayName,
    winnerRewards,
    loserRewards,
    mvpLion
  });
};

export const handleBattleLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand === "~accept" || normalizedCommand === "~decline") {
    return true;
  }

  if (normalizedCommand === "~cancelbattle") {
    const opponent = message.mentions.users.first();
    const result = await cancelLionBattleChallenge(prisma, {
      guildId,
      challengerUserId: message.author.id,
      opponentUserId: opponent?.id,
      now: message.createdAt
    });

    if (result.outcome !== "canceled" || !result.challenge) {
      await message.reply(
        "You do not have a pending lion battle challenge to cancel."
      );
      return true;
    }

    await message.reply(formatLionBattleChallengeCanceledMessage(result.challenge));
    return true;
  }

  if (normalizedCommand !== "~battle") {
    return false;
  }

  const battleSubcommand = getBattleSubcommand(normalizedCommand, args);

  if (battleSubcommand === "accept" || battleSubcommand === "decline") {
    const challenger = message.mentions.users.first();

    if (battleSubcommand === "accept") {
      const pendingChallenge = await findPendingLionBattleChallengeForOpponent(
        prisma,
        {
          guildId,
          opponentUserId: message.author.id,
          challengerUserId: challenger?.id,
          now: message.createdAt
        }
      );

      if (!pendingChallenge) {
        await message.reply("You do not have a pending lion battle challenge.");
        return true;
      }

      const [challengerTeam, opponentTeam] = await Promise.all([
        listUserLionTeam(prisma, {
          guildId,
          userId: pendingChallenge.challengerUserId
        }),
        listUserLionTeam(prisma, {
          guildId,
          userId: pendingChallenge.opponentUserId
        })
      ]);

      if (challengerTeam.length === 0 || opponentTeam.length === 0) {
        await message.reply(
          "That challenge cannot resolve because one trainer no longer has a valid battle team."
        );
        return true;
      }

      const battleCooldown = await getUserLionBattleCooldown(prisma, {
        guildId,
        challengerUserId: pendingChallenge.challengerUserId,
        opponentUserId: pendingChallenge.opponentUserId,
        now: message.createdAt
      });

      if (!battleCooldown.allowed && battleCooldown.cooldownEndsAt) {
        await message.reply(
          `One of these trainers battled recently. Try another team battle <t:${Math.floor(battleCooldown.cooldownEndsAt.getTime() / 1000)}:R>.`
        );
        return true;
      }

      const accepted = await acceptLionBattleChallenge(prisma, {
        guildId,
        opponentUserId: message.author.id,
        challengerUserId: pendingChallenge.challengerUserId,
        now: message.createdAt
      });

      if (accepted.outcome !== "accepted" || !accepted.challenge) {
        await message.reply("That lion battle challenge is no longer available.");
        return true;
      }

      const battleMessage = await resolveAndRecordTeamBattle({
        guildId,
        now: message.createdAt,
        firstUserId: accepted.challenge.challengerUserId,
        firstDisplayName: accepted.challenge.challengerDisplayName,
        firstTeam: challengerTeam,
        secondUserId: accepted.challenge.opponentUserId,
        secondDisplayName: accepted.challenge.opponentDisplayName,
        secondTeam: opponentTeam,
        challengeId: accepted.challenge.id
      });

      await message.reply(
        [
          formatLionBattleChallengeAcceptedMessage(accepted.challenge),
          battleMessage
        ].join("\n")
      );
      return true;
    }

    const result = await declineLionBattleChallenge(prisma, {
      guildId,
      opponentUserId: message.author.id,
      challengerUserId: challenger?.id,
      now: message.createdAt
    });

    if (result.outcome !== "declined" || !result.challenge) {
      await message.reply("You do not have a pending lion battle challenge.");
      return true;
    }

    await message.reply(formatLionBattleChallengeDeclinedMessage(result.challenge));
    return true;
  }

  if (args[0]?.toLowerCase() === "training") {
    const challengerTeam = await listUserLionTeam(prisma, {
      guildId,
      userId: message.author.id
    });

    if (challengerTeam.length === 0) {
      await message.reply(
        "You need a battle team first. Use `~team set <lion1> <lion2> <lion3>`."
      );
      return true;
    }

    const battleCooldown = await getUserLionBattleCooldown(prisma, {
      guildId,
      challengerUserId: message.author.id,
      opponentUserId: LION_TRAINING_NPC_USER_ID,
      now: message.createdAt
    });

    if (!battleCooldown.allowed && battleCooldown.cooldownEndsAt) {
      await message.reply(
        `Your team trained recently. Try another Training Hall battle <t:${Math.floor(battleCooldown.cooldownEndsAt.getTime() / 1000)}:R>.`
      );
      return true;
    }

    const npcTeam = await buildTrainingNpcLionTeam(prisma, {
      guildId,
      referenceTeam: challengerTeam.map((slot) => slot.lion),
      now: message.createdAt,
      random: Math.random
    });

    if (npcTeam.length === 0) {
      await message.reply("The Training Hall could not prepare a team right now.");
      return true;
    }

    const battleMessage = await resolveAndRecordTeamBattle({
      guildId,
      now: message.createdAt,
      firstUserId: message.author.id,
      firstDisplayName: getDisplayName(message),
      firstTeam: challengerTeam,
      secondUserId: LION_TRAINING_NPC_USER_ID,
      secondDisplayName: LION_TRAINING_NPC_DISPLAY_NAME,
      secondTeam: npcTeam
    });

    await recordWeeklyChallengeProgressSafely(prisma, {
      guildId,
      userId: message.author.id,
      displayName: getDisplayName(message),
      activityType: "TRAINING_HALL_BATTLE",
      occurredAt: message.createdAt
    });

    await message.reply(battleMessage);
    return true;
  }

  const opponent = message.mentions.users.first();

  if (!opponent || opponent.bot || opponent.id === message.author.id) {
    await message.reply(
      "Use `~battle @user` to challenge another team, or `~battle training` for a Training Hall battle."
    );
    return true;
  }

  const [challengerTeam, opponentTeam] = await Promise.all([
    listUserLionTeam(prisma, {
      guildId,
      userId: message.author.id
    }),
    listUserLionTeam(prisma, {
      guildId,
      userId: opponent.id
    })
  ]);

  if (challengerTeam.length === 0) {
    await message.reply(
      "You need a battle team first. Use `~team set <lion1> <lion2> <lion3>`."
    );
    return true;
  }

  if (opponentTeam.length === 0) {
    await message.reply(
      "That user does not have a battle team set yet. They can use `~team set <lion1> <lion2> <lion3>`."
    );
    return true;
  }

  const battleCooldown = await getUserLionBattleCooldown(prisma, {
    guildId,
    challengerUserId: message.author.id,
    opponentUserId: opponent.id,
    now: message.createdAt
  });

  if (!battleCooldown.allowed && battleCooldown.cooldownEndsAt) {
    await message.reply(
      `One of these trainers battled recently. Try another team battle <t:${Math.floor(battleCooldown.cooldownEndsAt.getTime() / 1000)}:R>.`
    );
    return true;
  }

  const secondDisplayName =
    message.mentions.members?.first()?.displayName ?? opponent.username;
  const challengeResult = await createLionBattleChallenge(prisma, {
    guildId,
    challengerUserId: message.author.id,
    challengerDisplayName: getDisplayName(message),
    opponentUserId: opponent.id,
    opponentDisplayName: secondDisplayName,
    channelId: message.channelId,
    now: message.createdAt
  });

  if (challengeResult.outcome === "existing_challenge") {
    await message.reply(
      formatExistingLionBattleChallengeMessage(
        challengeResult.existingChallenge!
      )
    );
    return true;
  }

  await message.reply(formatLionBattleChallengeMessage(challengeResult.challenge!));
  return true;
};
