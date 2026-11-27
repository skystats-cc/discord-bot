import type { Client, Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { api } from '../api.js';
import { config } from '../config.js';
import { siteUrl } from '../links.js';

const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;

/** One message in LIVE_BAZAAR_CHANNEL_ID that edits itself every 5 minutes with the top movers. */
export function startLiveBazaar(client: Client) {
  if (!config.LIVE_BAZAAR_CHANNEL_ID) return;
  let message: Message | null = null;

  const tick = async () => {
    try {
      const ch = await client.channels.fetch(config.LIVE_BAZAAR_CHANNEL_ID);
      if (!ch?.isSendable() || !('messages' in ch)) return;
      const [m, products] = await Promise.all([api.market.movers('24h'), api.bazaar.list()]);
      const names = new Map(products.products.map((p) => [p.id, p.name]));
      const line = (r: { productId: string; now: number; change: number }) => `**${names.get(r.productId) ?? r.productId}** ${pct(r.change)}`;
      const embed = new EmbedBuilder()
        .setColor(0xf5b942)
        .setTitle('Bazaar: biggest moves in 24h')
        .setURL(siteUrl('/bazaar', 'live-bazaar'))
        .addFields({ name: 'Up', value: m.gainers.slice(0, 8).map(line).join('\n') || '—', inline: true }, { name: 'Down', value: m.losers.slice(0, 8).map(line).join('\n') || '—', inline: true })
        .setFooter({ text: 'Updates every 5 minutes' })
        .setTimestamp();
      if (!message) {
        // Reuse our last message after a restart instead of posting a new one
        const recent = await ch.messages.fetch({ limit: 20 });
        message = recent.find((x) => x.author.id === client.user?.id && x.embeds[0]?.title?.startsWith('Bazaar: biggest')) ?? null;
      }
      if (message) await message.edit({ embeds: [embed] });
      else message = await ch.send({ embeds: [embed] });
    } catch (err) {
      console.warn('live bazaar update failed', err);
      message = null;
    }
  };
  void tick();
  setInterval(() => void tick(), 5 * 60_000).unref();
}
