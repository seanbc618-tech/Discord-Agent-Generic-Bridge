#!/usr/bin/env node

import { createRequire } from "node:module";
import { loadBridgeConfig } from "./config.js";
import { MessageRouter } from "./router.js";
import { SessionStore } from "./session-store.js";

const require = createRequire(import.meta.url);

type DiscordMessage = import("discord.js").Message;
type TypingChannel = { sendTyping: () => Promise<unknown> };

function configureProxy(): string | null {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  if (!proxyUrl) {
    return null;
  }

  const { ProxyAgent, setGlobalDispatcher } = require("undici") as {
    ProxyAgent: new (uri: string) => unknown;
    setGlobalDispatcher: (dispatcher: unknown) => void;
  };
  const { HttpsProxyAgent } = require("https-proxy-agent") as {
    HttpsProxyAgent: new (uri: string) => unknown;
  };
  const ws = require("ws") as {
    WebSocket: any;
  };

  setGlobalDispatcher(new ProxyAgent(proxyUrl));

  const BaseWebSocket = ws.WebSocket;
  const proxyAgent = new HttpsProxyAgent(proxyUrl);

  class ProxiedWebSocket extends BaseWebSocket {
    constructor(address: string, protocols?: string | string[], options: Record<string, unknown> = {}) {
      super(address, protocols, {
        ...options,
        agent: options.agent || proxyAgent,
      });
    }
  }

  ws.WebSocket = ProxiedWebSocket;
  return proxyUrl;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function reactionsEnabled(): boolean {
  const value = (process.env.DISCORD_REACTIONS ?? "true").toLowerCase();
  return !["false", "0", "no", "off"].includes(value);
}

async function addReaction(message: DiscordMessage, emoji: string): Promise<void> {
  try {
    await message.react(emoji);
  } catch (error) {
    console.log(`[reaction] add ${emoji} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function removeReaction(message: DiscordMessage, emoji: string, user: unknown): Promise<void> {
  try {
    const reaction = message.reactions.resolve(emoji);
    if (!reaction) {
      return;
    }
    await reaction.users.remove(user as string);
  } catch (error) {
    console.log(`[reaction] remove ${emoji} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function withTyping(channel: TypingChannel, task: Promise<void>): Promise<void> {
  let active = true;
  const interval = setInterval(() => {
    void channel.sendTyping().catch(() => undefined);
  }, 8000);

  try {
    await channel.sendTyping().catch(() => undefined);
    await task;
  } finally {
    active = false;
    if (active === false) {
      clearInterval(interval);
    }
  }
}

function successReaction(configuredReaction?: string): string {
  return configuredReaction || "✅";
}

async function main(): Promise<void> {
  const agentConfigPath = process.env.BRIDGE_AGENT_CONFIG;
  const sharedConfigPath = process.env.BRIDGE_SHARED_CONFIG;

  if (!agentConfigPath || !sharedConfigPath) {
    throw new Error("Set BRIDGE_AGENT_CONFIG and BRIDGE_SHARED_CONFIG before starting the bridge.");
  }

  const config = loadBridgeConfig(agentConfigPath, sharedConfigPath);
  const token = requireEnv(config.agent.discordTokenEnv);
  const proxyUrl = configureProxy();
  const { Client, GatewayIntentBits } = await import("discord.js");

  if (proxyUrl) {
    console.log(`[${config.agent.agentName}] using proxy for Discord REST and Gateway: ${proxyUrl}`);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once("clientReady", () => {
    console.log(`[${config.agent.agentName}] logged in as ${client.user?.tag ?? "unknown"}`);
  });

  client.on("messageCreate", async (message) => {
    if (!client.user) {
      return;
    }

    console.log(
      `[${config.agent.agentName}] received message ${message.id} from ${message.author.id} in ${message.channelId}; mentions=${message.mentions.users.map((user) => user.id).join(",") || "none"}`,
    );

    const router = new MessageRouter(
      config,
      new SessionStore(config.agent.sessionMapFile),
      client.user.id,
    );

    const useReactions = reactionsEnabled();
    const okReaction = successReaction(config.agent.successReaction);
    let accepted = false;

    try {
      await withTyping(
        message.channel,
        (async () => {
          const reply = await router.handle(message, {
            onAccepted: async () => {
              accepted = true;
              if (useReactions) {
                await addReaction(message, "👀");
              }
            },
          });

          if (reply) {
            console.log(`[${config.agent.agentName}] replying to message ${message.id}`);
            await message.reply(reply);
          }
        })(),
      );

      if (accepted && useReactions) {
        await removeReaction(message, "👀", client.user);
        await addReaction(message, okReaction);
      }
    } catch (error) {
      if (accepted && useReactions) {
        await removeReaction(message, "👀", client.user);
        await addReaction(message, "❌");
      }

      const text = error instanceof Error ? error.message : String(error);
      console.error(`[${config.agent.agentName}] failed to handle message:`, text);
      await message.reply(`处理消息时出错了：${text}`);
    }
  });

  await client.login(token);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
