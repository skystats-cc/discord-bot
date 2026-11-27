import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { SkystatsApiError } from '../api.js';
import { ephemeral, withAccount } from './account.js';
import type { Command } from './types.js';

export const subscribe: Command = {
  data: new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Get a checkout link for a SkyStats plan (only you can see it)')
    .addStringOption((o) =>
      o
        .setName('plan')
        .setDescription('Plan')
        .setRequired(true)
        .addChoices({ name: 'Pro · £4.99 a month', value: 'pro' }, { name: 'Max · £12.99 a month', value: 'max' }),
    ),

  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    const tier = interaction.options.getString('plan', true) as 'pro' | 'max';
    let result: { url: string } | null;
    try {
      result = await withAccount(interaction, (api) => api.billing.checkout(tier));
    } catch (err) {
      if (err instanceof SkystatsApiError && err.code === 'already_subscribed') {
        await interaction.editReply('You already have a plan. Change or cancel it on skystats.cc/billing.');
        return;
      }
      throw err;
    }
    if (!result) return;
    // Plain facts, no pressure: many players are under 18
    await interaction.editReply({
      content: [
        `**${tier === 'pro' ? 'Pro' : 'Max'}**: ${tier === 'pro' ? '£4.99' : '£12.99'} a month including VAT, renews monthly until you cancel.`,
        'Cancel any time on skystats.cc/billing, and within 14 days for a full refund. If you’re under 18, ask a parent or carer first.',
      ].join('\n'),
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Open checkout').setURL(result.url))],
    });
  },
};
