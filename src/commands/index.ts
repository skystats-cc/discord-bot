import { bazaar } from './bazaar.js';
import { ping } from './ping.js';
import { status } from './status.js';
import type { Command } from './types.js';

// Add new commands here, then run `npm run deploy-commands`.
export const commands: Command[] = [ping, bazaar, status];

export const commandMap = new Map(commands.map((c) => [c.data.name, c]));
