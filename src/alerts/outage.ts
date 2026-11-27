import type { Client } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { api, type HypixelStatus } from '../api.js';
import { config } from '../config.js';
import { siteUrl } from '../links.js';

/** True when SkyBlock itself is affected, or the whole network has a major incident. */
export function skyblockDown(s: HypixelStatus): boolean {
  const sb = s.components.find((c) => /skyblock/i.test(c.name));
  return (sb ? sb.status !== 'operational' : false) || s.indicator === 'major' || s.indicator === 'critical';
}

/**
 * Free for everyone: posts to the configured channels when SkyBlock goes down or recovers.
 * Only reacts to changes, so it never spams.
 */
export function startOutageAlerts(client: Client) {
  if (config.STATUS_ALERT_CHANNEL_IDS.length === 0) return;
  let wasDown: boolean | null = null;

  const tick = async () => {
    try {
      const s = await api.status();
      if (s.indicator === 'unknown') return;
      const down = skyblockDown(s);
      if (wasDown !== null && down !== wasDown) await post(client, s, down);
      wasDown = down;
    } catch (err) {
      console.warn('outage check failed', err);
    }
  };
  void tick();
  setInterval(() => void tick(), 60_000).unref();
}

async function post(client: Client, s: HypixelStatus, down: boolean) {
  const embed = new EmbedBuilder()
    .setColor(down ? 0xe74c3c : 0x2ecc71)
    .setTitle(down ? '🔴 SkyBlock is having problems' : '🟢 SkyBlock is back')
    .setDescription(s.incidents[0]?.name ?? s.description)
    .setURL(siteUrl('/', 'outage-alert'))
    .setTimestamp();
  for (const id of config.STATUS_ALERT_CHANNEL_IDS) {
    const ch = await client.channels.fetch(id).catch(() => null);
    if (ch?.isSendable()) await ch.send({ embeds: [embed] }).catch((err) => console.warn('outage post failed', err));
  }
}
