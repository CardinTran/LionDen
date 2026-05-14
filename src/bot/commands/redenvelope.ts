import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  type ButtonInteraction,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import {
  attachRedEnvelopeMessage,
  claimRedEnvelope,
  createRedEnvelope,
  type RedEnvelopeRecord
} from "../../features/economy/red-envelope.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./ping.js";

const RED_ENVELOPE_PREFIX = "redenvelope:claim:";

export const buildRedEnvelopeCustomId = (envelopeId: string): string =>
  `${RED_ENVELOPE_PREFIX}${envelopeId}`;

export const buildRedEnvelopeComponents = (
  envelopeId: string,
  disabled = false
): ActionRowBuilder<ButtonBuilder>[] => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildRedEnvelopeCustomId(envelopeId))
      .setLabel(disabled ? "Claimed" : "Claim Red Envelope")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  )
];

export const formatRedEnvelopeMessage = (input: {
  createdByDisplayName: string;
  amount: number;
}): string =>
  [
    "A LionDen red envelope has appeared.",
    `Created by ${input.createdByDisplayName}.`,
    `First claim gets ${input.amount} coins.`
  ].join("\n");

export const formatRedEnvelopeClaimedMessage = (input: {
  envelope: RedEnvelopeRecord;
}): string =>
  [
    "A LionDen red envelope has been claimed.",
    `Created by ${input.envelope.createdByDisplayName}.`,
    `${input.envelope.claimedByDisplayName ?? "A member"} claimed ${input.envelope.amount} coins.`
  ].join("\n");

const requireManageGuild = async (
  interaction: ChatInputCommandInteraction
): Promise<boolean> => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "You do not have permission to create LionDen red envelopes.",
      ephemeral: true
    });
    return false;
  }

  return true;
};

export const redEnvelopeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("redenvelope")
    .setDescription("Create a LionDen red envelope for the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a red envelope in this channel.")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("How many coins the first claimant receives.")
            .setMinValue(1)
            .setRequired(true)
        )
    ) as SlashCommandBuilder,
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        ephemeral: true
      });
      return;
    }

    if (!(await requireManageGuild(interaction))) {
      return;
    }

    const channel = interaction.channel;

    if (
      !channel ||
      !channel.isTextBased() ||
      channel.type === ChannelType.DM ||
      !("send" in channel)
    ) {
      await interaction.reply({
        content:
          "Red envelopes must be created from a server text channel where LionDen can post messages.",
        ephemeral: true
      });
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    const envelope = await createRedEnvelope(prisma, {
      guildId,
      channelId: channel.id,
      createdByUserId: interaction.user.id,
      createdByDisplayName: interaction.user.username,
      amount
    });

    const message = await channel.send({
      content: formatRedEnvelopeMessage({
        createdByDisplayName: interaction.user.username,
        amount
      }),
      components: buildRedEnvelopeComponents(envelope.id)
    });

    await attachRedEnvelopeMessage(prisma, {
      envelopeId: envelope.id,
      messageId: message.id
    });

    await interaction.reply({
      content: `Red envelope created in <#${channel.id}> for ${amount} coins.`,
      ephemeral: true
    });
  }
};

export const handleRedEnvelopeButton = async (
  interaction: ButtonInteraction
): Promise<void> => {
  const guildId = interaction.guildId;
  const envelopeId = interaction.customId.slice(RED_ENVELOPE_PREFIX.length);

  if (!guildId || !envelopeId) {
    await interaction.reply({
      content: "This red envelope is no longer valid.",
      ephemeral: true
    });
    return;
  }

  const result = await claimRedEnvelope(prisma, {
    envelopeId,
    userId: interaction.user.id,
    displayName: interaction.user.username,
    claimedAt: new Date()
  });

  if (result.outcome === "not_found" || !result.envelope) {
    await interaction.reply({
      content: "This red envelope is no longer available.",
      ephemeral: true
    });
    return;
  }

  if (result.outcome === "already_claimed") {
    await interaction.reply({
      content: `${result.envelope.claimedByDisplayName ?? "Another member"} already claimed this red envelope.`,
      ephemeral: true
    });
    return;
  }

  await interaction.update({
    content: formatRedEnvelopeClaimedMessage({
      envelope: result.envelope
    }),
    components: buildRedEnvelopeComponents(result.envelope.id, true)
  });

  await interaction.followUp({
    content: `You claimed ${result.envelope.amount} coins and now have ${result.profile?.coins ?? result.envelope.amount} total coins.`,
    ephemeral: true
  });
};

export const isRedEnvelopeButtonCustomId = (customId: string): boolean =>
  customId.startsWith(RED_ENVELOPE_PREFIX);

export const redEnvelopeCommandJson =
  redEnvelopeCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
