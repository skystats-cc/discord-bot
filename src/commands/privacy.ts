import type { PrivacySettings } from '@skystats/api-client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { accountsEnabled } from '../api.js';
import { viewOnSite } from '../links.js';
import { ephemeral, withAccount } from './account.js';
import type { Command } from './types.js';

const LABELS: Record<keyof PrivacySettings, string> = {
  trackingEnabled: 'Record my money history',
  hideBank: 'Hide my coins from my co-op',
  profilePublic: 'Public profile (/profile)',
  showOnLeaderboards: 'Show me on leaderboards',
  allowActivityPings: 'Let my co-op get activity alerts',
  discordPublic: 'Show my Minecraft name on Discord (/whois)',
  showTierRole: 'Show my plan as a role',
  activityInsights: 'Label my sessions by activity',
};

export const privacy: Command = {
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('See or change what SkyStats shares (only you can see this)')
    .addStringOption((o) =>
      o
        .setName('setting')
        .setDescription('Setting to change')
        .addChoices(...Object.entries(LABELS).map(([value, name]) => ({ name, value }))),
    )
    .addBooleanOption((o) => o.setName('on').setDescription('Turn it on (true) or off (false)')),

  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    const setting = interaction.options.getString('setting') as keyof PrivacySettings | null;
    const on = interaction.options.getBoolean('on');

    if (!accountsEnabled()) {
      await interaction.editReply({
        content: 'Everything that shares your data is off until you turn it on. Change it on the website.',
        components: [viewOnSite('/settings', 'privacy', 'Open privacy settings')],
      });
      return;
    }
    if (setting && on === null) {
      await interaction.editReply('Pick `on: true` or `on: false` too.');
      return;
    }
    const s = await withAccount(interaction, (api) => (setting ? api.me.updatePrivacy({ [setting]: on }) : api.me.privacy()));
    if (!s) return;

    const embed = new EmbedBuilder()
      .setColor(0x3ecf8e)
      .setTitle(setting ? 'Saved' : 'Your SkyStats privacy')
      .setDescription(
        (Object.keys(LABELS) as (keyof PrivacySettings)[]).map((k) => `${s[k] ? '🟢' : '⚪'} ${LABELS[k]}`).join('\n'),
      )
      .setFooter({ text: 'Change one with /privacy setting:<name> on:<true|false>. Download or delete your data on the website.' });
    await interaction.editReply({ embeds: [embed], components: [viewOnSite('/settings', 'privacy', 'Open privacy settings')] });
  },
};
