import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discordToken: process.env.DISCORD_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001/api',
  botApiKey: process.env.BOT_API_KEY || 'test_bot_secret_key',

  // Channels
  queueChannelId: process.env.QUEUE_CHANNEL_ID || '',
  resultsChannelId: process.env.RESULTS_CHANNEL_ID || '',
  ticketsCategoryId: process.env.TICKETS_CATEGORY_ID || '',

  // Roles
  testerRoleName: process.env.TESTER_ROLE_NAME || 'Tester',
  headTesterRoleName: process.env.HEAD_TESTER_ROLE_NAME || 'Head Tester',
  adminRoleName: process.env.ADMIN_ROLE_NAME || 'Admin',

  // Minecraft test server info displayed in match tickets
  serverIp: process.env.MINECRAFT_SERVER_IP || 'test.mctiers.local',
};
