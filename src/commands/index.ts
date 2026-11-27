import { alerts } from './alerts.js';
import { bazaar } from './bazaar.js';
import { ping } from './ping.js';
import { link } from './link.js';
import { me } from './me.js';
import { privacy } from './privacy.js';
import { subscribe } from './subscribe.js';
import { whois } from './whois.js';
import { profile } from './profile.js';
import { status } from './status.js';
import type { Command } from './types.js';

// Add new commands here, then run `npm run deploy-commands`.
export const commands: Command[] = [ping, bazaar, status, profile, privacy, me, link, subscribe, whois, alerts];

export const commandMap = new Map(commands.map((c) => [c.data.name, c]));
