import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { Tier, TIER_RANKS, GamemodeId } from '@tiertesting/shared';

export async function playerRoutes(fastify: FastifyInstance) {
  // Get player by Discord ID or Minecraft UUID
  fastify.get('/:identifier', async (request, reply) => {
    const { identifier } = request.params as { identifier: string };

    const player = await prisma.player.findFirst({
      where: {
        OR: [{ discordId: identifier }, { minecraftUuid: identifier }, { minecraftName: identifier }],
      },
      include: {
        tiers: {
          include: {
            gamemode: true,
          },
        },
      },
    });

    if (!player) {
      return reply.status(404).send({ error: 'Player not found' });
    }

    // Check tester status
    const tester = await prisma.tester.findUnique({
      where: { discordId: player.discordId },
    });

    // Format tiers and compute highest tier
    let highestTier: Tier = 'UNRANKED';
    let highestRank = 0;
    const tiersMap: Record<string, { tier: Tier; points: number; lastTestedAt?: string }> = {};
    const cooldowns: Record<string, string> = {};

    const cooldownMs = config.retestCooldownDays * 24 * 60 * 60 * 1000;

    for (const pt of player.tiers) {
      const tierStr = pt.tier as Tier;
      const rank = TIER_RANKS[tierStr] || 0;
      if (rank > highestRank) {
        highestRank = rank;
        highestTier = tierStr;
      }

      tiersMap[pt.gamemodeId] = {
        tier: tierStr,
        points: pt.points,
        lastTestedAt: pt.lastTestedAt ? pt.lastTestedAt.toISOString() : undefined,
      };

      if (pt.lastTestedAt) {
        const cooldownExpiry = new Date(pt.lastTestedAt.getTime() + cooldownMs);
        if (cooldownExpiry > new Date()) {
          cooldowns[pt.gamemodeId] = cooldownExpiry.toISOString();
        }
      }
    }

    return {
      id: player.id,
      discordId: player.discordId,
      minecraftUuid: player.minecraftUuid,
      minecraftName: player.minecraftName,
      linkedAt: player.linkedAt.toISOString(),
      isBlacklisted: player.isBlacklisted,
      blacklistReason: player.blacklistReason,
      tiers: tiersMap,
      highestTier,
      isTester: !!tester && tester.active,
      testerRole: tester?.role,
      retestCooldownExpiresAt: cooldowns,
    };
  });

  // Blacklist / Unblacklist player
  fastify.post('/:id/blacklist', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { blacklisted, reason } = request.body as { blacklisted: boolean; reason?: string };

    const player = await prisma.player.update({
      where: { id },
      data: {
        isBlacklisted: blacklisted,
        blacklistReason: reason ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: 'ADMIN',
        action: blacklisted ? 'BLACKLIST_PLAYER' : 'UNBLACKLIST_PLAYER',
        targetId: player.id,
        details: reason,
      },
    });

    return player;
  });
}
