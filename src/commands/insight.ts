import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { coins } from '../format.js';
import { viewOnSite } from '../links.js';
import { ephemeral, withAccount } from './account.js';
import type { Command } from './types.js';

/** Your last play session (from the mod). Only you see it. */
export const session: Command = {
  data: new SlashCommandBuilder().setName('session').setDescription('Your last play session (only you can see it)'),
  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    const res = await withAccount(interaction, (u) => u.insight.sessions(7));
    if (!res) return;
    const s = res.sessions[0];
    if (!s) {
      await interaction.editReply('No sessions yet. They appear once the SkyStats mod has seen you play.');
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setTitle('Your last session')
      .addFields(
        { name: 'Started', value: `<t:${Math.floor(new Date(s.startedAt).getTime() / 1000)}:R>`, inline: true },
        { name: 'Length', value: `${s.minutes} min`, inline: true },
        { name: 'Coins', value: s.coins === null ? '—' : `${s.coins >= 0 ? '+' : ''}${coins(s.coins)}`, inline: true },
        { name: 'Per hour', value: s.coinsPerHour === null ? '—' : coins(s.coinsPerHour), inline: true },
      );
    if (s.activity) embed.addFields({ name: 'Activity', value: s.activity, inline: true });
    await interaction.editReply({ embeds: [embed], components: [viewOnSite('/me', 'session', 'Open your dashboard')] });
  },
};

/** Your co-op: members and their SkyStats state, plus gains for members who share them */
export const coop: Command = {
  data: new SlashCommandBuilder().setName('coop').setDescription('Your co-op on SkyStats (only you can see it)'),
  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    const res = await withAccount(interaction, async (u) => {
      const { profiles } = await u.me.profiles();
      const p = profiles.find((x) => x.selected && x.coop) ?? profiles.find((x) => x.coop);
      return p ? { p, view: await u.insight.coop(p.id, 7) } : null;
    });
    if (res === null) {
      if (!interaction.replied) await interaction.editReply('You’re not in a co-op, or your profiles haven’t loaded yet. Open skystats.cc/me once.').catch(() => {});
      return;
    }
    const { p, view } = res;
    const state = (m: (typeof view.members)[number]) =>
      !m.onSkyStats ? 'not on SkyStats' : m.sharing ? `${m.gain === null ? '' : `${m.gain >= 0 ? '+' : ''}${coins(m.gain)} this week`}` : 'keeps coins private';
    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setTitle(`${p.name ?? 'Co-op'} · ${view.members.filter((m) => m.active).length} members`)
      .setDescription(
        view.members
          .filter((m) => m.active)
          .map((m) => `${m.online ? '🟢' : '⚪'} **${m.username ?? '?'}**${m.isYou ? ' (you)' : ''}: ${state(m)}`)
          .join('\n'),
      );
    await interaction.editReply({ embeds: [embed], components: [viewOnSite(`/coop/${p.id}`, 'coop', 'Open the co-op page')] });
  },
};
