import { EmbedBuilder, SlashCommandBuilder, type AutocompleteInteraction } from 'discord.js';
import { api, SkystatsApiError } from '../api.js';
import { skyblockDate, upcomingEvents } from '../calendar.js';
import { coins, sparkline } from '../format.js';
import { config } from '../config.js';
import { viewOnSite } from '../links.js';
import { withAccount } from './account.js';
import type { Command } from './types.js';

async function itemAutocomplete(interaction: AutocompleteInteraction) {
  const q = interaction.options.getFocused().toLowerCase();
  try {
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
}
const itemOption = (b: SlashCommandBuilder) =>
  b.addStringOption((o) => o.setName('item').setDescription('Bazaar item').setRequired(true).setAutocomplete(true));

/** Free: price history as a text chart */
export const bzHistory: Command = {
  data: itemOption(new SlashCommandBuilder().setName('bz-history').setDescription('Price history for a bazaar item')).addStringOption((o) =>
    o.setName('range').setDescription('How far back').addChoices({ name: '7 days', value: '7' }, { name: '30 days', value: '30' }, { name: '90 days', value: '90' }, { name: '1 year', value: '365' }),
  ) as SlashCommandBuilder,
  autocomplete: itemAutocomplete,
  async execute(interaction) {
    await interaction.deferReply();
    const id = interaction.options.getString('item', true);
    const days = Number(interaction.options.getString('range') ?? '7');
    const [p, h] = await Promise.all([api.bazaar.get(id), api.bazaar.history(id, days)]);
    const prices = h.snapshots.map((s) => s.buyPrice);
    // Downsample to ~40 characters so it fits on one line
    const step = Math.max(1, Math.ceil(prices.length / 40));
    const sampled = prices.filter((_, i) => i % step === 0);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setTitle(`${p.name} · ${days} days`)
      .setDescription(prices.length > 1 ? `\`${sparkline(sampled)}\`` : 'Not enough history yet.')
      .addFields(
        { name: 'Now', value: coins(p.buyPrice), inline: true },
        { name: 'Low', value: prices.length ? coins(lo) : '—', inline: true },
        { name: 'High', value: prices.length ? coins(hi) : '—', inline: true },
      )
      .setImage(`${config.SKYSTATS_PUBLIC_API_URL}/v1/embed/bazaar/${p.id}.svg?days=${Math.min(days, 90)}`);
    await interaction.editReply({ embeds: [embed], components: [viewOnSite(`/bazaar/${p.id}`, 'bz-history')] });
  },
};

/** Pro: flip finder */
export const flip: Command = {
  data: new SlashCommandBuilder()
    .setName('flip')
    .setDescription('Best bazaar flips right now (Pro and Max)')
    .addStringOption((o) => o.setName('budget').setDescription('Coins you can tie up, e.g. 10m')),
  async execute(interaction) {
    await interaction.deferReply();
    const res = await withAccount(interaction, (u) => u.market.flips());
    if (!res) return;
    const budgetRaw = interaction.options.getString('budget');
    const budget = budgetRaw ? Number(budgetRaw.toLowerCase().replace(/,/g, '').replace(/k$/, 'e3').replace(/m$/, 'e6').replace(/b$/, 'e9')) : Infinity;
    const list = res.flips.filter((f) => f.buyAt <= budget).slice(0, 10);
    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setTitle('Top bazaar flips')
      .setDescription(
        list.length
          ? list.map((f, i) => `**${i + 1}. ${f.name}**: buy ${coins(f.buyAt)}, sell ${coins(f.sellAt)}, **+${coins(f.margin)}** each · ${coins(f.hourlyVolume)}/h volume`).join('\n')
          : 'No flips fit that budget right now.',
      )
      .setFooter({ text: `After ${(res.tax * 100).toFixed(2)}% bazaar tax. Your orders still have to fill.` });
    await interaction.editReply({ embeds: [embed], components: [viewOnSite('/bazaar', 'flip', 'Open the flip finder')] });
  },
};

/** Pro: craft or buy */
export const craft: Command = {
  data: itemOption(new SlashCommandBuilder().setName('craft').setDescription('Is it cheaper to craft or buy? (Pro and Max)')),
  autocomplete: itemAutocomplete,
  async execute(interaction) {
    await interaction.deferReply();
    const id = interaction.options.getString('item', true);
    try {
      const c = await withAccount(interaction, (u) => u.market.craft(id));
      if (!c) return;
      const embed = new EmbedBuilder()
        .setColor(0xf5b942)
        .setTitle(c.name)
        .setDescription(`Cheapest: **${c.craft ? 'craft it' : 'buy it'}** for **${coins(c.cost)}**${c.profit !== null ? `\nSelling makes **${coins(c.profit)}** each` : ''}`);
      await interaction.editReply({ embeds: [embed], components: [viewOnSite(`/bazaar/${id}`, 'craft')] });
    } catch (err) {
      if (err instanceof SkystatsApiError && err.status === 404) {
        await interaction.editReply('No recipe for that item.');
        return;
      }
      throw err;
    }
  },
};

/** Free basic / Pro advanced: methods */
export const mmm: Command = {
  data: new SlashCommandBuilder()
    .setName('mmm')
    .setDescription('Money-making methods valued from live prices')
    .addStringOption((o) => o.setName('method').setDescription('A method (leave empty for the top list)').setAutocomplete(true)),
  async autocomplete(interaction) {
    const q = interaction.options.getFocused().toLowerCase();
    const { methods } = await api.methods.list().catch(() => ({ methods: [] }));
    await interaction.respond(methods.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 25).map((m) => ({ name: m.name.slice(0, 100), value: m.id }))).catch(() => {});
  },
  async execute(interaction) {
    await interaction.deferReply();
    const id = interaction.options.getString('method');
    if (!id) {
      const { methods } = await api.methods.list();
      const top = methods.filter((m) => !m.locked && m.value !== null).slice(0, 10);
      const embed = new EmbedBuilder()
        .setColor(0xf5b942)
        .setTitle('Methods right now')
        .setDescription(top.map((m, i) => `**${i + 1}. ${m.name}**: ${coins(m.value)}${m.unit === 'hour' ? '/h' : ' each'}`).join('\n') || 'Nothing yet.')
        .setFooter({ text: 'Per-item and per-hour methods aren’t directly comparable.' });
      await interaction.editReply({ embeds: [embed], components: [viewOnSite('/methods', 'mmm', 'All methods')] });
      return;
    }
    const m = await withAccount(interaction, (u) => u.methods.get(id)).catch(async (err) => {
      if (err instanceof SkystatsApiError && err.status === 403) {
        await interaction.editReply(err.message);
        return null;
      }
      throw err;
    });
    if (!m) return;
    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setTitle(m.name)
      .setDescription(`**${coins(m.value)}** ${m.unit === 'hour' ? 'per hour' : 'each'}\n${m.lines.map((l) => `${l.side === 'in' ? '−' : '+'} ${l.qty} × ${l.name} @ ${coins(l.unitPrice)}`).join('\n')}`)
      .setFooter({ text: m.source.slice(0, 2000) });
    await interaction.editReply({ embeds: [embed], components: [viewOnSite(`/methods/${encodeURIComponent(m.id)}`, 'mmm')] });
  },
};

