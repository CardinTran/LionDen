import {
  findLionSpeciesByQuery,
  findUserLionFromList,
  listUserLionTeam,
  listUserLions
} from "../../../features/lions/lion-creature.service.js";
import { getFavoriteLion } from "../../../features/lions/lion-showcase.service.js";
import {
  formatLionSpeciesMessage,
  formatOwnedLionMessage,
  formatUserLionsMessage
} from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleRosterLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand === "~lions") {
    const [lions, team, favorite] = await Promise.all([
      listUserLions(prisma, {
        guildId,
        userId: message.author.id,
        limit: 20
      }),
      listUserLionTeam(prisma, {
        guildId,
        userId: message.author.id
      }),
      getFavoriteLion(prisma, {
        guildId,
        userId: message.author.id
      })
    ]);

    await message.reply(
      formatUserLionsMessage({
        lions,
        displayName: getDisplayName(message),
        team,
        favoriteLionId: favorite?.lionId ?? null
      })
    );
    return true;
  }

  if (normalizedCommand !== "~lion") {
    return false;
  }

  if (args.length === 0) {
    await message.reply(
      "Use `~lion <code, slug, name, owned ID, or nickname>` to inspect a lion."
    );
    return true;
  }

  const query = args.join(" ");
  const species = await findLionSpeciesByQuery(prisma, query);

  if (species) {
    await message.reply(formatLionSpeciesMessage(species));
    return true;
  }

  const lions = await listUserLions(prisma, {
    guildId,
    userId: message.author.id,
    limit: 100
  });
  const lion = findUserLionFromList(lions, query);
  const favorite = await getFavoriteLion(prisma, {
    guildId,
    userId: message.author.id
  });

  if (!lion) {
    await message.reply(
      "I could not find that lion in the LionDen catalog or your roster."
    );
    return true;
  }

  await message.reply(
    formatOwnedLionMessage(lion, getDisplayName(message), {
      isFavorite: favorite?.lionId === lion.id
    })
  );
  return true;
};
