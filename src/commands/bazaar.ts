import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { api, ApiError, type BazaarProduct } from '../api.js';
import { coins, percent } from '../format.js';
import type { Command } from './types.js';

// Cache the product list for autocomplete (Discord gives us 3s to answer).
let cache: { at: number; products: BazaarProduct[] } | null = null;
async function products() {
  if (!cache || Date.now() - cache.at > 60_000) {
    cache = { at: Date.now(), products: (await api.bazaarList()).products };
  }
  return cache.products;
}

export const bazaar: Command = {
  data: new SlashCommandBuilder()
    .setName('bazaar')
    .setDescription('Live bazaar prices for an item')
    .addStringOption((o) =>
      o.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const q = interaction.options.getFocused().toLowerCase();
    try {
      const matches = (await products())
        .filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
        .sort((a, b) => b.buyMovingWeek - a.buyMovingWeek) // most traded first
        .slice(0, 25)
        .map((p) => ({ name: p.name.slice(0, 100), value: p.id }));
      await interaction.respond(matches);
    } catch {
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const input = interaction.options.getString('item', true);
    await interaction.deferReply();

    // Accept either an id from autocomplete or free text
    let product: BazaarProduct;
    try {
      product = await api.bazaarProduct(input.trim().replace(/\s+/g, '_'));
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) throw err;
      const { products: found } = await api.bazaarList(input);
      if (!found[0]) {
        await interaction.editReply(`Couldn't find a bazaar item matching **${input}**.`);
        return;
      }
      product = found[0];
    }

    const { snapshots } = await api.bazaarHistory(product.id, 7).catch(() => ({ snapshots: [] }));
    const oldest = snapshots[0];
    const change = oldest ? percent(oldest.buyPrice, product.buyPrice) : 'not enough data yet';

    const embed = new EmbedBuilder()
      .setColor(0xf5a623)
      .setTitle(product.name)
      .addFields(
        { name: 'Instabuy', value: `${coins(product.buyPrice)} coins`, inline: true },
        { name: 'Instasell', value: `${coins(product.sellPrice)} coins`, inline: true },
        { name: 'Margin', value: `${coins(product.margin)} coins`, inline: true },
        { name: 'Bought / week', value: coins(product.buyMovingWeek), inline: true },
        { name: 'Sold / week', value: coins(product.sellMovingWeek), inline: true },
        { name: '7d change (buy)', value: change, inline: true },
        { name: 'Orders', value: `${product.buyOrders} sell offers · ${product.sellOrders} buy orders` },
      )
      .setFooter({ text: `${product.id} · SkyStats.cc` })
      .setTimestamp(new Date(product.updatedAt));

    await interaction.editReply({ embeds: [embed] });
  },
};
