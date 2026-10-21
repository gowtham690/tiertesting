import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { z } from 'zod';

export async function queueRoutes(fastify: FastifyInstance) {
  // Get active queue snapshot across all gamemodes
  fastify.get('/status', async () => {
    const gamemodes = await prisma.gamemode.findMany({
      where: { enabled: true },
      include: {
        queueEntries: {
          where: { status: 'WAITING' },
          include: {
            player: true,
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    const activeTests = await prisma.test.findMany({
      where: { status: 'IN_PROGRESS' },
      include: {
        player: true,
        tester: true,
        gamemode: true,
      },
    });

    const summary = gamemodes.map((gm) => ({
      gamemodeId: gm.id,
      name: gm.name,
      emoji: gm.emoji,
      waitingCount: gm.queueEntries.length,
      waitingPlayers: gm.queueEntries.map((qe, index) => ({
        queueId: qe.id,
        position: index + 1,
        discordId: qe.player.discordId,
        minecraftName: qe.player.minecraftName,
        region: qe.region,
        joinedAt: qe.joinedAt.toISOString(),
      })),
    }));

    return {
      gamemodes: summary,
      activeTestsCount: activeTests.length,
      activeTests: activeTests.map((t) => ({
        testId: t.id,
        gamemodeId: t.gamemodeId,
        playerDiscordId: t.player.discordId,
        playerName: t.player.minecraftName,
        testerDiscordId: t.tester.discordId,
        startedAt: t.createdAt.toISOString(),
      })),
    };
  });

  // Join queue
  fastify.post('/join', async (request, reply) => {
    const schema = z.object({
      discordId: z.string(),
      gamemodeId: z.string(),
      region: z.string().default('NA'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { discordId, gamemodeId, region } = parsed.data;

    // 1. Verify player is linked
    const player = await prisma.player.findUnique({
      where: { discordId },
      include: {
        tiers: { where: { gamemodeId } },
      },
    });

    if (!player) {
      return reply.status(400).send({
        error: 'ACCOUNT_NOT_LINKED',
        message: 'You must link your Minecraft account before joining a queue. Run /link in-game.',
      });
    }

    // 2. Check blacklist
    if (player.isBlacklisted) {
      return reply.status(403).send({
        error: 'PLAYER_BLACKLISTED',
        message: `You are blacklisted from tier testing. Reason: ${player.blacklistReason || 'None'}`,
      });
    }

    // 3. Verify gamemode enabled
    const gamemode = await prisma.gamemode.findUnique({
      where: { id: gamemodeId },
    });

    if (!gamemode || !gamemode.enabled) {
      return reply.status(400).send({
        error: 'GAMEMODE_DISABLED',
        message: 'This gamemode is currently disabled for tier testing.',
      });
    }

    // 4. Check if already in queue or active test
    const existingQueue = await prisma.queueEntry.findFirst({
      where: {
        playerId: player.id,
        status: { in: ['WAITING', 'TESTING'] },
      },
      include: { gamemode: true },
    });

    if (existingQueue) {
      return reply.status(409).send({
        error: 'ALREADY_QUEUED',
        message: `You are already queued or being tested for ${existingQueue.gamemode.name}.`,
        queueEntry: existingQueue,
      });
    }

    // 5. Check cooldown
    const existingTier = player.tiers[0];
    if (existingTier && existingTier.lastTestedAt) {
      const cooldownMs = config.retestCooldownDays * 24 * 60 * 60 * 1000;
      const cooldownExpiry = new Date(existingTier.lastTestedAt.getTime() + cooldownMs);

      if (cooldownExpiry > new Date()) {
        const daysRemaining = Math.ceil((cooldownExpiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        return reply.status(429).send({
          error: 'COOLDOWN_ACTIVE',
          message: `Retest cooldown is active for ${gamemode.name}. You can retest in ${daysRemaining} day(s).`,
          cooldownExpiresAt: cooldownExpiry.toISOString(),
        });
      }
    }

    // 6. Enqueue player
    const entry = await prisma.queueEntry.create({
      data: {
        playerId: player.id,
        gamemodeId,
        region,
        status: 'WAITING',
      },
      include: {
        player: true,
        gamemode: true,
      },
    });

    // Count position in queue
    const position = await prisma.queueEntry.count({
      where: {
        gamemodeId,
        status: 'WAITING',
        joinedAt: { lte: entry.joinedAt },
      },
    });

    return {
      success: true,
      queueId: entry.id,
      position,
      gamemode: entry.gamemode.name,
      minecraftName: player.minecraftName,
    };
  });

  // Leave queue
  fastify.post('/leave', async (request, reply) => {
    const schema = z.object({
      discordId: z.string(),
      gamemodeId: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { discordId, gamemodeId } = parsed.data;

    const player = await prisma.player.findUnique({
      where: { discordId },
    });

    if (!player) {
      return reply.status(404).send({ error: 'Player not found' });
    }

    const whereClause: any = {
      playerId: player.id,
      status: 'WAITING',
    };
    if (gamemodeId) whereClause.gamemodeId = gamemodeId;

    const deleted = await prisma.queueEntry.deleteMany({
      where: whereClause,
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ error: 'No active waiting queue entry found to leave.' });
    }

    return { success: true, removedCount: deleted.count };
  });

  // Tester claims next queued player
  fastify.post('/claim', async (request, reply) => {
    const schema = z.object({
      testerDiscordId: z.string(),
      gamemodeId: z.string().optional(),
      ticketChannelId: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { testerDiscordId, gamemodeId, ticketChannelId } = parsed.data;

    // Verify tester exists and is authorized
    let tester = await prisma.tester.findUnique({
      where: { discordId: testerDiscordId },
    });

    if (!tester || !tester.active) {
      // Auto-register as tester if authorized or throw
      return reply.status(403).send({ error: 'You are not registered as an active tester.' });
    }

    // Find tester player record to determine tester tier
    const testerPlayer = await prisma.player.findUnique({
      where: { discordId: testerDiscordId },
      include: { tiers: true },
    });

    // Find next waiting queue entry
    const whereCondition: any = { status: 'WAITING' };
    if (gamemodeId) whereCondition.gamemodeId = gamemodeId;

    const nextEntry = await prisma.queueEntry.findFirst({
      where: whereCondition,
      orderBy: { joinedAt: 'asc' },
      include: {
        player: {
          include: {
            tiers: true,
          },
        },
        gamemode: true,
      },
    });

    if (!nextEntry) {
      return reply.status(404).send({ error: 'No players are currently waiting in the queue.' });
    }

    // Determine tester tier for this gamemode (default to HT2 if not ranked or unranked)
    const testerGmTier = testerPlayer?.tiers.find((t) => t.gamemodeId === nextEntry.gamemodeId);
    const testerTier = (testerGmTier?.tier as any) || 'HT2';

    // Find player's current tier in this gamemode
    const playerGmTier = nextEntry.player.tiers.find((t) => t.gamemodeId === nextEntry.gamemodeId);
    const currentTier = playerGmTier?.tier || 'UNRANKED';

    // Update queue entry to TESTING
    await prisma.queueEntry.update({
      where: { id: nextEntry.id },
      data: {
        status: 'TESTING',
        testerId: tester.id,
        ticketChannelId: ticketChannelId ?? null,
      },
    });

    // Create in-progress test
    const test = await prisma.test.create({
      data: {
        playerId: nextEntry.playerId,
        testerId: tester.id,
        gamemodeId: nextEntry.gamemodeId,
        testerTier,
        oldTier: currentTier,
        newTier: currentTier, // will update on submit
        status: 'IN_PROGRESS',
      },
    });

    return {
      success: true,
      testId: test.id,
      queueEntryId: nextEntry.id,
      gamemode: {
        id: nextEntry.gamemode.id,
        name: nextEntry.gamemode.name,
        maxRounds: nextEntry.gamemode.maxRounds,
      },
      player: {
        id: nextEntry.player.id,
        discordId: nextEntry.player.discordId,
        minecraftName: nextEntry.player.minecraftName,
        minecraftUuid: nextEntry.player.minecraftUuid,
        currentTier,
      },
      tester: {
        discordId: tester.discordId,
        tier: testerTier,
      },
    };
  });
}
