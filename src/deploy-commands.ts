import { REST, Routes } from 'discord.js';
import { commands, contextMenus } from './commands/index.js';
import { config } from './config.js';

// Registers slash commands with Discord. Run after adding or changing a command.
const rest = new REST().setToken(config.DISCORD_TOKEN);
const body = [...commands.map((c) => c.data.toJSON()), ...contextMenus.map((c) => c.data.toJSON())];

const route = config.DISCORD_GUILD_ID
  ? Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID)
  : Routes.applicationCommands(config.DISCORD_CLIENT_ID);

await rest.put(route, { body });
console.log(
  `Deployed ${body.length} commands ${config.DISCORD_GUILD_ID ? `to guild ${config.DISCORD_GUILD_ID}` : 'globally'}`,
);
