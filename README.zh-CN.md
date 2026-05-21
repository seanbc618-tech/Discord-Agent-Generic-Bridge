# Discord CLI Agent Bridge

面向本地 CLI Agent 的通用 Discord 桥接模块。

[English](./README.md) | [中文](./README.zh-CN.md)

Repository: `https://github.com/seanbc618-tech/Discord-Agent-Generic-Bridge`

## 中文说明

### 它是什么

`discord-cli-agent-bridge` 用来把 Discord 消息桥接到本地 CLI Agent 子进程。

它负责：

- 接收 Discord 消息
- 执行 mention / home channel / 特殊频道策略
- 将消息路由到本地 agent 子进程
- 维护 Discord 会话到本地 session 的映射
- 提供 typing、reaction、基础日志等交互反馈

当前版本的定位是：

- Discord 传输层与策略层是通用的
- 当前内置的 subprocess adapter 优先支持 `pi` / `pi-coding-agent`

## 快速开始

### 1. 安装依赖

```bash
npm install
npm run build
```

### 2. 准备私有运行配置

从 example 文件开始复制并填写你自己的私有配置：

- `config/examples/agent.example.json`
- `config/examples/shared.example.json`
- `.env.example`

桥启动时至少需要这些环境变量：

- `BRIDGE_AGENT_CONFIG`
- `BRIDGE_SHARED_CONFIG`
- agent config 中指定的 bot token env，例如 `DISCORD_BOT_TOKEN`

可选环境变量：

- `HTTP_PROXY`
- `HTTPS_PROXY`
- `ALL_PROXY`
- `DISCORD_REACTIONS=false` 用于关闭 reaction 反馈

### 3. 启动

```bash
node dist/index.js
```

如果你喜欢用 shell wrapper 或 PM2，可以直接参考：

- `examples/run-discord.sh.example`
- `examples/ecosystem.config.example.cjs`

## 当前能力

- 多 bot / 多 agent 进程模式
- 共享策略配置 + 单 agent 配置
- 可恢复的会话映射
- mention gating / home channel 放开 / 特殊频道策略
- Discord typing 与 reaction 反馈
- HTTP / HTTPS / Gateway 代理支持
- 基于本地命令行 agent 的 subprocess 调用模型

## 项目结构

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

## 运行前提

你至少需要：

- Node.js 20+
- 一个 Discord bot token
- 在 Discord Developer Portal 中开启 `Message Content Intent`
- 一个本地 CLI agent 命令
- 一个可供 bot 读取和发消息的 Discord 频道环境

## 配置模型

桥启动时读取两类 JSON。

### 1. 单 agent 配置

用于描述某一个本地 agent 的运行方式，通常包括：

- agent 名称
- 工作目录
- agent 命令路径
- persona prompt 路径
- shared prompt 路径
- session map 文件路径
- 可选 `sessionsDir`
- token env 名称
- 可选 success reaction

### 2. 共享策略配置

用于描述 Discord 侧的消息准入与频道规则，通常包括：

- `allowedUserIds`
- `homeChannelId`
- `allowBotMessages`
- `requireMentionOutsideHome`
- `specialChannels`

精确字段请以 example JSON 为准：

- `config/examples/agent.example.json`
- `config/examples/shared.example.json`

## 关于当前的 `pi` 适配

当前内置 subprocess adapter 使用的是 `pi` 风格调用方式，主要依赖这些参数：

- `--append-system-prompt`
- `--session`
- `-p`
- `--thinking off`

它还默认假设本地 session 布局类似 `agent/sessions/**/*.jsonl`，除非显式配置 `sessionsDir`。

如果你不是用 `pi`，可以：

- 替换 `src/pi-client.ts`
- 或新增你自己的 adapter 层

## 敏感数据与开源发布注意事项

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
- 真实运行配置放在本地私有目录
- 使用 `.env` 或外部 secret 管理 token
- 把运行期状态文件加入 `.gitignore`

## 本地开发

```bash
npm install
npm run build
```

如果你使用 `pi` 作为本地 agent runtime，可以从现有 example 配置和脚本模板直接开始接入。
