import type { Message } from "discord.js";
import type { BridgeConfig } from "./config.js";
import { runPi } from "./pi-client.js";
import { evaluateMessagePolicy } from "./policy.js";
import { SessionStore } from "./session-store.js";

interface HandleHooks {
  onAccepted?: () => Promise<void> | void;
}

export class MessageRouter {
  constructor(
    private readonly config: BridgeConfig,
    private readonly sessionStore: SessionStore,
    private readonly botUserId: string,
  ) {}

  async handle(message: Message, hooks: HandleHooks = {}): Promise<string | null> {
    const decision = evaluateMessagePolicy(this.config, message, this.botUserId);
    if (!decision.shouldRespond) {
      console.log(
        `[${this.config.agent.agentName}] ignored message ${message.id} in ${message.channelId}: ${decision.reason ?? "unknown"}`,
      );
      return null;
    }

    await hooks.onAccepted?.();

    const conversationKey = [message.guildId ?? "dm", message.channelId, message.thread?.id ?? message.channelId].join("/");
    const sessionId = this.sessionStore.get(conversationKey);

    console.log(
      `[${this.config.agent.agentName}] handling message ${message.id} in ${message.channelId} with session ${sessionId ?? "new"}`,
    );

    const result = await runPi(this.config.agent, {
      message,
      sessionId,
      isHomeChannel: decision.isHomeChannel,
      turnMode: decision.turnMode,
    });

    this.sessionStore.set(result.conversationKey, result.sessionId);
    console.log(
      `[${this.config.agent.agentName}] produced reply for message ${message.id} with session ${result.sessionId}`,
    );
    return result.reply || "我这边收到了，但这轮没有生成可发送的回复。";
  }
}
