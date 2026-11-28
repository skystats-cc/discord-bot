import { ActivityType, type Client } from 'discord.js';
import { api } from './api.js';
import { presenceLines } from './presenceLines.js';

export function startPresence(client: Client<true>) {
  let i = 0;
  const tick = async () => {
    const s = await api.status().catch(() => null);
    const up = s && s.indicator !== 'unknown' ? !(s.indicator === 'major' || s.indicator === 'critical') : null;
    const lines = presenceLines({ servers: client.guilds.cache.size, skyblockUp: up });
    client.user.setActivity(lines[i++ % lines.length]!, { type: ActivityType.Custom });
  };
  void tick();
  setInterval(() => void tick(), 60_000).unref();
}
