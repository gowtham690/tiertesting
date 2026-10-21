import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { z } from 'zod';

export async function testerRoutes(fastify: FastifyInstance) {
  // Get tester profile
  fastify.get('/:discordId', async (request, reply) => {
    const { discordId } = request.params as { discordId: string };

    const tester = await prisma.tester.findUnique({
      where: { discordId },
      include: {
        tests: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { player: true, gamemode: true },
        },
      },
    });

    if (!tester) {
      return reply.status(404).send({ error: 'Tester not found' });
    }

    return tester;
  });

  // Add or update tester role
  fastify.post('/', async (request, reply) => {
    const schema = z.object({
      discordId: z.string(),
      role: z.enum(['TESTER', 'HEAD_TESTER', 'ADMIN']).default('TESTER'),
      active: z.boolean().default(true),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { discordId, role, active } = parsed.data;

    const tester = await prisma.tester.upsert({
      where: { discordId },
      update: { role, active },
      create: { discordId, role, active },
    });

    return tester;
  });

  // List all active testers
  fastify.get('/', async () => {
    return prisma.tester.findMany({
      orderBy: { testsCompleted: 'desc' },
    });
  });
}
