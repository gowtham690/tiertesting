import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { calculateTierResult } from '../services/tierCalculator.js';
import { Tier } from '@tiertesting/shared';
import { z } from 'zod';

export async function testRoutes(fastify: FastifyInstance) {
  // Submit test result
  fastify.post('/submit', async (request, reply) => {
    const schema = z.object({
      testId: z.string().optional(),
      testerDiscordId: z.string(),
      playerDiscordId: z.string().optional(),
      gamemodeId: z.string().optional(),
      playerScore: z.number().int().min(0),
      testerScore: z.number().int().min(0),
      notes: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const {
      testId,
      testerDiscordId,
      playerDiscordId,
      gamemodeId,
      playerScore,
      testerScore,
      notes,
    } = parsed.data;

    // 1. Verify tester
    const tester = await prisma.tester.findUnique({
      where: { discordId: testerDiscordId },
    });

    if (!tester) {
      return reply.status(403).send({ error: 'Tester not recognized or unauthorized.' });
    }

    // 2. Locate the active test record
    let testRecord = null;
    if (testId) {
      testRecord = await prisma.test.findUnique({
        where: { id: testId },
        include: { player: true, gamemode: true },
      });
    } else if (playerDiscordId && gamemodeId) {
      const player = await prisma.player.findUnique({
        where: { discordId: playerDiscordId },
      });
      if (!player) {
        return reply.status(404).send({ error: 'Player not found.' });
      }

      testRecord = await prisma.test.findFirst({
        where: {
          playerId: player.id,
          testerId: tester.id,
          gamemodeId,
          status: 'IN_PROGRESS',
        },
        include: { player: true, gamemode: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!testRecord) {
      return reply.status(404).send({ error: 'Active test not found.' });
    }

    if (testRecord.status === 'COMPLETED') {
      return reply.status(409).send({ error: 'This test has already been completed.' });
    }

    // 3. Find current tier of player
    const currentTierRecord = await prisma.playerTier.findUnique({
      where: {
        playerId_gamemodeId: {
          playerId: testRecord.playerId,
          gamemodeId: testRecord.gamemodeId,
        },
      },
    });

    const currentTier = (currentTierRecord?.tier as Tier) || 'UNRANKED';

    // 4. Calculate new tier
    const calculated = calculateTierResult(
      {
        playerId: testRecord.playerId,
        testerId: tester.id,
        gamemodeId: testRecord.gamemodeId as any,
        playerScore,
        testerScore,
        testerTier: (testRecord.testerTier as Tier) || 'HT2',
        notes,
      },
      currentTier
    );

    // 5. Update database transactionally
    const now = new Date();

    const [updatedTier, updatedTest] = await prisma.$transaction([
      // Upsert player tier
      prisma.playerTier.upsert({
        where: {
          playerId_gamemodeId: {
            playerId: testRecord.playerId,
            gamemodeId: testRecord.gamemodeId,
          },
        },
        update: {
          tier: calculated.newTier,
          points: calculated.newPoints,
          lastTestedAt: now,
        },
        create: {
          playerId: testRecord.playerId,
          gamemodeId: testRecord.gamemodeId,
          tier: calculated.newTier,
          points: calculated.newPoints,
          lastTestedAt: now,
        },
      }),

      // Update test record
      prisma.test.update({
        where: { id: testRecord.id },
        data: {
          playerScore,
          testerScore,
          oldTier: currentTier,
          newTier: calculated.newTier,
          status: 'COMPLETED',
          notes: notes ?? null,
          completedAt: now,
        },
      }),

      // Increment tester stats
      prisma.tester.update({
        where: { id: tester.id },
        data: {
          testsCompleted: { increment: 1 },
        },
      }),

      // Close queue entry
      prisma.queueEntry.updateMany({
        where: {
          playerId: testRecord.playerId,
          gamemodeId: testRecord.gamemodeId,
          status: 'TESTING',
        },
        data: {
          status: 'COMPLETED',
        },
      }),

      // Audit log
      prisma.auditLog.create({
        data: {
          actorId: tester.discordId,
          action: 'COMPLETE_TEST',
          targetId: testRecord.playerId,
          details: `Tested ${testRecord.gamemodeId}: ${playerScore}-${testerScore} (Old: ${currentTier} -> New: ${calculated.newTier})`,
        },
      }),
    ]);

    return {
      success: true,
      testId: updatedTest.id,
      gamemode: testRecord.gamemode.name,
      gamemodeId: testRecord.gamemodeId,
      player: {
        discordId: testRecord.player.discordId,
        minecraftName: testRecord.player.minecraftName,
      },
      score: {
        playerScore,
        testerScore,
      },
      testerTier: testRecord.testerTier,
      oldTier: currentTier,
      newTier: calculated.newTier,
      points: calculated.newPoints,
      pointsDelta: calculated.pointsDelta,
      cappedByJumpRule: calculated.cappedByJumpRule,
      reason: calculated.reason,
      completedAt: now.toISOString(),
    };
  });

  // Cancel or void a test
  fastify.post('/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body as { reason?: string }) || {};

    const test = await prisma.test.findUnique({ where: { id } });
    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }

    await prisma.test.update({
      where: { id },
      data: {
        status: 'VOIDED',
        notes: reason ? `VOIDED: ${reason}` : 'VOIDED',
      },
    });

    await prisma.queueEntry.updateMany({
      where: {
        playerId: test.playerId,
        gamemodeId: test.gamemodeId,
        status: 'TESTING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    return { success: true, message: 'Test cancelled and queue entry cleared.' };
  });

  // Test history
  fastify.get('/history', async (request) => {
    const { playerDiscordId, gamemodeId, limit = '20' } = request.query as any;

    const where: any = { status: 'COMPLETED' };
    if (gamemodeId) where.gamemodeId = gamemodeId;
    if (playerDiscordId) {
      const player = await prisma.player.findUnique({ where: { discordId: playerDiscordId } });
      if (player) where.playerId = player.id;
    }

    const tests = await prisma.test.findMany({
      where,
      take: Math.min(100, parseInt(limit, 10)),
      orderBy: { completedAt: 'desc' },
      include: {
        player: true,
        tester: true,
        gamemode: true,
      },
    });

    return tests.map((t) => ({
      id: t.id,
      gamemode: t.gamemode.name,
      playerName: t.player.minecraftName,
      playerDiscordId: t.player.discordId,
      testerDiscordId: t.tester.discordId,
      playerScore: t.playerScore,
      testerScore: t.testerScore,
      oldTier: t.oldTier,
      newTier: t.newTier,
      completedAt: t.completedAt?.toISOString(),
      notes: t.notes,
    }));
  });
}
