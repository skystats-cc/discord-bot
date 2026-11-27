import { createSkystatsClient } from '@skystats/api-client';
import { config } from './config.js';

// The bot talks to SkyStats only through the generated client from the api-spec repo,
// exactly like any third-party consumer would.
export const api = createSkystatsClient({ baseUrl: config.SKYSTATS_API_URL });

export const accountsEnabled = () => Boolean(config.BOT_API_KEY);

/** Client that acts as this Discord user's linked SkyStats account (internal network only). */
export function userApi(discordUserId: string) {
  return createSkystatsClient({
    baseUrl: config.SKYSTATS_API_URL,
    getHeaders: () => ({ 'x-bot-key': config.BOT_API_KEY, 'x-discord-user-id': discordUserId }),
  });
}

export { SkystatsApiError } from '@skystats/api-client';
export type { BazaarProduct, BazaarSnapshot, HypixelStatus } from '@skystats/api-client';
