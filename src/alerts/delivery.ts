import type { Client } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { accountsEnabled, userApi } from '../api.js';
import { config } from '../config.js';

// Service calls must name some Discord id; this one acts as nobody.
const SYSTEM = userApi('00000000000000000');
const COLORS: Record<string, number> = { outage: 0xe74c3c, patch: 0x3498db, price: 0xf5b942, anomaly: 0xe67e22, manipulation: 0xe74c3c, goal: 0x3ecf8e };

/** DMs players their alerts. The server decides who gets what (opt-in, plan, quiet hours). */
export function startDmDelivery(client: Client) {
  if (!accountsEnabled()) return;
  const tick = async () => {
    try {
      const { notifications } = await SYSTEM.bot.claimNotifications(25);
      for (const n of notifications) {
        let ok = false;
        try {
          const user = await client.users.fetch(n.discordId);
          const embed = new EmbedBuilder()
            .setColor(COLORS[n.kind] ?? 0xf5b942)
            .setTitle(n.title.slice(0, 256))
            .setDescription(n.body.slice(0, 2000))
            .setFooter({ text: 'SkyStats.cc · change alerts at skystats.cc/alerts' });
          if (n.url) embed.setURL(n.url);
          await user.send({ embeds: [embed] });
          ok = true;
        } catch {
          ok = false; // DMs closed or user gone; the alert is still in their inbox on the site
        }
        await SYSTEM.bot.notificationResult(n.id, ok).catch(() => {});
      }
    } catch (err) {
      console.warn('DM delivery failed', err);
    }
  };
  setInterval(() => void tick(), 15_000).unref();
}

/** Free: posts new SkyBlock patch notes to the alert channels once. */
export function startNewsPosts(client: Client) {
  if (!accountsEnabled() || config.STATUS_ALERT_CHANNEL_IDS.length === 0) return;
  const tick = async () => {
    try {
      const { news } = await SYSTEM.bot.unannouncedNews();
      for (const item of news) {
        const embed = new EmbedBuilder().setColor(0x3498db).setTitle(`📰 ${item.title}`.slice(0, 256)).setURL(item.id);
        for (const id of config.STATUS_ALERT_CHANNEL_IDS) {
          const ch = await client.channels.fetch(id).catch(() => null);
          if (ch?.isSendable()) await ch.send({ embeds: [embed] }).catch(() => {});
        }
        await SYSTEM.bot.markAnnounced(item.id);
      }
    } catch (err) {
      console.warn('news posting failed', err);
    }
  };
  void tick();
  setInterval(() => void tick(), 5 * 60_000).unref();
}
