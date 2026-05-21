import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

export type SpecialChannelMode = "coordinator" | "silent-when-other-mentioned";

export interface SharedConfig {
  allowedUserIds: string[];
  homeChannelId: string;
  allowBotMessages: boolean;
  requireMentionOutsideHome: boolean;
  specialChannels: Record<string, { mode: SpecialChannelMode }>;
}

export interface AgentConfig {
  agentName: string;
  profileDir: string;
  piCommand: string;
  personaPrompt: string;
  sharedPrompt: string;
  sessionMapFile: string;
  sessionsDir?: string;
  discordTokenEnv: string;
  successReaction?: string;
}

export interface BridgeConfig {
  agent: AgentConfig;
  shared: SharedConfig;
}

function loadJsonFile<T>(filePath: string): T {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load JSON from ${filePath}: ${text}`);
  }
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requireString(value, label);
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }
  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${label} must be an array of non-empty strings.`);
  }
  return value;
}

function resolveConfigPath(baseDir: string, filePath: string): string {
  return isAbsolute(filePath) ? filePath : resolve(baseDir, filePath);
}

function normalizeSpecialChannels(value: unknown): Record<string, { mode: SpecialChannelMode }> {
  if (value === undefined) {
    return {};
  }

  const specialChannels = asObject(value, "shared.specialChannels");
  return Object.fromEntries(
    Object.entries(specialChannels).map(([channelId, raw]) => {
      const entry = asObject(raw, `shared.specialChannels.${channelId}`);
      const mode = requireString(entry.mode, `shared.specialChannels.${channelId}.mode`);
      if (mode !== "coordinator" && mode !== "silent-when-other-mentioned") {
        throw new Error(
          `shared.specialChannels.${channelId}.mode must be \"coordinator\" or \"silent-when-other-mentioned\".`,
        );
      }
      return [channelId, { mode }];
    }),
  );
}

function normalizeAgentConfig(filePath: string, raw: unknown): AgentConfig {
  const agent = asObject(raw, "agent config");
  const baseDir = dirname(filePath);

  return {
    agentName: requireString(agent.agentName, "agent.agentName"),
    profileDir: resolveConfigPath(baseDir, requireString(agent.profileDir, "agent.profileDir")),
    piCommand: resolveConfigPath(baseDir, requireString(agent.piCommand, "agent.piCommand")),
    personaPrompt: resolveConfigPath(baseDir, requireString(agent.personaPrompt, "agent.personaPrompt")),
    sharedPrompt: resolveConfigPath(baseDir, requireString(agent.sharedPrompt, "agent.sharedPrompt")),
    sessionMapFile: resolveConfigPath(baseDir, requireString(agent.sessionMapFile, "agent.sessionMapFile")),
    sessionsDir: agent.sessionsDir
      ? resolveConfigPath(baseDir, requireString(agent.sessionsDir, "agent.sessionsDir"))
      : undefined,
    discordTokenEnv: requireString(agent.discordTokenEnv, "agent.discordTokenEnv"),
    successReaction: optionalString(agent.successReaction, "agent.successReaction"),
  };
}

function normalizeSharedConfig(raw: unknown): SharedConfig {
  const shared = asObject(raw, "shared config");

  return {
    allowedUserIds: requireStringArray(shared.allowedUserIds, "shared.allowedUserIds"),
    homeChannelId: requireString(shared.homeChannelId, "shared.homeChannelId"),
    allowBotMessages: requireBoolean(shared.allowBotMessages, "shared.allowBotMessages"),
    requireMentionOutsideHome: requireBoolean(
      shared.requireMentionOutsideHome,
      "shared.requireMentionOutsideHome",
    ),
    specialChannels: normalizeSpecialChannels(shared.specialChannels),
  };
}

export function loadBridgeConfig(agentConfigPath: string, sharedConfigPath: string): BridgeConfig {
  const resolvedAgentConfigPath = resolve(agentConfigPath);
  const resolvedSharedConfigPath = resolve(sharedConfigPath);

  return {
    agent: normalizeAgentConfig(resolvedAgentConfigPath, loadJsonFile<unknown>(resolvedAgentConfigPath)),
    shared: normalizeSharedConfig(loadJsonFile<unknown>(resolvedSharedConfigPath)),
  };
}
