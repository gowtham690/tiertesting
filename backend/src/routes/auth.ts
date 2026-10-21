import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { z } from 'zod';
import crypto from 'crypto';

export async function authRoutes(fastify: FastifyInstance) {
  // Generate a link code (called by plugin when player runs /link in-game)
  fastify.post('/link/generate', async (request, reply) => {
    const schema = z.object({
      minecraftUuid: z.string().min(32),
      minecraftName: z.string().min(1).max(16),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { minecraftUuid, minecraftName } = parsed.data;

    // Invalidate existing unused codes for this UUID
    await prisma.linkCode.updateMany({
      where: { minecraftUuid, used: false },
      data: { used: true },
    });

    // Generate random 6-character code
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const linkCode = await prisma.linkCode.create({
      data: {
        code,
        minecraftUuid,
        minecraftName,
        expiresAt,
      },
    });

    return {
      code: linkCode.code,
      expiresAt: linkCode.expiresAt,
      instructions: `Type /link ${linkCode.code} in Discord within 10 minutes.`,
    };
  });

  // Verify and link code (called by Discord bot when user runs /link <code>)
  fastify.post('/link/verify', async (request, reply) => {
    const schema = z.object({
      code: z.string().min(6).max(8),
      discordId: z.string().min(1),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const { code, discordId } = parsed.data;

    const linkCode = await prisma.linkCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!linkCode || linkCode.used || linkCode.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invalid or expired link code' });
    }

    // Check if Discord ID or Minecraft UUID is already linked
    const existingPlayer = await prisma.player.findFirst({
      where: {
        OR: [{ discordId }, { minecraftUuid: linkCode.minecraftUuid }],
      },
    });

    let player;
    if (existingPlayer) {
      // Update existing record
      player = await prisma.player.update({
        where: { id: existingPlayer.id },
        data: {
          discordId,
          minecraftUuid: linkCode.minecraftUuid,
          minecraftName: linkCode.minecraftName,
          linkedAt: new Date(),
        },
      });
    } else {
      // Create new player
      player = await prisma.player.create({
        data: {
          discordId,
          minecraftUuid: linkCode.minecraftUuid,
          minecraftName: linkCode.minecraftName,
        },
      });
    }

    // Mark code as used
    await prisma.linkCode.update({
      where: { id: linkCode.id },
      data: { used: true },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorId: discordId,
        action: 'LINK_ACCOUNT',
        targetId: player.id,
        details: `Linked ${linkCode.minecraftName} (${linkCode.minecraftUuid}) to Discord ${discordId}`,
      },
    });

    return {
      success: true,
      player: {
        id: player.id,
        discordId: player.discordId,
        minecraftUuid: player.minecraftUuid,
        minecraftName: player.minecraftName,
      },
    };
  });
}
