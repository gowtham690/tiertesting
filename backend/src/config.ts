import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  botApiKey: process.env.BOT_API_KEY || 'test_bot_secret_key',
  pluginApiKey: process.env.PLUGIN_API_KEY || 'test_plugin_secret_key',
  retestCooldownDays: parseInt(process.env.RETEST_COOLDOWN_DAYS || '14', 10),
  maxTierJump: parseInt(process.env.MAX_TIER_JUMP || '2', 10),
};
