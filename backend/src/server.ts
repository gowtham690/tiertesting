import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { config } from './config.js';
import { prisma } from './db.js';
import { verifyApiKey } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { playerRoutes } from './routes/players.js';
import { queueRoutes } from './routes/queues.js';
import { testRoutes } from './routes/tests.js';
import { gamemodeRoutes } from './routes/gamemodes.js';
import { testerRoutes } from './routes/testers.js';

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
  });

  await fastify.register(cors, {
    origin: true,
  });
  await fastify.register(sensible);

  // Healthcheck endpoint (unauthenticated)
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Protected API routes
  fastify.register(async (api) => {
    api.addHook('preHandler', verifyApiKey);

    api.register(authRoutes, { prefix: '/auth' });
    api.register(playerRoutes, { prefix: '/players' });
    api.register(queueRoutes, { prefix: '/queues' });
    api.register(testRoutes, { prefix: '/tests' });
    api.register(gamemodeRoutes, { prefix: '/gamemodes' });
    api.register(testerRoutes, { prefix: '/testers' });
  }, { prefix: '/api' });

  return fastify;
}

async function start() {
  const app = await buildServer();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 TierTesting Backend API running at http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}
