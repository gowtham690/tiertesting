import {
  Client,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import { config } from './config.js';
import { handleInteraction } from './events/interactionCreate.js';
import { startQueueUpdater } from './services/queueUpdater.js';

import * as linkCmd from './commands/link.js';
import * as queueCmd from './commands/queue.js';
import * as nextCmd from './commands/next.js';
import * as submitCmd from './commands/submit.js';
import * as closeCmd from './commands/close.js';
import * as profileCmd from './commands/profile.js';
import * as tiersCmd from './commands/tiers.js';
import * as adminCmd from './commands/admin.js';

const commands = new Map<string, any>();
commands.set(linkCmd.data.name, linkCmd);
commands.set(queueCmd.data.name, queueCmd);
commands.set(nextCmd.data.name, nextCmd);
commands.set(submitCmd.data.name, submitCmd);
commands.set(closeCmd.data.name, closeCmd);
commands.set(profileCmd.data.name, profileCmd);
commands.set(tiersCmd.data.name, tiersCmd);
commands.set(adminCmd.data.name, adminCmd);

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once('ready', async () => {
  console.log(`🤖 TierTesting Discord Bot logged in as ${client.user?.tag}!`);

  // Start background queue panel updater (runs every 15 seconds)
  startQueueUpdater(client, 15);
});

client.on('interactionCreate', async (interaction) => {
  await handleInteraction(interaction, commands);
});

if (config.discordToken) {
  client.login(config.discordToken).catch((err) => {
    console.error('Failed to log in to Discord:', err);
  });
} else {
  console.warn('⚠️ No DISCORD_TOKEN provided in bot/.env. Configure your token to start the live bot.');
}
