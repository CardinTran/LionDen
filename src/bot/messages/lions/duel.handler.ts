import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction
} from "discord.js";

import {
  acceptLionDuelChallenge,
  applyLionDuelAction,
  cancelLionDuel,
  createLionDuelChallenge,
  declineLionDuelChallenge,
  type LionDuelAction,
  type LionDuelInteractionResult,
  type LionDuelState
} from "../../../features/lions/lion-duel.service.js";
import {
  getOwnedLionDisplayName,
  listUserLionTeam
} from "../../../features/lions/lion-creature.service.js";
import { formatDiscordTimestamp } from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

const LION_DUEL_CUSTOM_ID_PREFIX = "lionduel";

type DuelButtonAction =
  | "accept"
  | "decline"
  | "basic"
  | "special"
  | "guard"
  | "cancel";

const buildDuelCustomId = (duelId: string, action: DuelButtonAction): string =>
  `${LION_DUEL_CUSTOM_ID_PREFIX}:${duelId}:${action}`;

const parseDuelCustomId = (
  customId: string
): { duelId: string; action: DuelButtonAction } | null => {
  const [prefix, duelId, action] = customId.split(":");

  if (
    prefix !== LION_DUEL_CUSTOM_ID_PREFIX ||
    !duelId ||
    !action ||
    !["accept", "decline", "basic", "special", "guard", "cancel"].includes(
      action
    )
  ) {
    return null;
  }

  return {
    duelId,
    action: action as DuelButtonAction
  };
};

const getParticipantLine = (
  participant: LionDuelState["challenger"] | LionDuelState["opponent"]
): string =>
  `${participant.displayName}: ${getOwnedLionDisplayName(participant.lion)} HP ${participant.hp}/${participant.maxHp}${participant.guarding ? " [guarding]" : ""}`;

const getTurnDisplayName = (duel: LionDuelState): string => {
  if (!duel.turnUserId) {
    return "No active turn";
  }

  return duel.turnUserId === duel.challenger.userId
    ? duel.challenger.displayName
    : duel.opponent.displayName;
};

export const formatLionDuelMessage = (duel: LionDuelState): string => {
  const statusLine =
    duel.status === "PENDING"
      ? `Pending acceptance from ${duel.opponent.displayName}. Expires ${formatDiscordTimestamp(duel.expiresAt)}.`
      : duel.status === "ACTIVE"
        ? `Turn ${duel.round}: ${getTurnDisplayName(duel)} to act. Timeout ${formatDiscordTimestamp(duel.expiresAt)}.`
        : duel.status === "ENDED"
          ? `${duel.winnerUserId === duel.challenger.userId ? duel.challenger.displayName : duel.opponent.displayName} won.`
          : "Duel canceled.";
  const history = duel.log.slice(-5);

  return [
    "LionDen 1v1 duel prototype",
    statusLine,
    getParticipantLine(duel.challenger),
    getParticipantLine(duel.opponent),
    "",
    "Recent turns:",
    ...history.map((entry) => `- ${entry}`),
    "",
    "Prototype note: duels do not affect automatic team battle history or stats yet."
  ].join("\n");
};

export const buildLionDuelChallengeComponents = (
  duelId: string
): ActionRowBuilder<ButtonBuilder>[] => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildDuelCustomId(duelId, "accept"))
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildDuelCustomId(duelId, "decline"))
      .setLabel("Decline")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildDuelCustomId(duelId, "cancel"))
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
  )
];

export const buildLionDuelActionComponents = (
  duel: LionDuelState
): ActionRowBuilder<ButtonBuilder>[] => {
  if (duel.status !== "ACTIVE") {
    return [];
  }

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildDuelCustomId(duel.id, "basic"))
        .setLabel("Pounce")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buildDuelCustomId(duel.id, "special"))
        .setLabel("Signature")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buildDuelCustomId(duel.id, "guard"))
        .setLabel("Guard")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(buildDuelCustomId(duel.id, "cancel"))
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    )
  ];
};

export const isLionDuelButtonCustomId = (customId: string): boolean =>
  customId.startsWith(`${LION_DUEL_CUSTOM_ID_PREFIX}:`);