export const mayor: Command = {
  data: new SlashCommandBuilder().setName('mayor').setDescription('Current SkyBlock mayor and election'),
  async execute(interaction) {
    await interaction.deferReply();
    const e = await api.election();
    const perks = (e.perks as { name?: string }[]).map((p) => p.name).filter(Boolean);
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(e.mayor ? `Mayor ${e.mayor}` : 'Mayor unknown')
      .setDescription(perks.length ? perks.map((p) => `• ${p}`).join('\n') : 'No perk data yet.');
    if (e.open) {
      const names = (e.candidates as { name?: string; votes?: number }[]).map((c) => `• ${c.name}${c.votes ? ` (${c.votes.toLocaleString('en-GB')} votes)` : ''}`);
      embed.addFields({ name: `Election open (Year ${e.year})`, value: names.join('\n') || '—' });
    }
    await interaction.editReply({ embeds: [embed] });
  },
};

export const events: Command = {
  data: new SlashCommandBuilder().setName('events').setDescription('Upcoming SkyBlock events'),
  async execute(interaction) {
    const now = Date.now();
    const d = skyblockDate(now);
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`${d.monthName} ${d.day}, Year ${d.year}`)
      .setDescription(upcomingEvents(now).map((e) => `**${e.name}** <t:${Math.floor(e.start / 1000)}:R>`).join('\n'))
      .setFooter({ text: 'Calculated from the SkyBlock calendar; check in game for changes.' });
    await interaction.reply({ embeds: [embed] });
  },
};
