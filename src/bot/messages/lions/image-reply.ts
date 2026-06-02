import { EmbedBuilder, type MessageReplyOptions } from "discord.js";

import { getLionImageUrl } from "../../../features/lions/lion-image-url.js";

export const buildLionImageReply = (
  content: string,
  imagePath: string
): string | MessageReplyOptions => {
  const imageUrl = getLionImageUrl(imagePath);

  if (!imageUrl) {
    return content;
  }

  return {
    content,
    embeds: [new EmbedBuilder().setImage(imageUrl)]
  };
};

