# Discord CLI Agent Bridge / Discord CLI Agent Bridge

Repository: `https://github.com/seanbc618-tech/Discord-Agent-Generic-Bridge`

A generic Discord bridge for local CLI agents, with the current built-in adapter and examples oriented toward `pi` / `pi-coding-agent`.

## 中文说明

`discord-cli-agent-bridge` 是一个面向本地 CLI Agent 的 Discord 桥接模块。

它负责：
- 接收 Discord 消息
- 执行 mention / home channel / 特殊频道策略
- 将消息路由到本地 agent 子进程
- 维护 Discord 会话到本地 session 的映射
- 提供 typing、reaction、基础日志等交互反馈

当前版本按“通用 Discord bridge”组织，但内置的子进程调用路径优先适配 `pi` / `pi-coding-agent` 风格的本地 agent，因此你可以把它理解成：

- 桥接层是通用的
- 当前自带的 CLI 适配器示例首先支持 `pi`

### 当前能力

- 多 bot / 多 agent 进程模式
- 共享策略配置 + 单 agent 配置
- 可恢复的会话映射
- mention gating / home channel 放开 / 特殊频道策略
- Discord typing 与 reaction 反馈
- HTTP / HTTPS / Gateway 代理支持
- 基于本地命令行 agent 的 subprocess 调用模型

### 当前结构

核心代码：
- `src/index.ts`：Discord client 入口、事件处理、typing / reaction
- `src/config.ts`：配置加载、相对路径解析、配置校验
- `src/pi-client.ts`：当前默认的 `pi` 子进程适配器
- `src/policy.ts`：消息准入策略
- `src/router.ts`：策略 + session + agent 调用编排
- `src/session-store.ts`：Discord conversation -> local session 持久化

示例文件：
- `config/examples/agent.example.json`
- `config/examples/shared.example.json`
- `examples/prompts/SYSTEM.example.md`
- `examples/prompts/DISCORD_RULES.example.md`
- `examples/run-discord.sh.example`
- `examples/ecosystem.config.example.cjs`
- `.env.example`

### 运行前提

你至少需要：
- Node.js 20+
- 一个 Discord bot token
- Discord Developer Portal 中开启 `Message Content Intent`
- 一个本地 CLI agent 命令（当前默认示例基于 `pi`）

### 环境变量

桥启动时至少需要：
- `BRIDGE_AGENT_CONFIG`
- `BRIDGE_SHARED_CONFIG`
- agent config 中指定的 bot token env，例如 `DISCORD_BOT_TOKEN`

可选：
- `HTTP_PROXY`
- `HTTPS_PROXY`
- `ALL_PROXY`
- `DISCORD_REACTIONS=false` 关闭 reaction 反馈

### 配置模型

桥启动读取两类 JSON：

1. 单 agent 配置
- agent 名称
- 工作目录
- agent 命令路径
- persona prompt 路径
- shared prompt 路径
- session map 文件路径
- 可选 sessionsDir
- token env 名称
- 可选 successReaction

2. 共享策略配置
- allowedUserIds
- homeChannelId
- allowBotMessages
- requireMentionOutsideHome
- specialChannels

### 关于 `pi` 适配

当前默认 subprocess 适配器使用：
- `--append-system-prompt`
- `--session`
- `-p`
- `--thinking off`

并假设本地 agent session 可以从类似 `agent/sessions/**/*.jsonl` 的结构中恢复；如果你不用 `pi`，需要替换 `src/pi-client.ts` 或增加新的 adapter。

### 敏感数据注意事项

不要把以下内容提交到公开仓库：
- Discord bot token
- API key
- 真实 Discord 用户 / 频道 / guild ID
- 私有 prompt
- session 文件
- session map 文件
- PM2 或 shell 脚本中的本机绝对路径

推荐做法：
- 只提交 example 文件
- 真正运行的配置放在本地私有目录
- 用 `.env` 或外部 secret 管理 token

### 本地开发

```bash
npm install
npm run build
```

如果你使用 `pi` 作为本地 agent，可以参考 example 配置与脚本接入。

---

## English

`discord-cli-agent-bridge` is a Discord bridge for local CLI agents.

It is responsible for:
- receiving Discord messages
- enforcing mention / home-channel / special-channel policy
- routing accepted turns to a local agent subprocess
- keeping Discord conversation to local session mappings
- providing typing, reactions, and basic runtime logs

This repository is organized as a generic Discord bridge, but the built-in subprocess adapter currently targets `pi` / `pi-coding-agent` style local agents first.

In practice, that means:
- the Discord transport layer is generic
- the default CLI adapter is currently `pi`-oriented

### Current features

- multi-bot / multi-agent process model
- shared policy config + per-agent config
- persistent conversation-to-session mapping
- mention gating / home-channel exceptions / special-channel rules
- Discord typing and reaction feedback
- proxy support for REST and Gateway traffic
- subprocess-based local agent invocation

### Project layout

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

### Requirements

You will need at least:
- Node.js 20+
- a Discord bot token
- `Message Content Intent` enabled in the Discord Developer Portal
- a local CLI agent command (the default example assumes `pi`)

### Required environment variables

At minimum, the bridge expects:
- `BRIDGE_AGENT_CONFIG`
- `BRIDGE_SHARED_CONFIG`
- the bot token env referenced by the agent config, such as `DISCORD_BOT_TOKEN`

Optional:
- `HTTP_PROXY`
- `HTTPS_PROXY`
- `ALL_PROXY`
- `DISCORD_REACTIONS=false` to disable reaction feedback

### Config model

The bridge reads two JSON files at startup:

1. Per-agent config
- agent name
- working directory
- agent command path
- persona prompt path
- shared prompt path
- session map path
- optional sessionsDir
- bot token env name
- optional successReaction

2. Shared policy config
- allowedUserIds
- homeChannelId
- allowBotMessages
- requireMentionOutsideHome
- specialChannels

### About the current `pi` adapter

The built-in subprocess adapter currently uses:
- `--append-system-prompt`
- `--session`
- `-p`
- `--thinking off`

It also assumes a local session layout similar to `agent/sessions/**/*.jsonl`. If you are not using `pi`, you should replace `src/pi-client.ts` or add another adapter layer.

### Sensitive data and publishing safety

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

### Local development

```bash
npm install
npm run build
```

If you use `pi` as your local agent runtime, start from the provided example config and launcher templates.
