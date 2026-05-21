module.exports = {
  apps: [
    {
      name: "discord-cli-agent-bridge",
      script: "./examples/run-discord.sh.example",
      interpreter: "bash",
      cwd: __dirname + "/..",
      env: {
        BRIDGE_AGENT_CONFIG: "./config/examples/agent.example.json",
        BRIDGE_SHARED_CONFIG: "./config/examples/shared.example.json",
        DISCORD_BOT_TOKEN: "<set-me>",
      },
    },
  ],
};
