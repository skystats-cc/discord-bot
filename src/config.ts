import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().optional().transform((v) => v || undefined),
  SKYSTATS_API_URL: z.string().url().default('http://localhost:3000'),
  SKYSTATS_WEB_URL: z.string().url().default('https://skystats.cc'),
  // Lets the bot act for linked Discord users (internal network only). Empty = account commands off.
  BOT_API_KEY: z.string().default(''),
  // Role sync in the SkyStats server (all optional; roles only for members who opted in)
  ROLE_SYNC_GUILD_ID: z.string().default(''),
  LINKED_ROLE_ID: z.string().default(''),
  PRO_ROLE_ID: z.string().default(''),
  MAX_ROLE_ID: z.string().default(''),
  // Channels that get free Hypixel outage alerts (comma-separated channel ids)
  STATUS_ALERT_CHANNEL_IDS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
