import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { viewOnSite } from '../links.js';
import type { Command } from './types.js';

export const privacy: Command = {
  data: new SlashCommandBuilder().setName('privacy').setDescription('What SkyStats shares, and how to change it'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x3ecf8e)
      .setTitle('Your SkyStats privacy')
      .setDescription(
        [
          'Everything that shares your data is **off** until you turn it on:',
          '• public profile (what `/profile` shows)',
          '• leaderboards',
          '• co-op activity alerts',
          '• showing your coins to your co-op',
          '',
          'You can also stop money tracking, download your data or delete your account at any time.',
        ].join('\n'),
      );
    await interaction.reply({
      embeds: [embed],
      components: [viewOnSite('/settings', 'privacy', 'Open privacy settings')],
      flags: MessageFlags.Ephemeral,
    });
  },
};
