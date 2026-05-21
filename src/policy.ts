import type { Message } from "discord.js";
import type { BridgeConfig } from "./config.js";

export interface PolicyDecision {
  shouldRespond: boolean;
  reason?: string;
  isHomeChannel: boolean;
  mentionRequired: boolean;
  turnMode: boolean;
}

function mentionsOtherUser(message: Message, botUserId: string): boolean {
  return message.mentions.users.some((user) => user.id !== botUserId);
}

export function evaluateMessagePolicy(
  config: BridgeConfig,
  message: Message,
  botUserId: string,
): PolicyDecision {
  const isHomeChannel = message.channelId === config.shared.homeChannelId;
  const mentionRequired = config.shared.requireMentionOutsideHome && !isHomeChannel;
  const wasMentioned = message.mentions.users.has(botUserId);
  const turnMode = message.content.includes("[TURN]");

  if (!config.shared.allowedUserIds.includes(message.author.id)) {
    return { shouldRespond: false, reason: "unauthorized-user", isHomeChannel, mentionRequired, turnMode };
  }

  if (message.author.bot && !config.shared.allowBotMessages) {
    return { shouldRespond: false, reason: "bot-message", isHomeChannel, mentionRequired, turnMode };
  }

  const specialMode = config.shared.specialChannels[message.channelId]?.mode;
  if (specialMode === "coordinator") {
    if (turnMode && !wasMentioned) {
      return { shouldRespond: false, reason: "turn-without-mention", isHomeChannel, mentionRequired, turnMode };
    }

    if (!turnMode && mentionsOtherUser(message, botUserId) && !wasMentioned) {
      return { shouldRespond: false, reason: "other-user-mentioned", isHomeChannel, mentionRequired, turnMode };
    }
  }

  if (specialMode === "silent-when-other-mentioned" && mentionsOtherUser(message, botUserId) && !wasMentioned) {
    return { shouldRespond: false, reason: "other-user-mentioned", isHomeChannel, mentionRequired, turnMode };
  }

  if (mentionRequired && !wasMentioned) {
    return { shouldRespond: false, reason: "mention-required", isHomeChannel, mentionRequired, turnMode };
  }

  return { shouldRespond: true, isHomeChannel, mentionRequired, turnMode };
}
