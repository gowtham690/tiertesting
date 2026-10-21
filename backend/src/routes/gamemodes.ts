import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { DEFAULT_GAMEMODES, GamemodeId } from '@tiertesting/shared';

export async function gamemodeRoutes(fastify: FastifyInstance) {
  // Ensure default gamemodes are seeded in DB
  async function ensureDefaultGamemodes() {
    for (const gm of Object.values(DEFAULT_GAMEMODES)) {
      await prisma.gamemode.upsert({
        where: { id: gm.id },
        update: {
          name: gm.name,
          description: gm.description,
          emoji: gm.emoji,
          maxRounds: gm.maxRounds,
        },
        create: {
          id: gm.id,
          name: gm.name,
          description: gm.description,
          emoji: gm.emoji,
          enabled: gm.enabled,
          maxRounds: gm.maxRounds,
        },
      });
    }
  }

  // Seed on startup
  await ensureDefaultGamemodes();

  fastify.get('/', async () => {
    return prisma.gamemode.findMany({
      orderBy: { name: 'asc' },
    });
  });

  fastify.put('/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.gamemode.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Gamemode not found' });
    }

    const updated = await prisma.gamemode.update({
      where: { id },
      data: { enabled: !existing.enabled },
    });

    return updated;
  });
}
