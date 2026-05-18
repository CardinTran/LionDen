import type { Message } from "discord.js";

import { prisma } from "../../lib/prisma.js";
import {
  getLionBattleMvpLionId,
  resolveAutoLionTeamBattle
} from "../../features/lions/lion-battle.service.js";
import {
  acceptLionBattleChallenge,
  activateLionChannelEffect,
  awardBattleLionExperience,
  attemptCatchWildLion,
  buildTrainingNpcLionTeam,
  cancelLionBattleChallenge,
  clearUserLionTeam,
  createLionBattleChallenge,
  declineLionBattleChallenge,
  findUserLionFromList,
  findPendingLionBattleChallengeForOpponent,
  getLionTrainerBattleStats,
  LION_BATTLE_LOSS_XP,
  LION_BATTLE_WIN_XP,
  LION_TRAINING_NPC_DISPLAY_NAME,
  LION_TRAINING_NPC_USER_ID,
  listLionShopItems,
  listTopOwnedLions,
  listTopLionBattleTrainers,
  listRecentLionBattles,
  listRecentNotableLionCatches,
  listUserItemInventory,
  listUserLionTeam,
  listUserLions,
  listActiveWildLionSpawns,
  getOwnedLionDisplayName,
  getUserLionBattleCooldown,
  HIGH_LEVEL_WILD_LION_THRESHOLD,
  normalizeLionItemKey,
  purchaseLionShopItem,
  recordLionBattle,
  markLionBattleChallengeResolved,
  setUserLionNickname,
  setUserLionTeam,
  syncDefaultLionData,
  trainUserLion,
  useLionTrainingItem,
  type UserLionTeamSlotWithLionRecord,
  type UserLionWithSpeciesRecord
} from "../../features/lions/lion-creature.service.js";
import {
  formatClearUserLionTeamMessage,
  formatExistingLionBattleChallengeMessage,
  formatLionBattleBoardMessage,
  formatLionBattleChallengeAcceptedMessage,
  formatLionBattleChallengeCanceledMessage,
  formatLionBattleChallengeDeclinedMessage,
  formatLionBattleChallengeMessage,
  formatLionHelpMessage,
  formatLionBattleHistoryMessage,
  formatLionInventoryMessage,
  formatLionShopMessage,
  formatOwnedLionMessage,
  formatRecentNotableLionCatchesMessage,
  formatSetUserLionNicknameMessage,
  formatSetUserLionTeamMessage,
  formatTeamBattleLionMessage,
  formatLionTrainerBattleStatsMessage,
  formatTopLionsMessage,
  formatTrainLionMessage,
  formatUseLionTrainingItemMessage,
  formatUserLionTeamMessage,
  formatUserLionsMessage,
  formatWildLionStatusMessage
} from "../../features/lions/lion-formatting.js";

let lionDataSynced = false;

const ensureLionData = async (): Promise<void> => {
  if (lionDataSynced) {
    return;
  }

  await syncDefaultLionData(prisma);
  lionDataSynced = true;
};

const getDisplayName = (message: Message): string =>
  message.member?.displayName ?? message.author.username;

