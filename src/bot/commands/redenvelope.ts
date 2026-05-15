import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import {
  attachRedEnvelopeMessage,
  clearOpenRedEnvelopesForGuild,
  configureRedEnvelopeDrops,
  createRedEnvelope,
  generateRandomDrop,
  getRedEnvelopeDropConfig,
  getOpenRedEnvelopeForGuild,
  isRedEnvelopeExpired,
  RED_ENVELOPE_EXPIRY_MINUTES,
  setRedEnvelopeDropConfigEnabled,
  type ClaimRedEnvelopeResult,
  type RedEnvelopeRecord
} from "../../features/economy/red-envelope.service.js";
import { postConfiguredRedEnvelopeDrop } from "../../features/economy/red-envelope-scheduler.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./ping.js";

export const RED_ENVELOPE_GRAB_COMMAND = "~grab";

export const formatRedEnvelopeMessage = (input: {
  createdByDisplayName: string;
  amount: number;
}): string =>
  [
    "A LionDen red envelope has appeared.",
    `Created by ${input.createdByDisplayName}.`,
    `First claim gets ${input.amount} coins.`,
    `Type ${RED_ENVELOPE_GRAB_COMMAND} in this channel to claim it.`
  ].join("\n");

export const formatRedEnvelopeClaimedMessage = (input: {
  envelope: RedEnvelopeRecord;
}): string =>
  [
    "A LionDen red envelope has been claimed.",
    `Created by ${input.envelope.createdByDisplayName}.`,
    `${input.envelope.claimedByDisplayName ?? "A member"} claimed ${input.envelope.amount} coins.`
  ].join("\n");

export const formatRedEnvelopeClaimSuccessMessage = (input: {
  result: ClaimRedEnvelopeResult;
}): string =>
  `${input.result.envelope?.claimedByDisplayName ?? "A member"} grabbed the red envelope and won ${input.result.envelope?.amount ?? 0} coins.`;

export const formatRedEnvelopeAlreadyClaimedMessage = (input: {
  envelope: RedEnvelopeRecord;
}): string =>
  `${input.envelope.claimedByDisplayName ?? "Another member"} already grabbed this red envelope.`;

