import type { Client } from 'discord.js';
import { accountsEnabled, userApi } from '../api.js';
import { config } from '../config.js';
import { diffRoles, rolesFor, type Wanted } from './plan.js';

const EVERY_MS = 10 * 60_000;
// The role-sync endpoint needs some Discord id in the header; it doesn't act as anyone.
const SYSTEM_ID = '00000000000000000';

export const roleSyncEnabled = () =>
  Boolean(accountsEnabled() && config.ROLE_SYNC_GUILD_ID && (config.LINKED_ROLE_ID || config.PRO_ROLE_ID || config.MAX_ROLE_ID));

/** Keeps the linked / Pro / Max roles in the SkyStats server in step with members' opt-ins. */
export function startRoleSync(client: Client) {
  if (!roleSyncEnabled()) return;
  const ids = { linked: config.LINKED_ROLE_ID, pro: config.PRO_ROLE_ID, max: config.MAX_ROLE_ID };

  const run = async () => {
    try {
      const guild = await client.guilds.fetch(config.ROLE_SYNC_GUILD_ID);
      const { members: wanted } = await userApi(SYSTEM_ID).bot.roleSync();
      const byId = new Map<string, Wanted>(wanted.map((w) => [w.discordId, w as Wanted]));
      const members = await guild.members.fetch();
      let changed = 0;
      for (const m of members.values()) {
        const { add, remove } = diffRoles(m.roles.cache.keys(), rolesFor(byId.get(m.id), ids), ids);
        if (add.length) await m.roles.add(add, 'SkyStats role sync');
        if (remove.length) await m.roles.remove(remove, 'SkyStats role sync');
        if (add.length || remove.length) changed++;
      }
      if (changed) console.log(`role sync: updated ${changed} members`);
    } catch (err) {
      console.warn('role sync failed', err);
    }
  };
  void run();
  setInterval(() => void run(), EVERY_MS).unref();
}
