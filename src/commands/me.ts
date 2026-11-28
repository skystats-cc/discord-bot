import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { coins } from '../format.js';
import { viewOnSite } from '../links.js';
import { ephemeral, withAccount } from './account.js';
import type { Command } from './types.js';

export const me: Command = {
  data: new SlashCommandBuilder().setName('me').setDescription('Your SkyStats summary (only you can see it)'),

  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    const data = await withAccount(interaction, async (api) => {
      const [account, profiles, plan] = await Promise.all([api.me.get(), api.me.profiles(), api.billing.entitlement()]);
      return { account, profiles, plan };
    });
    if (!data) return;
    const { account, profiles, plan } = data;
    const selected = profiles.profiles.find((p) => p.selected) ?? profiles.profiles[0];
    const you = selected?.members.find((m) => m.isYou);

    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setAuthor({ name: account.username, iconURL: `https://mc-heads.net/avatar/${account.uuid}/64` })
      .addFields(
        { name: 'Plan', value: `${plan.tier[0]!.toUpperCase()}${plan.tier.slice(1)} · history ${plan.retentionDays === null ? 'all time' : `${plan.retentionDays} days`}`, inline: true },
        { name: 'Tracking', value: account.trackingEnabled ? 'On' : 'Off', inline: true },
        { name: 'Mod', value: account.modLastSeenAt ? `seen <t:${Math.floor(new Date(account.modLastSeenAt).getTime() / 1000)}:R>` : 'not seen yet', inline: true },
      );
    if (selected) {
      embed.addFields({
        name: `${selected.name ?? 'Profile'}${selected.coop ? ` · co-op of ${selected.members.length}` : ''}`,
        value: `Purse **${coins(you?.purse ?? 0)}**${selected.bank !== null ? ` · bank **${coins(selected.bank)}**` : ''} · SB level **${you?.skyblockLevel ?? '?'}**`,
      });
    }
    await interaction.editReply({ embeds: [embed], components: [viewOnSite('/me', 'me', 'Open your dashboard')] });
  },
};