const formatRedEnvelopeStatusMessage = (input: {
  now: Date;
  config: Awaited<ReturnType<typeof getRedEnvelopeDropConfig>>;
  openEnvelope: RedEnvelopeRecord | null;
}): string => {
  const lines = ["LionDen red envelope status"];

  if (!input.config) {
    lines.push("Automation: not configured");
  } else {
    lines.push(`Automation: ${input.config.enabled ? "enabled" : "paused"}`);
    lines.push(`Fallback channel: <#${input.config.channelId}>`);
    lines.push(
      `Amount range: ${Math.min(input.config.minAmount, input.config.maxAmount)}-${Math.max(input.config.minAmount, input.config.maxAmount)} coins`
    );
    lines.push(
      `Interval range: ${Math.min(input.config.minIntervalMinutes, input.config.maxIntervalMinutes)}-${Math.max(input.config.minIntervalMinutes, input.config.maxIntervalMinutes)} minutes`
    );
    lines.push(
      `Next drop: ${input.config.nextDropAt ? input.config.nextDropAt.toISOString() : "not scheduled"}`
    );
  }

  if (!input.openEnvelope) {
    lines.push("Open envelope: none");
  } else {
    const ageMinutes = Math.floor(
      (input.now.getTime() - input.openEnvelope.createdAt.getTime()) / 60_000
    );
    lines.push(`Open envelope: <#${input.openEnvelope.channelId}>`);
    lines.push(`Open amount: ${input.openEnvelope.amount} coins`);
    lines.push(`Open age: ${ageMinutes} minutes`);
    lines.push(
      `Expiry window: ${RED_ENVELOPE_EXPIRY_MINUTES} minutes (${isRedEnvelopeExpired(input.openEnvelope, input.now) ? "expired" : "active"})`
    );
  }

  return lines.join("\n");
};

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
        .setName("configure")
        .setDescription("Configure random red envelope drops for this server.")
        .addIntegerOption((option) =>
          option
            .setName("min_amount")
            .setDescription("Minimum random drop amount.")
            .setMinValue(1)
        )
        .addIntegerOption((option) =>
          option
            .setName("max_amount")
            .setDescription("Maximum random drop amount.")
            .setMinValue(1)
        )
        .addIntegerOption((option) =>
          option
            .setName("min_interval_minutes")
            .setDescription("Minimum minutes until the next random drop.")
            .setMinValue(1)
        )
        .addIntegerOption((option) =>
          option
            .setName("max_interval_minutes")
            .setDescription("Maximum minutes until the next random drop.")
            .setMinValue(1)
        )
    )
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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pause")
        .setDescription("Pause automated random red envelope drops.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("dropnow")
        .setDescription("Force one immediate configured random red envelope drop.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clearopen")
        .setDescription("Clear stale open red envelopes for this server.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Show the current red envelope automation and open-envelope state.")
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

    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "configure") {
      const minAmount = interaction.options.getInteger("min_amount") ?? 10;
      const maxAmount = interaction.options.getInteger("max_amount") ?? 50;
      const minIntervalMinutes =
        interaction.options.getInteger("min_interval_minutes") ?? 60;
      const maxIntervalMinutes =
        interaction.options.getInteger("max_interval_minutes") ?? 180;
      const nextDropAt = generateRandomDrop({
        config: {
          minAmount,
          maxAmount,
          minIntervalMinutes,
          maxIntervalMinutes
        },
        now: new Date(),
        random: Math.random
      }).nextDropAt;

      await configureRedEnvelopeDrops(prisma, {
        guildId,
        channelId: channel.id,
        enabled: true,
        minAmount,
        maxAmount,
        minIntervalMinutes,
        maxIntervalMinutes,
        nextDropAt
      });

      await interaction.reply({
        content: `Random red envelope drops are enabled. LionDen will target the most active eligible channel, using <#${channel.id}> as the fallback channel. Range: ${Math.min(minAmount, maxAmount)}-${Math.max(minAmount, maxAmount)} coins, every ${Math.min(minIntervalMinutes, maxIntervalMinutes)}-${Math.max(minIntervalMinutes, maxIntervalMinutes)} minutes.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "pause") {
      const config = await getRedEnvelopeDropConfig(prisma, guildId);

      if (!config) {
        await interaction.reply({
          content:
            "Random red envelope drops are not configured yet. Run `/redenvelope configure` first.",
          ephemeral: true
        });
        return;
      }

      await setRedEnvelopeDropConfigEnabled(prisma, {
        guildId,
        enabled: false
      });

      await interaction.reply({
        content: "Random red envelope drops are now paused.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "dropnow") {
      const config = await getRedEnvelopeDropConfig(prisma, guildId);

      if (!config) {
        await interaction.reply({
          content:
            "Random red envelope drops are not configured yet. Run `/redenvelope configure` first.",
          ephemeral: true
        });
        return;
      }

      const openEnvelope = await getOpenRedEnvelopeForGuild(prisma, guildId);

      if (openEnvelope) {
        await interaction.reply({
          content:
            "There is already an open red envelope in this server. Wait for it to be claimed before forcing another drop.",
          ephemeral: true
        });
        return;
      }

      const postedDrop = await postConfiguredRedEnvelopeDrop(interaction.client, {
        config,
        now: new Date(),
        createdByUserId: interaction.user.id,
        createdByDisplayName: interaction.user.username
      });

      if (!postedDrop) {
        await interaction.reply({
          content:
            "LionDen could not find an eligible channel for the drop. Make sure the fallback channel still exists and LionDen can post there.",
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: `Random red envelope dropped in <#${postedDrop.channelId}> for ${postedDrop.amount} coins.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "clearopen") {
      const clearedCount = await clearOpenRedEnvelopesForGuild(prisma, guildId);

      await interaction.reply({
        content:
          clearedCount === 0
            ? "There were no open red envelopes to clear."
            : `Cleared ${clearedCount} open red envelope${clearedCount === 1 ? "" : "s"} for this server.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "status") {
      const now = new Date();
      const [config, openEnvelope] = await Promise.all([
        getRedEnvelopeDropConfig(prisma, guildId),
        getOpenRedEnvelopeForGuild(prisma, guildId, now)
      ]);

      await interaction.reply({
        content: formatRedEnvelopeStatusMessage({
          now,
          config,
          openEnvelope
        }),
        ephemeral: true
      });
      return;
    }

    const existingOpenEnvelope = await getOpenRedEnvelopeForGuild(
      prisma,
      guildId,
      new Date()
    );

    if (existingOpenEnvelope) {
      await interaction.reply({
        content:
          "There is already an open red envelope in this server. Claim it first, or use `/redenvelope clearopen` if it is stale.",
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
      })
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

export const redEnvelopeCommandJson =
  redEnvelopeCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
