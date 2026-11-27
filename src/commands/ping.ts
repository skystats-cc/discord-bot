import { SlashCommandBuilder } from 'discord.js';
import { api } from '../api.js';
import type { Command } from './types.js';

export const ping: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check the bot and the SkyStats API'),

  async execute(interaction) {
    const started = Date.now();
    let apiLine = '🔴 unreachable';
    try {
      await api.health();
      apiLine = `🟢 ${Date.now() - started}ms`;
    } catch {
      // leave as unreachable
    }
    await interaction.reply(`🏓 Pong!\nDiscord: ${interaction.client.ws.ping}ms\nSkyStats API: ${apiLine}`);
  },
};
