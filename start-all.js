import { spawn } from 'child_process';

console.log('🚀 Starting MCTiers Backend & Discord Bot simultaneously...');

const backend = spawn('node', ['backend/dist/server.js'], {
  stdio: 'inherit',
  shell: true,
});

const bot = spawn('node', ['bot/dist/index.js'], {
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  backend.kill();
  bot.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
