import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Message } from "discord.js";
import type { AgentConfig } from "./config.js";

export interface PiRequest {
  message: Message;
  sessionId?: string;
  isHomeChannel: boolean;
  turnMode: boolean;
}

function buildConversationKey(message: Message): string {
  const rootId = message.thread?.id ?? message.channelId;
  return [message.guildId ?? "dm", message.channelId, rootId].join("/");
}

function buildRuntimePrompt(agentName: string, request: PiRequest): string {
  return [
    `Discord runtime context for ${agentName}:`,
    `- Guild: ${request.message.guild?.name ?? "DM"} (${request.message.guildId ?? "dm"})`,
    `- Channel: ${request.message.channelId}`,
    `- Thread: ${request.message.thread?.id ?? "none"}`,
    `- Author: ${request.message.author.username} (${request.message.author.id})`,
    `- Home channel: ${request.isHomeChannel ? "yes" : "no"}`,
    `- Mentioned bot: ${request.message.mentions.users.size > 0 ? "yes" : "no"}`,
    `- Turn mode: ${request.turnMode ? "yes" : "no"}`,
  ].join("\n");
}

function stripBotMentions(content: string): string {
  return content.replace(/<@!?\d+>/g, "").trim();
}

function findLatestSessionFile(sessionsDir: string): string | undefined {
  const owners = readdirSync(sessionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(sessionsDir, entry.name));

  const candidates = owners.flatMap((ownerDir) =>
    readdirSync(ownerDir)
      .filter((name) => name.endsWith(".jsonl"))
      .map((name) => join(ownerDir, name)),
  );

  return candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

async function runPiCommand(
  agent: AgentConfig,
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const child = spawn(agent.piCommand, args, {
    cwd: agent.profileDir,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];

  child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  return {
    stdout: Buffer.concat(stdout).toString("utf-8").trim(),
    stderr: Buffer.concat(stderr).toString("utf-8").trim(),
    exitCode,
  };
}

function resolveSessionsDir(agent: AgentConfig): string {
  return agent.sessionsDir ?? join(agent.profileDir, "agent", "sessions");
}

export async function runPi(
  agent: AgentConfig,
  request: PiRequest,
): Promise<{ reply: string; conversationKey: string; sessionId: string }> {
  const conversationKey = buildConversationKey(request.message);
  const promptText = stripBotMentions(request.message.content) || request.message.content;
  const runtimePrompt = buildRuntimePrompt(agent.agentName, request);

  const baseArgs = [
    "--thinking",
    "off",
    "--append-system-prompt",
    agent.sharedPrompt,
    "--append-system-prompt",
    agent.personaPrompt,
    "--append-system-prompt",
    runtimePrompt,
    "-p",
    promptText,
  ];

  const args = request.sessionId ? ["--session", request.sessionId, ...baseArgs] : baseArgs;
  const result = await runPiCommand(agent, args);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || `pi exited with code ${result.exitCode}`);
  }

  const sessionId = request.sessionId ?? findLatestSessionFile(resolveSessionsDir(agent)) ?? conversationKey;

  return {
    reply: result.stdout,
    conversationKey,
    sessionId,
  };
}
