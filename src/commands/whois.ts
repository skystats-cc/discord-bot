import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { accountsEnabled, SkystatsApiError, userApi } from '../api.js';
import { viewOnSite } from '../links.js';
import type { Command } from './types.js';

export const whois: Command = {
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('The Minecraft account a Discord user chose to show')
    .addUserOption((o) => o.setName('user').setDescription('Discord user').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user', true);
    await interaction.deferReply();
    if (!accountsEnabled()) {
      await interaction.editReply('`/whois` isn’t switched on for this bot yet.');
      return;
    }
    try {
      const { accounts } = await userApi(interaction.user.id).bot.whois(target.id);
      const embed = new EmbedBuilder()
        .setColor(0xf5b942)
        .setTitle(`${target.displayName} on SkyStats`)
        .setDescription(accounts.map((a) => `• **${a.username}**`).join('\n'));
      const first = accounts.find((a) => a.profilePublic);
      await interaction.editReply({ embeds: [embed], components: first ? [viewOnSite(`/p/${encodeURIComponent(first.username)}`, 'whois')] : [] });
    } catch (err) {
      if (err instanceof SkystatsApiError && err.status === 404) {
        // Same reply whether they aren't on SkyStats or chose not to show it
        await interaction.editReply(`${target.displayName} hasn’t shared a Minecraft account on SkyStats.`);
        return;
      }
      throw err;
    }
  },
};
