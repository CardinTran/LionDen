import { setUserLionNickname } from "../../../features/lions/lion-creature.service.js";
import { formatSetUserLionNicknameMessage } from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleNicknameLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand !== "~nickname") {
    return false;
  }

  if (args.length < 2) {
    await message.reply(
      "Use `~nickname <lion id or code> <name>`. Use `clear` as the name to remove a nickname."
    );
    return true;
  }

  const nicknameInput = args.slice(1).join(" ");
  const result = await setUserLionNickname(prisma, {
    guildId,
    userId: message.author.id,
    query: args[0] ?? "",
    nickname: nicknameInput.toLowerCase() === "clear" ? "" : nicknameInput
  });

  await message.reply(formatSetUserLionNicknameMessage(result));
  return true;
};
