export const LION_MESSAGE_COMMANDS = [
  "~help",
  "~shop",
  "~buy",
  "~bag",
  "~use",
  "~catch",
  "~train",
  "~nickname",
  "~release",
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
] as const;

export type LionMessageCommand = (typeof LION_MESSAGE_COMMANDS)[number];

export interface ParsedLionMessageCommand {
  normalizedCommand: LionMessageCommand;
  args: string[];
}

const lionMessageCommandSet = new Set<string>(LION_MESSAGE_COMMANDS);

export const isLionMessageCommand = (
  command: string
): command is LionMessageCommand => lionMessageCommandSet.has(command);

export const parseLionMessageCommand = (
  content: string
): ParsedLionMessageCommand | null => {
  const trimmedContent = content.trim();

  if (!trimmedContent.startsWith("~")) {
    return null;
  }

  const [command, ...args] = trimmedContent.split(/\s+/);
  const normalizedCommand = command.toLowerCase();

  if (!isLionMessageCommand(normalizedCommand)) {
    return null;
  }

  return {
    normalizedCommand,
    args
  };
};
