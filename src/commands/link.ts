import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { accountsEnabled, userApi } from '../api.js';
import { ephemeral } from './account.js';
import type { Command } from './types.js';

const POLL_MS = 3000;

export const link: Command = {
  data: new SlashCommandBuilder().setName('link').setDescription('Link your Minecraft account to SkyStats and this Discord'),

  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    if (!accountsEnabled()) {
      await interaction.editReply('Linking from Discord isn’t switched on yet. Use skystats.cc/link instead.');
      return;
    }
    const api = userApi(interaction.user.id);
    const p = await api.bot.startPairing(interaction.user.username);
    const expires = Math.floor(new Date(p.expiresAt).getTime() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Link Minecraft')
      .setDescription(
        [
          '1. Launch Minecraft with the SkyStats mod.',
          `2. Paste this into chat: \`${p.command}\``,
          '3. Click **[Confirm]** in the message that appears.',
          '',
          `This code expires <t:${expires}:R>. Only run codes you got yourself.`,
        ].join('\n'),
      );
    await interaction.editReply({ embeds: [embed] });

    // Wait for the player to confirm in game (Discord lets us edit the reply for 15 minutes)
    while (Date.now() < expires * 1000) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const s = await api.bot.pairingStatus(p.id).catch(() => null);
      if (!s || s.status === 'pending') continue;
      if (s.status === 'expired') break;
      const text = s.discordLinked
        ? `✅ Linked as **${s.username}**. Your Discord is connected too, so \`/me\` works now.`
        : `✅ Linked as **${s.username}**, but this Discord is already connected to another Minecraft account. Connecting more than one needs Pro or Max.`;
      await interaction.editReply({ embeds: [embed.setColor(0x3ecf8e).setDescription(text)] });
      return;
    }
    await interaction.editReply({ embeds: [embed.setColor(0x95a5a6).setDescription('That code expired. Run `/link` again.')] });
  },
};
