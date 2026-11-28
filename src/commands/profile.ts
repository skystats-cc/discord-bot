import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { api, SkystatsApiError } from '../api.js';
import { coins, sparkline } from '../format.js';
import { viewOnSite } from '../links.js';
import type { Command } from './types.js';

const MODES: Record<string, string> = { ironman: '♲ Ironman', island: '☀ Stranded', bingo: 'Ⓑ Bingo' };

export const profile: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription("A player's public SkyStats summary")
    .addStringOption((o) =>
      o.setName('player').setDescription('Minecraft username').setRequired(true).setMinLength(1).setMaxLength(16),
    ),

  async execute(interaction) {
    const name = interaction.options.getString('player', true).trim();
    if (!/^[A-Za-z0-9_]{1,16}$/.test(name)) {
      await interaction.reply({ content: 'That isn’t a valid Minecraft username.', flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply();

    let p;
    try {
      p = await api.players.get(name);
    } catch (err) {
      if (err instanceof SkystatsApiError && err.status === 404) {
        // Same answer whether the player exists or not, so the bot can't be used to probe who is on SkyStats
        await interaction.editReply(`**${name}** doesn’t have a public SkyStats profile. Profiles are private unless the player shares theirs.`);
        return;
      }
      throw err;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setAuthor({ name: p.username, iconURL: `https://mc-heads.net/avatar/${p.uuid}/64` })
      .setDescription(p.usesMod ? 'Uses the SkyStats mod' : 'On SkyStats')
      .setFooter({ text: 'SkyStats.cc · coins recorded by the SkyStats mod' });

    for (const pr of p.profiles.slice(0, 6)) {
      const lines = [`SkyBlock level **${pr.skyblockLevel ?? '?'}**`];
      if (pr.total !== null) {
        const week = pr.week.map((w) => w.total).filter((v): v is number => v !== null);
        lines.push(`Coins **${coins(pr.total)}**`);
        if (week.length > 1) lines.push(`7 days \`${sparkline(week)}\``);
      }
      embed.addFields({
        name: `${pr.selected ? '⭐ ' : ''}${pr.name ?? 'Profile'}${MODES[pr.gameMode] ? ` · ${MODES[pr.gameMode]}` : ''}`,
        value: lines.join('\n'),
        inline: true,
      });
    }
    if (p.profiles.length === 0) embed.addFields({ name: 'Profiles', value: 'None shared yet' });

    await interaction.editReply({ embeds: [embed], components: [viewOnSite(`/p/${encodeURIComponent(p.username)}`, 'profile')] });
  },
};
