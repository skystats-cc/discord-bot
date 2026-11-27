import { createSkystatsClient } from '@skystats/api-client';
import { config } from './config.js';

// The bot talks to SkyStats only through the generated client from the api-spec repo,
// exactly like any third-party consumer would.
export const api = createSkystatsClient({ baseUrl: config.SKYSTATS_API_URL });

export { SkystatsApiError } from '@skystats/api-client';
export type { BazaarProduct, BazaarSnapshot, HypixelStatus } from '@skystats/api-client';
