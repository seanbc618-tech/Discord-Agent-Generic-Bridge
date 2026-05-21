# Discord CLI Agent Bridge

A generic Discord bridge for local CLI agents.

[English](./README.md) | [中文](./README.zh-CN.md)

Repository: `https://github.com/seanbc618-tech/Discord-Agent-Generic-Bridge`

## First Look

- generic Discord transport for local CLI agents
- built-in `pi` / `pi-coding-agent` oriented adapter
- policy gating, session persistence, typing / reactions, and proxy support

## Install

Run directly with `npx`:

```bash
npx discord-cli-agent-bridge
```

Install from npm:

```bash
npm install discord-cli-agent-bridge
```

Install globally:

```bash
npm install -g discord-cli-agent-bridge
```

From GitHub source:

```bash
git clone https://github.com/seanbc618-tech/Discord-Agent-Generic-Bridge.git
cd Discord-Agent-Generic-Bridge
npm install
npm run build
npm start
```

## Architecture

```text
Discord message
  -> policy gate
  -> router
  -> session store
  -> local CLI agent subprocess
  -> Discord reply / typing / reactions
```

## Overview

`discord-cli-agent-bridge` connects Discord messages to a local CLI agent subprocess.

It is responsible for:

- receiving Discord messages
- enforcing mention / home-channel / special-channel policy
- routing accepted turns to a local agent subprocess
- keeping Discord conversation to local session mappings
- providing typing, reactions, and basic runtime logs

This repository is organized as a generic Discord bridge, while the built-in subprocess adapter currently targets `pi` / `pi-coding-agent` style local agents first.

In practice, that means:

- the Discord transport and policy layers are generic
- the built-in CLI adapter is currently `pi`-oriented

## Quick Start

### 1. Install dependencies

The easiest way to try the bridge once is:

```bash
npx discord-cli-agent-bridge
```

If you want a local dependency:

```bash
npm install discord-cli-agent-bridge
```

If you want a reusable global command:

```bash
npm install -g discord-cli-agent-bridge
```

If you are starting from the GitHub repository:

```bash
npm install
npm run build
```

### 2. Prepare private runtime config

Start from the provided examples and copy them into your own private runtime setup:

- `config/examples/agent.example.json`
- `config/examples/shared.example.json`
- `.env.example`

At minimum, the bridge expects:

- `BRIDGE_AGENT_CONFIG`
- `BRIDGE_SHARED_CONFIG`
- the bot token env referenced by the agent config, such as `DISCORD_BOT_TOKEN`

Optional environment variables:

- `HTTP_PROXY`
- `HTTPS_PROXY`
- `ALL_PROXY`
- `DISCORD_REACTIONS=false` to disable reaction feedback

### 3. Start the bridge

If you installed it globally:

```bash
discord-cli-agent-bridge
```

If you installed it as a local dependency:

```bash
npx discord-cli-agent-bridge
```

From a GitHub checkout:

```bash
npm start
```

If you prefer a wrapper script or PM2 deployment, see:

- `examples/run-discord.sh.example`
- `examples/ecosystem.config.example.cjs`

## Current Features

- multi-bot / multi-agent process model
- shared policy config + per-agent config
- persistent conversation-to-session mapping
- mention gating / home-channel exceptions / special-channel rules
- Discord typing and reaction feedback
- proxy support for REST and Gateway traffic
- subprocess-based local agent invocation

## Project Layout

Core code:

- `src/index.ts`: Discord client entrypoint, event handling, typing / reactions
- `src/config.ts`: config loading, relative path resolution, validation
- `src/pi-client.ts`: current default `pi` subprocess adapter
- `src/policy.ts`: message admission policy
- `src/router.ts`: policy + session + agent orchestration
- `src/session-store.ts`: persistent Discord conversation -> local session map

Examples:

- `config/examples/agent.example.json`
- `config/examples/shared.example.json`
- `examples/prompts/SYSTEM.example.md`
- `examples/prompts/DISCORD_RULES.example.md`
- `examples/run-discord.sh.example`
- `examples/ecosystem.config.example.cjs`
- `.env.example`

## Requirements

You will need at least:

- Node.js 20+
- a Discord bot token
- `Message Content Intent` enabled in the Discord Developer Portal
- a local CLI agent command
- a Discord server/channel setup where the bot can read and reply

## Config Model

The bridge reads two JSON files at startup.

### 1. Per-agent config

This describes how one local agent should be launched and usually includes:

- agent name
- working directory
- agent command path
- persona prompt path
- shared prompt path
- session map path
- optional `sessionsDir`
- bot token env name
- optional success reaction

### 2. Shared policy config

This describes Discord-side routing and admission policy, usually including:

- `allowedUserIds`
- `homeChannelId`
- `allowBotMessages`
- `requireMentionOutsideHome`
- `specialChannels`

For exact keys, see the example JSON files:

- `config/examples/agent.example.json`
- `config/examples/shared.example.json`

## About the Current `pi` Adapter

The built-in subprocess adapter currently uses a `pi`-style contract, including:

- `--append-system-prompt`
- `--session`
- `-p`
- `--thinking off`

It also assumes a local session layout similar to `agent/sessions/**/*.jsonl` unless `sessionsDir` is configured.

If you are not using `pi`, you should either:

- replace `src/pi-client.ts`
- or add your own adapter layer

## Sensitive Data and Publishing Safety

Do not commit the following to a public repository:

- Discord bot tokens
- API keys
- real Discord user / channel / guild IDs
- private prompts
- session files
- session map files
- machine-specific absolute paths in PM2 or shell scripts

Recommended practice:

- commit example files only
- keep live runtime config in private local paths
- store tokens in `.env` or an external secret manager
- gitignore runtime state files

## Local Development

```bash
npm install
npm run build
```

If you use `pi` as your local agent runtime, start from the included example config and launcher templates.

## Chinese Documentation

See [README.zh-CN.md](./README.zh-CN.md).
