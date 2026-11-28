import type { Client } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { userApi } from '../api.js';
import { channelsFor } from '../channels.js';
import { config } from '../config.js';
import { coins } from '../format.js';

/** Every Sunday 18:00 UTC: post each server's weekly board to its board channel (.env or /setup; opt-in players only) */
export function startServerBoards(client: Client) {
  // Needs the Server Members intent to list members
  if (!config.MEMBERS_INTENT && config.SERVER_LEADERBOARD_CHANNEL_IDS.length === 0) return;
  let lastPosted = '';
  const tick = async () => {
    const now = new Date();
    const key = now.toISOString().slice(0, 10);
    if (now.getUTCDay() !== 0 || now.getUTCHours() !== 18 || lastPosted === key) return;
    lastPosted = key;
    for (const id of await channelsFor('board', config.SERVER_LEADERBOARD_CHANNEL_IDS)) {
      try {
        const ch = await client.channels.fetch(id);
        if (!ch?.isSendable() || !('guild' in ch) || !ch.guild) continue;
        const members = await ch.guild.members.fetch();
        const { entries } = await userApi('00000000000000000').bot.serverLeaderboard([...members.keys()], 'gain', '7d');
        const embed = new EmbedBuilder()
          .setColor(0xf5b942)
          .setTitle(`${ch.guild.name}: top grinders this week`)
          .setDescription(entries.length ? entries.slice(0, 10).map((e) => `**${e.rank}.** ${e.label} · +${coins(e.value)}`).join('\n') : 'Nobody yet. Turn on leaderboards with /privacy to appear.')
          .setFooter({ text: 'Only players who chose to appear are listed.' });
        await ch.send({ embeds: [embed] });
      } catch (err) {
        console.warn('server leaderboard post failed', err);
      }
    }
  };
  setInterval(() => void tick(), 5 * 60_000).unref();
}