const getDuelComponents = (
  duel: LionDuelState
): ActionRowBuilder<ButtonBuilder>[] => {
  if (duel.status === "PENDING") {
    return buildLionDuelChallengeComponents(duel.id);
  }

  return buildLionDuelActionComponents(duel);
};

const replyEphemeral = async (
  interaction: ButtonInteraction,
  content: string
): Promise<void> => {
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({
      content,
      ephemeral: true
    });
    return;
  }

  await interaction.reply({
    content,
    ephemeral: true
  });
};

const updateDuelInteraction = async (
  interaction: ButtonInteraction,
  duel: LionDuelState
): Promise<void> => {
  await interaction.update({
    content: formatLionDuelMessage(duel),
    components: getDuelComponents(duel)
  });
};

const handleDuelResult = async (
  interaction: ButtonInteraction,
  result: LionDuelInteractionResult
): Promise<void> => {
  if (!result.duel) {
    await replyEphemeral(interaction, "That duel is no longer active.");
    return;
  }

  if (
    result.outcome === "not_opponent" ||
    result.outcome === "not_participant"
  ) {
    await replyEphemeral(interaction, "That duel button is not for you.");
    return;
  }

  if (result.outcome === "not_turn") {
    await replyEphemeral(interaction, "It is not your turn in this duel.");
    return;
  }

  if (result.outcome === "not_pending" || result.outcome === "not_active") {
    await replyEphemeral(interaction, "That duel is not in the right state.");
    return;
  }

  await updateDuelInteraction(interaction, result.duel);
};

export const handleLionDuelButton = async (
  interaction: ButtonInteraction
): Promise<boolean> => {
  const parsed = parseDuelCustomId(interaction.customId);

  if (!parsed) {
    return false;
  }

  if (!interaction.guildId) {
    await replyEphemeral(
      interaction,
      "Lion duels can only be used in a server."
    );
    return true;
  }

  const now = new Date();

  if (parsed.action === "accept") {
    await handleDuelResult(
      interaction,
      acceptLionDuelChallenge({
        duelId: parsed.duelId,
        userId: interaction.user.id,
        now
      })
    );
    return true;
  }

  if (parsed.action === "decline") {
    await handleDuelResult(
      interaction,
      declineLionDuelChallenge({
        duelId: parsed.duelId,
        userId: interaction.user.id,
        now
      })
    );
    return true;
  }

  if (parsed.action === "cancel") {
    await handleDuelResult(
      interaction,
      cancelLionDuel({
        duelId: parsed.duelId,
        userId: interaction.user.id,
        now
      })
    );
    return true;
  }

  const action: LionDuelAction = parsed.action;

  await handleDuelResult(
    interaction,
    applyLionDuelAction({
      duelId: parsed.duelId,
      userId: interaction.user.id,
      action,
      now
    })
  );
  return true;
};

export const handleDuelLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand
}) => {
  if (normalizedCommand !== "~duel") {
    return false;
  }

  const opponent = message.mentions.users.first();

  if (!opponent || opponent.bot || opponent.id === message.author.id) {
    await message.reply(
      "Use `~duel @user` to start a 1v1 lion duel prototype."
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
  const challengerLead = challengerTeam[0]?.lion;
  const opponentLead = opponentTeam[0]?.lion;

  if (!challengerLead) {
    await message.reply(
      "You need a lead battle team lion first. Use `~team set <lion1>`."
    );
    return true;
  }

  if (!opponentLead) {
    await message.reply(
      "That user needs a lead battle team lion first. They can use `~team set <lion1>`."
    );
    return true;
  }

  const opponentDisplayName =
    message.mentions.members?.first()?.displayName ?? opponent.username;
  const result = createLionDuelChallenge({
    guildId,
    channelId: message.channelId,
    challengerUserId: message.author.id,
    challengerDisplayName: getDisplayName(message),
    challengerLion: challengerLead,
    opponentUserId: opponent.id,
    opponentDisplayName,
    opponentLion: opponentLead,
    now: message.createdAt
  });

  if (result.outcome === "active_duel_exists") {
    await message.reply(
      `One of these trainers already has an active duel. Try again after it finishes or times out ${formatDiscordTimestamp(result.duel.expiresAt)}.`
    );
    return true;
  }

  await message.reply({
    content: formatLionDuelMessage(result.duel),
    components: buildLionDuelChallengeComponents(result.duel.id)
  });
  return true;
};
