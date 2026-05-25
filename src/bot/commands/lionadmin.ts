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
  clearActiveLionChannelEffects,
  clearActiveWildLionSpawns,
  configureLionSpawnConfig,
  ensureLionSpawnConfig,
  generateNextLionSpawnAt,
  getLionSpawnConfig,
  grantLionItem,
  listActiveLionChannelEffects,
  listActiveWildLionSpawns,
  setLionShopItemEnabled,
  setLionSpeciesEnabled,
  setLionSpawnConfigEnabled,
  syncDefaultLionData,
  tuneLionShopItem,
  tuneLionSpecies,
  type LionSpawnConfigRecord
} from "../../features/lions/lion-creature.service.js";
import { postWildLionSpawnToChannel } from "../../features/lions/lion-spawn-scheduler.js";
import { formatDiscordTimestamp } from "../../features/lions/lion-formatting.js";
import type { LionRarityValue } from "../../features/lions/lion-seed-data.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./types.js";

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
  activeEffects: Awaited<ReturnType<typeof listActiveLionChannelEffects>>;
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

  if (input.activeEffects.length === 0) {
    lines.push("Active channel effects: none");
  } else {
    lines.push(
      `Active channel effects: ${input.activeEffects
        .map(
          (effect) =>
            `${effect.effectType} \`${effect.itemKey}\` in <#${effect.channelId}> until ${formatDiscordTimestamp(effect.expiresAt)}`
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
        .addStringOption((option) =>
          option
            .setName("species")
            .setDescription("Optional species public ID, such as L001.")
            .setMaxLength(16)
        )
        .addStringOption((option) =>
          option
            .setName("rarity")
            .setDescription("Optional rarity for event drops.")
            .addChoices(
              { name: "Common", value: "COMMON" },
              { name: "Uncommon", value: "UNCOMMON" },
              { name: "Rare", value: "RARE" },
              { name: "Epic", value: "EPIC" },
              { name: "Legendary", value: "LEGENDARY" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("min_level")
            .setDescription("Optional minimum encounter level.")
            .setMinValue(1)
            .setMaxValue(50)
        )
        .addIntegerOption((option) =>
          option
            .setName("max_level")
            .setDescription("Optional maximum encounter level.")
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clearspawn")
        .setDescription("Expire active wild lion spawns in this channel.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cleareffects")
        .setDescription("Clear active lion item effects in this channel.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("grantitem")
        .setDescription("Grant a lion item to a member.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Member receiving the item.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("item")
            .setDescription("Lion item key, such as basic-ball.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("quantity")
            .setDescription("Quantity to grant.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(99)
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("species")
        .setDescription("Enable or tune lion species.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("enable")
            .setDescription("Enable or disable a lion species.")
            .addStringOption((option) =>
              option
                .setName("species")
                .setDescription("Species public ID or slug.")
                .setRequired(true)
            )
            .addBooleanOption((option) =>
              option
                .setName("enabled")
                .setDescription("Whether this species can spawn.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("tune")
            .setDescription("Tune catch rate or spawn weight for a species.")
            .addStringOption((option) =>
              option
                .setName("species")
                .setDescription("Species public ID or slug.")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("spawn_weight")
                .setDescription("Spawn weight, 0 disables natural selection.")
                .setMinValue(0)
            )
            .addIntegerOption((option) =>
              option
                .setName("catch_rate")
                .setDescription("Base catch rate from 5 to 95.")
                .setMinValue(5)
                .setMaxValue(95)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("item")
        .setDescription("Enable or tune lion shop items.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("enable")
            .setDescription("Enable or disable a lion shop item.")
            .addStringOption((option) =>
              option
                .setName("item")
                .setDescription("Item key.")
                .setRequired(true)
            )
            .addBooleanOption((option) =>
              option
                .setName("enabled")
                .setDescription("Whether members can buy or use the item.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("tune")
            .setDescription("Tune price or effect value for an item.")
            .addStringOption((option) =>
              option
                .setName("item")
                .setDescription("Item key.")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("price")
                .setDescription("Coin price.")
                .setMinValue(0)
            )
            .addIntegerOption((option) =>
              option
                .setName("effect_value")
                .setDescription("Item effect value.")
                .setMinValue(0)
            )
        )
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

    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand(true);
    const now = new Date();

    if (subcommandGroup === "species") {
      const species = interaction.options.getString("species", true);

      if (subcommand === "enable") {
        const enabled = interaction.options.getBoolean("enabled", true);
        const result = await setLionSpeciesEnabled(prisma, {
          publicIdOrSlug: species,
          enabled
        });

        logger.warn("Lion species enabled state changed", {
          guildId,
          actorUserId: interaction.user.id,
          species,
          enabled,
          outcome: result.outcome
        });

        await interaction.reply({
          content:
            result.outcome === "updated" && result.record
              ? `${result.record.name} \`${result.record.publicId}\` is now ${enabled ? "enabled" : "disabled"}.`
              : `I could not find species \`${species}\`.`,
          ephemeral: true
        });
        return;
      }

      if (subcommand === "tune") {
        const result = await tuneLionSpecies(prisma, {
          publicIdOrSlug: species,
          spawnWeight: interaction.options.getInteger("spawn_weight"),
          baseCatchRate: interaction.options.getInteger("catch_rate")
        });

        logger.warn("Lion species tuned", {
          guildId,
          actorUserId: interaction.user.id,
          species,
          outcome: result.outcome
        });

        await interaction.reply({
          content:
            result.outcome === "updated" && result.record
              ? `${result.record.name} \`${result.record.publicId}\` tuned. Spawn weight: ${result.record.spawnWeight}. Catch rate: ${result.record.baseCatchRate}.`
              : result.error ?? `I could not find species \`${species}\`.`,
          ephemeral: true
        });
        return;
      }
    }

    if (subcommandGroup === "item") {
      const item = interaction.options.getString("item", true);

      if (subcommand === "enable") {
        const enabled = interaction.options.getBoolean("enabled", true);
        const result = await setLionShopItemEnabled(prisma, {
          itemKey: item,
          enabled
        });

        logger.warn("Lion shop item enabled state changed", {
          guildId,
          actorUserId: interaction.user.id,
          itemKey: item,
          enabled,
          outcome: result.outcome
        });

        await interaction.reply({
          content:
            result.outcome === "updated" && result.record
              ? `${result.record.name} \`${result.record.itemKey}\` is now ${enabled ? "enabled" : "disabled"}.`
              : `I could not find item \`${item}\`.`,
          ephemeral: true
        });
        return;
      }

      if (subcommand === "tune") {
        const result = await tuneLionShopItem(prisma, {
          itemKey: item,
          priceCoins: interaction.options.getInteger("price"),
          effectValue: interaction.options.getInteger("effect_value")
        });

        logger.warn("Lion shop item tuned", {
          guildId,
          actorUserId: interaction.user.id,
          itemKey: item,
          outcome: result.outcome
        });

        await interaction.reply({
          content:
            result.outcome === "updated" && result.record
              ? `${result.record.name} \`${result.record.itemKey}\` tuned. Price: ${result.record.priceCoins}. Effect value: ${result.record.effectValue}.`
              : result.error ?? `I could not find item \`${item}\`.`,
          ephemeral: true
        });
        return;
      }
    }

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

      logger.warn("Lion spawn config changed", {
        guildId,
        actorUserId: interaction.user.id,
        enabled,
        minIntervalMinutes,
        maxIntervalMinutes,
        nextSpawnAt: nextSpawnAt.toISOString()
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

      logger.warn("Lion spawn automation state changed", {
        guildId,
        actorUserId: interaction.user.id,
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
      const minLevel = interaction.options.getInteger("min_level");
      const maxLevel = interaction.options.getInteger("max_level");

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
        random: Math.random,
        speciesPublicId: interaction.options.getString("species"),
        rarity: interaction.options.getString("rarity") as LionRarityValue | null,
        minLevel,
        maxLevel
      });

      if (!spawn || spawn.channelId !== channel.id) {
        logger.warn("Forced lion spawn failed", {
          guildId,
          channelId: channel.id,
          actorUserId: interaction.user.id
        });
        await interaction.editReply({
          content:
            "LionDen could not create a wild lion spawn right now. Check that enabled species exist and no channel state is stuck."
        });
        return;
      }

      logger.warn("Forced lion spawn posted", {
        guildId,
        channelId: channel.id,
        actorUserId: interaction.user.id,
        spawnId: spawn.id,
        species: spawn.species.slug,
        level: spawn.level
      });

      await interaction.editReply({
        content: `Forced a wild Lv. ${spawn.level} ${spawn.species.name} \`${spawn.species.publicId}\` spawn in <#${channel.id}>.`
      });
      return;
    }

    if (subcommand === "clearspawn") {
      const channel = interaction.channel;

      if (!channel || channel.type === ChannelType.DM) {
        await interaction.reply({
          content: "Use this command from the server channel to clear.",
          ephemeral: true
        });
        return;
      }

      const clearedCount = await clearActiveWildLionSpawns(prisma, {
        guildId,
        channelId: channel.id
      });

      logger.warn("Active lion spawns cleared", {
        guildId,
        channelId: channel.id,
        actorUserId: interaction.user.id,
        clearedCount
      });

      await interaction.reply({
        content:
          clearedCount === 0
            ? "There were no active wild lion spawns to clear in this channel."
            : `Cleared ${clearedCount} active wild lion spawn${clearedCount === 1 ? "" : "s"} in this channel.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "cleareffects") {
      const channel = interaction.channel;

      if (!channel || channel.type === ChannelType.DM) {
        await interaction.reply({
          content: "Use this command from the server channel to clear.",
          ephemeral: true
        });
        return;
      }

      const clearedCount = await clearActiveLionChannelEffects(prisma, {
        guildId,
        channelId: channel.id,
        now
      });

      logger.warn("Active lion channel effects cleared", {
        guildId,
        channelId: channel.id,
        actorUserId: interaction.user.id,
        clearedCount
      });

      await interaction.reply({
        content:
          clearedCount === 0
            ? "There were no active lion item effects to clear in this channel."
            : `Cleared ${clearedCount} active lion item effect${clearedCount === 1 ? "" : "s"} in this channel.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "grantitem") {
      const user = interaction.options.getUser("user", true);
      const member = interaction.guild?.members.cache.get(user.id);
      const itemKey = interaction.options.getString("item", true);
      const quantity = interaction.options.getInteger("quantity", true);
      const result = await grantLionItem(prisma, {
        guildId,
        userId: user.id,
        displayName: member?.displayName ?? user.username,
        itemKey,
        quantity
      });

      logger.warn("Lion item grant attempted", {
        guildId,
        actorUserId: interaction.user.id,
        targetUserId: user.id,
        itemKey,
        quantity,
        outcome: result.outcome
      });

      await interaction.reply({
        content:
          result.outcome === "granted" && result.item
            ? `Granted ${quantity} ${result.item.name} to ${member?.displayName ?? user.username}.`
            : `I could not find item \`${itemKey}\`.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "status") {
      const [config, activeSpawns, activeEffects] = await Promise.all([
        getLionSpawnConfig(prisma, guildId),
        listActiveWildLionSpawns(prisma, {
          guildId,
          now
        }),
        listActiveLionChannelEffects(prisma, {
          guildId,
          now
        })
      ]);

      await interaction.reply({
        content: formatLionAdminStatusMessage({
          config,
          activeSpawns,
          activeEffects
        }),
        ephemeral: true
      });
    }
  }
};

export const lionAdminCommandJson =
  lionAdminCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