const parseItemAndQuantity = (
  args: string[]
): {
  itemKey: string;
  quantity: number;
} => {
  const possibleQuantity = Number(args.at(-1));

  if (Number.isInteger(possibleQuantity) && possibleQuantity > 0) {
    return {
      itemKey: normalizeLionItemKey(args.slice(0, -1).join(" ")),
      quantity: possibleQuantity
    };
  }

  return {
    itemKey: normalizeLionItemKey(args.join(" ")),
    quantity: 1
  };
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

export const handleLionCreatureMessage = async (
  message: Message
): Promise<boolean> => {
  const content = message.content.trim();

  if (!content.startsWith("~")) {
    return false;
  }

  const [command, ...args] = content.split(/\s+/);
  const normalizedCommand = command.toLowerCase();

  if (
    ![
      "~help",
      "~shop",
      "~buy",
      "~bag",
      "~use",
      "~catch",
      "~train",
      "~nickname",
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
    ].includes(normalizedCommand)
  ) {
    return false;
  }

  if (!message.guildId) {
    return true;
  }

  await ensureLionData();

  if (normalizedCommand === "~help") {
    await message.reply(formatLionHelpMessage());
    return true;
  }

  if (normalizedCommand === "~shop") {
    const items = await listLionShopItems(prisma);
    await message.reply(formatLionShopMessage(items));
    return true;
  }

  if (normalizedCommand === "~buy") {
    if (args.length === 0) {
      await message.reply(
        "Use `~buy <item> [quantity]`, for example `~buy basic-ball 3`."
      );
      return true;
    }

    const purchase = parseItemAndQuantity(args);
    const result = await purchaseLionShopItem(prisma, {
      guildId: message.guildId,
      userId: message.author.id,
      displayName: getDisplayName(message),
      itemKey: purchase.itemKey,
      quantity: purchase.quantity
    });

    if (result.outcome === "item_not_found" || !result.item) {
      await message.reply(
        "That lion shop item does not exist. Use `~shop` to see items."
      );
      return true;
    }

    if (result.outcome === "insufficient_coins") {
      await message.reply(
        `${result.item.name} costs ${result.item.priceCoins * purchase.quantity} coins. You have ${result.profile.coins}.`
      );
      return true;
    }

    await message.reply(
      `Bought ${purchase.quantity} ${result.item.name} for ${result.item.priceCoins * purchase.quantity} coins. You now have ${result.profile.coins} coins.`
    );
    return true;
  }

  if (normalizedCommand === "~bag") {
    const inventory = await listUserItemInventory(prisma, {
      guildId: message.guildId,
      userId: message.author.id
    });
    await message.reply(formatLionInventoryMessage({ inventory }));
    return true;
  }

  if (normalizedCommand === "~use") {
    if (args.length === 0) {
      await message.reply(
        "Use `~use <item>` to activate a lion item in this channel."
      );
      return true;
    }

    const itemKey = normalizeLionItemKey(args[0] ?? "");
    const items = await listLionShopItems(prisma);
    const item = items.find((entry) => entry.itemKey === itemKey) ?? null;

    if (!item) {
      await message.reply(
        "That item does not exist. Use `~shop` to see items."
      );
      return true;
    }

    if (item.category === "BALL") {
      await message.reply(
        `${item.name} is a catching ball, so it is used with \`~catch ${item.itemKey}\` instead.`
      );
      return true;
    }

    if (item.effectType === "TRAINING_XP") {
      const lionQuery = args.slice(1).join(" ");

      if (!lionQuery) {
        await message.reply(
          `Use \`~use ${item.itemKey} <lion>\` to give that item to one of your lions.`
        );
        return true;
      }

      const result = await useLionTrainingItem(prisma, {
        guildId: message.guildId,
        userId: message.author.id,
        itemKey,
        lionQuery
      });

      await message.reply(formatUseLionTrainingItemMessage({ result }));
      return true;
    }

    if (!message.channel.isTextBased() || !("send" in message.channel)) {
      await message.reply(
        "That item can only be used in a server text channel."
      );
      return true;
    }

    if (
      item.effectType !== "SPAWN_BOOST" &&
      item.effectType !== "RARITY_BOOST" &&
      item.effectType !== "LEVEL_BOOST"
    ) {
      await message.reply(
        `${item.name} does not have an active-use effect yet.`
      );
      return true;
    }

    const effect = await activateLionChannelEffect(prisma, {
      guildId: message.guildId,
      channelId: message.channelId,
      userId: message.author.id,
      itemKey,
      effectType: item.effectType,
      effectValue: item.effectValue,
      durationMinutes: item.effectType === "SPAWN_BOOST" ? 30 : 45,
      now: message.createdAt
    });

    if (effect.outcome === "no_item") {
      await message.reply(`You do not have any \`${item.itemKey}\` to use.`);
      return true;
    }

    if (effect.outcome === "already_active") {
      await message.reply(
        `${item.name} is already active in this channel until ${effect.activeEffect?.expiresAt ? `<t:${Math.floor(effect.activeEffect.expiresAt.getTime() / 1000)}:R>` : "later"}.`
      );
      return true;
    }

    await message.reply(
      `${getDisplayName(message)} activated ${item.name} in this channel until ${effect.effect?.expiresAt ? `<t:${Math.floor(effect.effect.expiresAt.getTime() / 1000)}:R>` : "later"}.`
    );
    return true;
  }

  if (normalizedCommand === "~catch") {
    const itemKey = normalizeLionItemKey(args.join(" ") || "basic-ball");
    const result = await attemptCatchWildLion(prisma, {
      guildId: message.guildId,
      channelId: message.channelId,
      userId: message.author.id,
      displayName: getDisplayName(message),
      itemKey,
      now: message.createdAt,
      random: Math.random
    });

    if (result.outcome === "no_spawn") {
      await message.reply("There is no active wild lion in this channel.");
      return true;
    }

    if (result.outcome === "spawn_expired") {
      await message.reply("That wild lion already left.");
      return true;
    }

    if (result.outcome === "item_not_found") {
      await message.reply(
        "That catching item does not exist. Use `~shop` to see items."
      );
      return true;
    }

    if (result.outcome === "not_a_ball") {
      await message.reply(
        `${result.item?.name ?? "That item"} cannot be used to catch lions yet.`
      );
      return true;
    }

    if (result.outcome === "no_item") {
      await message.reply(
        `You do not have any \`${itemKey}\`. Use \`~shop\` and \`~buy\` first.`
      );
      return true;
    }

    if (result.outcome === "missed") {
      await message.reply(
        `${result.item?.name ?? "The ball"} failed. ${result.spawn?.species.name ?? "The wild lion"} is still here.`
      );
      return true;
    }

    if (result.outcome === "already_caught") {
      await message.reply("That wild lion was already caught.");
      return true;
    }

    const notableCatch =
      (result.ownedLion?.level ?? result.spawn?.level ?? 1) >=
        HIGH_LEVEL_WILD_LION_THRESHOLD ||
      ["RARE", "EPIC", "LEGENDARY"].includes(
        result.ownedLion?.species.rarity ?? result.spawn?.species.rarity ?? ""
      );
    const catchPrefix = notableCatch ? "Notable catch! " : "";

    await message.reply(
      `${catchPrefix}${getDisplayName(message)} caught Lv. ${result.ownedLion?.level ?? result.spawn?.level ?? 1} ${result.ownedLion ? getOwnedLionDisplayName(result.ownedLion) : (result.spawn?.species.name ?? "a wild lion")} ${result.ownedLion?.species.publicId ? `\`${result.ownedLion.species.publicId}\`` : ""} with ${result.item?.name ?? "a ball"}.`
    );
    return true;
  }

  if (normalizedCommand === "~train") {
    if (args.length === 0) {
      await message.reply(
        "Use `~train <lion id or code>`, for example `~train L001`."
      );
      return true;
    }

    const result = await trainUserLion(prisma, {
      guildId: message.guildId,
      userId: message.author.id,
      query: args.join(" "),
      now: message.createdAt
    });

    await message.reply(formatTrainLionMessage({ result }));
    return true;
  }

  if (normalizedCommand === "~nickname") {
    if (args.length < 2) {
      await message.reply(
        "Use `~nickname <lion id or code> <name>`. Use `clear` as the name to remove a nickname."
      );
      return true;
    }

    const nicknameInput = args.slice(1).join(" ");
    const result = await setUserLionNickname(prisma, {
      guildId: message.guildId,
      userId: message.author.id,
      query: args[0] ?? "",
      nickname: nicknameInput.toLowerCase() === "clear" ? "" : nicknameInput
    });

    await message.reply(formatSetUserLionNicknameMessage(result));
    return true;
  }

  if (normalizedCommand === "~team") {
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      const team = await listUserLionTeam(prisma, {
        guildId: message.guildId,
        userId: message.author.id
      });

      await message.reply(
        formatUserLionTeamMessage({
          team,
          displayName: getDisplayName(message)
        })
      );
      return true;
    }

    if (subcommand === "clear") {
      const clearedCount = await clearUserLionTeam(prisma, {
        guildId: message.guildId,
        userId: message.author.id
      });

      await message.reply(formatClearUserLionTeamMessage(clearedCount));
      return true;
    }

    if (subcommand === "set") {
      const result = await setUserLionTeam(prisma, {
        guildId: message.guildId,
        userId: message.author.id,
        queries: args.slice(1)
      });

      await message.reply(formatSetUserLionTeamMessage(result));
      return true;
    }

    await message.reply(
      "Use `~team`, `~team set <lion1> <lion2> <lion3>`, or `~team clear`."
    );
    return true;
  }

  if (normalizedCommand === "~battle") {
    if (args[0]?.toLowerCase() === "training") {
      const challengerTeam = await listUserLionTeam(prisma, {
        guildId: message.guildId,
        userId: message.author.id
      });

      if (challengerTeam.length === 0) {
        await message.reply(
          "You need a battle team first. Use `~team set <lion1> <lion2> <lion3>`."
        );
        return true;
      }

      const battleCooldown = await getUserLionBattleCooldown(prisma, {
        guildId: message.guildId,
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
        guildId: message.guildId,
        referenceTeam: challengerTeam.map((slot) => slot.lion),
        now: message.createdAt,
        random: Math.random
      });

      if (npcTeam.length === 0) {
        await message.reply(
          "The Training Hall could not prepare a team right now."
        );
        return true;
      }

      await message.reply(
        await resolveAndRecordTeamBattle({
          guildId: message.guildId,
          now: message.createdAt,
          firstUserId: message.author.id,
          firstDisplayName: getDisplayName(message),
          firstTeam: challengerTeam,
          secondUserId: LION_TRAINING_NPC_USER_ID,
          secondDisplayName: LION_TRAINING_NPC_DISPLAY_NAME,
          secondTeam: npcTeam
        })
      );
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
        guildId: message.guildId,
        userId: message.author.id
      }),
      listUserLionTeam(prisma, {
        guildId: message.guildId,
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
      guildId: message.guildId,
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
      guildId: message.guildId,
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

    await message.reply(
      formatLionBattleChallengeMessage(challengeResult.challenge!)
    );
    return true;
  }

  if (normalizedCommand === "~accept") {
    const challenger = message.mentions.users.first();
    const pendingChallenge = await findPendingLionBattleChallengeForOpponent(
      prisma,
      {
        guildId: message.guildId,
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
        guildId: message.guildId,
        userId: pendingChallenge.challengerUserId
      }),
      listUserLionTeam(prisma, {
        guildId: message.guildId,
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
      guildId: message.guildId,
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
      guildId: message.guildId,
      opponentUserId: message.author.id,
      challengerUserId: pendingChallenge.challengerUserId,
      now: message.createdAt
    });

    if (accepted.outcome !== "accepted" || !accepted.challenge) {
      await message.reply("That lion battle challenge is no longer available.");
      return true;
    }

    const battleMessage = await resolveAndRecordTeamBattle({
      guildId: message.guildId,
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

  if (normalizedCommand === "~decline") {
    const challenger = message.mentions.users.first();
    const result = await declineLionBattleChallenge(prisma, {
      guildId: message.guildId,
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

  if (normalizedCommand === "~cancelbattle") {
    const opponent = message.mentions.users.first();
    const result = await cancelLionBattleChallenge(prisma, {
      guildId: message.guildId,
      challengerUserId: message.author.id,
      opponentUserId: opponent?.id,
      now: message.createdAt
    });

    if (result.outcome !== "canceled" || !result.challenge) {
      await message.reply("You do not have a pending lion battle challenge to cancel.");
      return true;
    }

    await message.reply(formatLionBattleChallengeCanceledMessage(result.challenge));
    return true;
  }

  if (normalizedCommand === "~battlehistory") {
    const target = message.mentions.users.first();
    const battles = await listRecentLionBattles(prisma, {
      guildId: message.guildId,
      userId: target?.id,
      limit: 5
    });

    await message.reply(
      formatLionBattleHistoryMessage({
        battles,
        displayName: target
          ? (message.mentions.members?.first()?.displayName ?? target.username)
          : undefined
      })
    );
    return true;
  }

  if (normalizedCommand === "~battlestats") {
    const target = message.mentions.users.first() ?? message.author;
    const displayName =
      target.id === message.author.id
        ? getDisplayName(message)
        : (message.mentions.members?.first()?.displayName ?? target.username);
    const stats = await getLionTrainerBattleStats(prisma, {
      guildId: message.guildId,
      userId: target.id
    });

    await message.reply(
      formatLionTrainerBattleStatsMessage({
        stats: {
          ...stats,
          displayName
        },
        displayName
      })
    );
    return true;
  }

  if (normalizedCommand === "~battleboard") {
    const entries = await listTopLionBattleTrainers(prisma, {
      guildId: message.guildId,
      limit: 10
    });

    await message.reply(formatLionBattleBoardMessage({ entries }));
    return true;
  }

  if (normalizedCommand === "~lions") {
    const [lions, team] = await Promise.all([
      listUserLions(prisma, {
        guildId: message.guildId,
        userId: message.author.id,
        limit: 20
      }),
      listUserLionTeam(prisma, {
        guildId: message.guildId,
        userId: message.author.id
      })
    ]);

    await message.reply(
      formatUserLionsMessage({
        lions,
        displayName: getDisplayName(message),
        team
      })
    );
    return true;
  }

  if (normalizedCommand === "~toplions" || normalizedCommand === "~lionboard") {
    const entries = await listTopOwnedLions(prisma, {
      guildId: message.guildId,
      limit: 10
    });

    await message.reply(formatTopLionsMessage({ entries }));
    return true;
  }

  if (normalizedCommand === "~rarecatches") {
    const entries = await listRecentNotableLionCatches(prisma, {
      guildId: message.guildId,
      limit: 10
    });

    await message.reply(formatRecentNotableLionCatchesMessage({ entries }));
    return true;
  }

  if (normalizedCommand === "~lion") {
    if (args.length === 0) {
      await message.reply(
        "Use `~lion <id or name>` to inspect one of your lions."
      );
      return true;
    }

    const lions = await listUserLions(prisma, {
      guildId: message.guildId,
      userId: message.author.id,
      limit: 100
    });
    const lion = findUserLionFromList(lions, args.join(" "));

    if (!lion) {
      await message.reply("I could not find that lion in your roster.");
      return true;
    }

    await message.reply(formatOwnedLionMessage(lion, getDisplayName(message)));
    return true;
  }

  if (normalizedCommand === "~wild") {
    const spawns = await listActiveWildLionSpawns(prisma, {
      guildId: message.guildId,
      now: message.createdAt
    });
    await message.reply(formatWildLionStatusMessage(spawns));
    return true;
  }

  return false;
};
