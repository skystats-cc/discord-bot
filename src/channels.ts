import { accountsEnabled, userApi } from './api.js';

/** The bot itself (no user). The id only satisfies the header format; it's never a real person. */
export const SYSTEM = userApi('00000000000000000');

/** Channels for a kind of post: the ones in .env plus every server that chose one with /setup. */
export async function channelsFor(kind: 'status' | 'news' | 'board' | 'bazaar', fromEnv: string[]): Promise<string[]> {
  const fromSetup = accountsEnabled()
    ? await SYSTEM.bot
        .guildChannels(kind)
        .then((r) => r.channels.map((c) => c.channelId))
        .catch(() => [] as string[])
    : [];
  return [...new Set([...fromEnv, ...fromSetup])];
}
