import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { SkystatsApiError } from './api.js';
import { commandMap } from './commands/index.js';
import { config } from './config.js';
import { startDmDelivery, startNewsPosts } from './alerts/delivery.js';
import { startLiveBazaar } from './alerts/liveBazaar.js';
import { startOutageAlerts } from './alerts/outage.js';
import { roleSyncEnabled, startRoleSync } from './roles/sync.js';

// Role sync needs the Server Members intent (privileged; enable it in the developer portal).
const client = new Client({
  intents: roleSyncEnabled() ? [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] : [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag} (${commandMap.size} commands)`);
  startOutageAlerts(c);
  startRoleSync(c);
  startDmDelivery(c);
  startNewsPosts(c);
  startLiveBazaar(c);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    await commandMap.get(interaction.commandName)?.autocomplete?.(interaction).catch(console.error);
    return;
  }
  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`/${interaction.commandName} failed`, err);
    const content =
      err instanceof SkystatsApiError && (err.unreachable || err.status >= 500)
        ? "⚠️ Couldn't reach the SkyStats API. Try again in a moment."
        : '⚠️ Something went wrong running that command.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content, embeds: [] }).catch(() => {});
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

const shutdown = () => {
  void client.destroy().then(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await client.login(config.DISCORD_TOKEN);
