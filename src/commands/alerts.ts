import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { api, userApi } from '../api.js';
import { coins, parseCoins } from '../format.js';
import { viewOnSite } from '../links.js';
import { ephemeral, withAccount } from './account.js';
import type { Command } from './types.js';

const KINDS = { price: 'Price', anomaly: 'Unusual move', manipulation: 'Possible manipulation' } as const;

export const alerts: Command = {
  data: new SlashCommandBuilder()
    .setName('alerts')
    .setDescription('Bazaar alerts (Pro and Max)')
    .addSubcommand((s) => s.setName('list').setDescription('Your alerts'))
    .addSubcommand((s) =>
      s
        .setName('price')
        .setDescription('Alert when an item crosses a price')
        .addStringOption((o) => o.setName('item').setDescription('Item').setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName('when').setDescription('Direction').setRequired(true).addChoices({ name: 'goes above', value: 'above' }, { name: 'goes below', value: 'below' }))
        .addStringOption((o) => o.setName('coins').setDescription('Price, e.g. 1.5m').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('unusual')
        .setDescription('Alert on unusual price moves or possible manipulation')
        .addStringOption((o) => o.setName('item').setDescription('Item').setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName('type').setDescription('What to watch').addChoices({ name: 'Unusual moves', value: 'anomaly' }, { name: 'Possible manipulation', value: 'manipulation' })),
    )
    .addSubcommand((s) =>
      s.setName('remove').setDescription('Delete an alert').addStringOption((o) => o.setName('id').setDescription('Alert (from /alerts list)').setRequired(true).setAutocomplete(true)),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    try {
      if (focused.name === 'id') {
        const list = await withAccountless(interaction.user.id);
        await interaction.respond(list.map((r) => ({ name: `${r.productId} · ${KINDS[r.kind]}${r.op ? ` ${r.op} ${coins(r.threshold ?? 0)}` : ''}`.slice(0, 100), value: r.id })).slice(0, 25));
        return;
      }
      const q = focused.value.toLowerCase();
      const { products } = await api.bazaar.list();
      await interaction.respond(
        products
          .filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
          .sort((a, b) => b.buyMovingWeek - a.buyMovingWeek)
          .slice(0, 25)
          .map((p) => ({ name: p.name.slice(0, 100), value: p.id })),
      );
    } catch {
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    const sub = interaction.options.getSubcommand();
    const done = await withAccount(interaction, async (u) => {
      if (sub === 'price') {
        const threshold = parseCoins(interaction.options.getString('coins', true));
        if (!threshold) return 'That isn’t a price. Try something like `1.5m` or `20000`.';
        const r = await u.alerts.create({
          kind: 'price',
          productId: interaction.options.getString('item', true),
          op: interaction.options.getString('when', true) as 'above' | 'below',
          threshold,
          side: 'buy',
          cooldownMinutes: 60,
        });
        return `Alert set: **${r.productId}** ${r.op} **${coins(threshold)}**.`;
      }
      if (sub === 'unusual') {
        const kind = (interaction.options.getString('type') ?? 'anomaly') as 'anomaly' | 'manipulation';
        const r = await u.alerts.create({ kind, productId: interaction.options.getString('item', true), side: 'buy', cooldownMinutes: 60 });
        return `Alert set: **${r.productId}** · ${KINDS[kind]}.`;
      }
      if (sub === 'remove') {
        await u.alerts.remove(interaction.options.getString('id', true));
        return 'Alert deleted.';
      }
      const { alerts: list } = await u.alerts.list();
      return new EmbedBuilder()
        .setColor(0xf5b942)
        .setTitle('Your alerts')
        .setDescription(list.length ? list.map((r) => `• **${r.productId}** · ${KINDS[r.kind]}${r.op ? ` ${r.op} ${coins(r.threshold ?? 0)}` : ''}`).join('\n') : 'None yet.');
    });
    if (done === null) return;
    await interaction.editReply(
      typeof done === 'string' ? { content: done, components: [viewOnSite('/alerts', 'alerts', 'Manage alerts')] } : { embeds: [done], components: [viewOnSite('/alerts', 'alerts', 'Manage alerts')] },
    );
  },
};

async function withAccountless(discordId: string) {
  return (await userApi(discordId).alerts.list()).alerts;
}
