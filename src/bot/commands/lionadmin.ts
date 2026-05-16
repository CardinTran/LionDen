import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import {
  DEFAULT_LION_SPAWN_MAX_INTERVAL_MINUTES,
  DEFAULT_LION_SPAWN_MIN_INTERVAL_MINUTES,
  configureLionSpawnConfig,
  ensureLionSpawnConfig,
  generateNextLionSpawnAt,
  getLionSpawnConfig,
  listActiveWildLionSpawns,
  setLionSpawnConfigEnabled,
  syncDefaultLionData,
  type LionSpawnConfigRecord
} from "../../features/lions/lion-creature.service.js";
import { postWildLionSpawnToChannel } from "../../features/lions/lion-spawn-scheduler.js";
import { formatDiscordTimestamp } from "../../features/lions/lion-formatting.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./ping.js";

const requireManageGuild = async (
  interaction: ChatInputCommandInteraction
): Promise<boolean> => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "You do not have permission to manage LionDen lion spawns.",
      ephemeral: true
    });
    return false;
  }

  return true;
};

const formatLionAdminStatusMessage = (input: {
  config: LionSpawnConfigRecord | null;
  activeSpawns: Awaited<ReturnType<typeof listActiveWildLionSpawns>>;
}): string => {
  const lines = ["Lion creature admin status"];

  if (!input.config) {
    lines.push("Spawn automation: not configured");
  } else {
    lines.push(
      `Spawn automation: ${input.config.enabled ? "enabled" : "paused"}`
    );
    lines.push(
      `Interval range: ${Math.min(input.config.minIntervalMinutes, input.config.maxIntervalMinutes)}-${Math.max(input.config.minIntervalMinutes, input.config.maxIntervalMinutes)} minutes`
    );
    lines.push(
      `Next spawn: ${input.config.nextSpawnAt ? formatDiscordTimestamp(input.config.nextSpawnAt) : "not scheduled"}`
    );
    lines.push(
      `Last spawn: ${input.config.lastSpawnedAt ? formatDiscordTimestamp(input.config.lastSpawnedAt) : "none"}`
    );
  }

  if (input.activeSpawns.length === 0) {
    lines.push("Active wild lions: none");
  } else {
    lines.push(
      `Active wild lions: ${input.activeSpawns
        .map(
          (spawn) =>
            `Lv. ${spawn.level} ${spawn.species.name} \`${spawn.species.publicId}\` in <#${spawn.channelId}>`
        )
        .join(", ")}`
    );
  }

  return lines.join("\n");
};

export const lionAdminCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("lionadmin")
    .setDescription("Manage LionDen lion creature spawns and catalog data.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("configure")
        .setDescription("Configure automated wild lion spawn timing.")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Whether automated wild lion spawns are enabled.")
        )
        .addIntegerOption((option) =>
          option
            .setName("min_interval_minutes")
            .setDescription(
              "Minimum minutes until the next automated wild lion spawn."
            )
            .setMinValue(1)
        )
        .addIntegerOption((option) =>
          option
            .setName("max_interval_minutes")
            .setDescription(
              "Maximum minutes until the next automated wild lion spawn."
            )
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("dropnow")
        .setDescription("Force one wild lion spawn in this channel.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pause")
        .setDescription("Pause automated wild lion spawns.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("resume")
        .setDescription("Resume automated wild lion spawns.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription(
          "Show current lion spawn configuration and active wild lions."
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

    await syncDefaultLionData(prisma);

    const subcommand = interaction.options.getSubcommand(true);
    const now = new Date();

    if (subcommand === "configure") {
      const currentConfig = await getLionSpawnConfig(prisma, guildId);
      const enabled = interaction.options.getBoolean("enabled") ?? true;
      const minIntervalMinutes =
        interaction.options.getInteger("min_interval_minutes") ??
        currentConfig?.minIntervalMinutes ??
        DEFAULT_LION_SPAWN_MIN_INTERVAL_MINUTES;
      const maxIntervalMinutes =
        interaction.options.getInteger("max_interval_minutes") ??
        currentConfig?.maxIntervalMinutes ??
        DEFAULT_LION_SPAWN_MAX_INTERVAL_MINUTES;
      const nextSpawnAt = generateNextLionSpawnAt({
        config: {
          minIntervalMinutes,
          maxIntervalMinutes
        },
        now,
        random: Math.random
      });

      await configureLionSpawnConfig(prisma, {
        guildId,
        enabled,
        minIntervalMinutes,
        maxIntervalMinutes,
        nextSpawnAt
      });

      await interaction.reply({
        content: `Wild lion spawns are ${enabled ? "enabled" : "paused"}. Interval: ${Math.min(minIntervalMinutes, maxIntervalMinutes)}-${Math.max(minIntervalMinutes, maxIntervalMinutes)} minutes. Next spawn ${formatDiscordTimestamp(nextSpawnAt)}.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "pause" || subcommand === "resume") {
      await ensureLionSpawnConfig(prisma, {
        guildId,
        now,
        random: Math.random
      });
      await setLionSpawnConfigEnabled(prisma, {
        guildId,
        enabled: subcommand === "resume"
      });

      await interaction.reply({
        content:
          subcommand === "resume"
            ? "Automated wild lion spawns are resumed."
            : "Automated wild lion spawns are paused.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "dropnow") {
      const channel = interaction.channel;

      if (
        !channel ||
        !channel.isTextBased() ||
        channel.type === ChannelType.DM ||
        !("send" in channel)
      ) {
        await interaction.reply({
          content:
            "Wild lions can only be forced from a server text channel where LionDen can post messages.",
          ephemeral: true
        });
        return;
      }

      const activeSpawns = await listActiveWildLionSpawns(prisma, {
        guildId,
        now
      });
      const channelSpawn = activeSpawns.find(
        (spawn) => spawn.channelId === channel.id
      );

      if (channelSpawn) {
        await interaction.reply({
          content: `There is already an active wild lion in <#${channel.id}>: ${channelSpawn.species.name} \`${channelSpawn.species.publicId}\`.`,
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply({
        ephemeral: true
      });

      const spawn = await postWildLionSpawnToChannel(channel, {
        guildId,
        now,
        random: Math.random
      });

      if (!spawn || spawn.channelId !== channel.id) {
        await interaction.editReply({
          content:
            "LionDen could not create a wild lion spawn right now. Check that enabled species exist and no channel state is stuck."
        });
        return;
      }

      await interaction.editReply({
        content: `Forced a wild Lv. ${spawn.level} ${spawn.species.name} \`${spawn.species.publicId}\` spawn in <#${channel.id}>.`
      });
      return;
    }

    if (subcommand === "status") {
      const [config, activeSpawns] = await Promise.all([
        getLionSpawnConfig(prisma, guildId),
        listActiveWildLionSpawns(prisma, {
          guildId,
          now
        })
      ]);

      await interaction.reply({
        content: formatLionAdminStatusMessage({
          config,
          activeSpawns
        }),
        ephemeral: true
      });
    }
  }
};

export const lionAdminCommandJson =
  lionAdminCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
