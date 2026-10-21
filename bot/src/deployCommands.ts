import { REST, Routes } from 'discord.js';
import { config } from './config.js';

import * as linkCmd from './commands/link.js';
import * as queueCmd from './commands/queue.js';
import * as nextCmd from './commands/next.js';
import * as submitCmd from './commands/submit.js';
import * as closeCmd from './commands/close.js';
import * as profileCmd from './commands/profile.js';
import * as tiersCmd from './commands/tiers.js';
import * as adminCmd from './commands/admin.js';

const commands = [
  linkCmd.data.toJSON(),
  queueCmd.data.toJSON(),
  nextCmd.data.toJSON(),
  submitCmd.data.toJSON(),
  closeCmd.data.toJSON(),
  profileCmd.data.toJSON(),
  tiersCmd.data.toJSON(),
  adminCmd.data.toJSON(),
];

export async function deployCommands() {
  if (!config.discordToken || !config.clientId) {
    console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in bot/.env');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`Successfully registered slash commands for guild ${config.guildId}`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log('Successfully registered slash commands globally.');
    }
  } catch (error) {
    console.error('Error deploying slash commands:', error);
  }
}

if (process.argv[1]?.includes('deployCommands')) {
  deployCommands();
}
