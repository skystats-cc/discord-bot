import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { api } from '../api.js';
import { viewOnSite } from '../links.js';
import type { Command } from './types.js';

const look: Record<string, { emoji: string; color: number }> = {
  none: { emoji: '🟢', color: 0x2ecc71 },
  minor: { emoji: '🟡', color: 0xf1c40f },
  major: { emoji: '🟠', color: 0xe67e22 },
  critical: { emoji: '🔴', color: 0xe74c3c },
  unknown: { emoji: '⚪', color: 0x95a5a6 },
};

export const status: Command = {
  data: new SlashCommandBuilder().setName('status').setDescription('Is Hypixel / SkyBlock up?'),

  async execute(interaction) {
    await interaction.deferReply();
    const s = await api.status();
    const { emoji, color } = look[s.indicator] ?? look.unknown!;

    const down = s.components.filter((c) => c.status !== 'operational');
    const skyblock = s.components.find((c) => /skyblock/i.test(c.name));

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} ${s.description}`)
      .setURL('https://status.hypixel.net')
      .addFields(
        {
          name: 'SkyBlock',
          value: skyblock ? `${skyblock.status === 'operational' ? '🟢' : '🔴'} ${skyblock.status.replace(/_/g, ' ')}` : 'n/a',
          inline: true,
        },
        {
          name: 'Components',
          value: `${s.components.length - down.length}/${s.components.length} operational`,
          inline: true,
        },
      );

    if (down.length) {
      embed.addFields({
        name: 'Having issues',
        value: down.slice(0, 15).map((c) => `• ${c.name}: ${c.status.replace(/_/g, ' ')}`).join('\n'),
      });
    }
    if (s.incidents.length) {
      embed.addFields({
        name: 'Incidents',
        value: s.incidents
          .slice(0, 5)
          .map((i) => (i.url ? `• [${i.name}](${i.url}) (${i.status})` : `• ${i.name} (${i.status})`))
          .join('\n'),
      });
    }
    if (s.checkedAt) embed.setFooter({ text: 'Checked' }).setTimestamp(new Date(s.checkedAt));

    await interaction.editReply({ embeds: [embed], components: [viewOnSite('/', 'status')] });
  },
};
