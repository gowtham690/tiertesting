import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from './server.js';
import { FastifyInstance } from 'fastify';
import { prisma } from './db.js';
import { config } from './config.js';

describe('End-to-End System Integration Flow', () => {
  let app: FastifyInstance;
  const botApiKey = config.botApiKey;
  const pluginApiKey = config.pluginApiKey;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();

    // Clean up test database
    await prisma.test.deleteMany();
    await prisma.queueEntry.deleteMany();
    await prisma.playerTier.deleteMany();
    await prisma.tester.deleteMany();
    await prisma.player.deleteMany();
    await prisma.linkCode.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('Flow: In-game link code generation -> Discord verification', async () => {
    // 1. Minecraft plugin calls /api/auth/link/generate
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/auth/link/generate',
      headers: { 'X-API-Key': pluginApiKey },
      payload: {
        minecraftUuid: '069a79f444e94726a5bef2a5971d7ec6',
        minecraftName: 'Notch',
      },
    });

    expect(genRes.statusCode).toBe(200);
    const genBody = JSON.parse(genRes.body);
    expect(genBody.code).toBeDefined();
    expect(genBody.code.length).toBe(6);

    // 2. Discord bot verifies code for user 111222333444
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/auth/link/verify',
      headers: { 'X-API-Key': botApiKey },
      payload: {
        code: genBody.code,
        discordId: '111222333444',
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.body);
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.player.minecraftName).toBe('Notch');
  });

  it('Flow: Player joins queue -> Tester claims next -> Ticket match created', async () => {
    // 1. Setup tester
    const testerDiscordId = '999888777666';
    await app.inject({
      method: 'POST',
      url: '/api/testers',
      headers: { 'X-API-Key': botApiKey },
      payload: {
        discordId: testerDiscordId,
        role: 'TESTER',
        active: true,
      },
    });

    // 2. Player joins queue for sword
    const joinRes = await app.inject({
      method: 'POST',
      url: '/api/queues/join',
      headers: { 'X-API-Key': botApiKey },
      payload: {
        discordId: '111222333444',
        gamemodeId: 'sword',
        region: 'NA',
      },
    });

    expect(joinRes.statusCode).toBe(200);
    const joinBody = JSON.parse(joinRes.body);
    expect(joinBody.success).toBe(true);
    expect(joinBody.position).toBe(1);

    // 3. Queue status reflects waiting player
    const statusRes = await app.inject({
      method: 'GET',
      url: '/api/queues/status',
      headers: { 'X-API-Key': botApiKey },
    });
    const statusBody = JSON.parse(statusRes.body);
    const swordQueue = statusBody.gamemodes.find((g: any) => g.gamemodeId === 'sword');
    expect(swordQueue.waitingCount).toBe(1);

    // 4. Tester claims next player
    const claimRes = await app.inject({
      method: 'POST',
      url: '/api/queues/claim',
      headers: { 'X-API-Key': botApiKey },
      payload: {
        testerDiscordId,
        gamemodeId: 'sword',
        ticketChannelId: 'ticket-chan-101',
      },
    });

    expect(claimRes.statusCode).toBe(200);
    const claimBody = JSON.parse(claimRes.body);
    expect(claimBody.success).toBe(true);
    expect(claimBody.player.minecraftName).toBe('Notch');
    expect(claimBody.testId).toBeDefined();

    // 5. Submit match result (Score 7-5 vs HT2 tester)
    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/tests/submit',
      headers: { 'X-API-Key': botApiKey },
      payload: {
        testId: claimBody.testId,
        testerDiscordId,
        playerScore: 7,
        testerScore: 5,
        notes: 'Good pacing, solid shield timing.',
      },
    });

    expect(submitRes.statusCode).toBe(200);
    const submitBody = JSON.parse(submitRes.body);
    expect(submitBody.success).toBe(true);
    expect(submitBody.oldTier).toBe('UNRANKED');
    // Bounded by maxInitialPlacementTier ('HT3')
    expect(submitBody.newTier).toBe('HT3');
    expect(submitBody.cappedByJumpRule).toBe(true);
    expect(submitBody.points).toBeGreaterThan(600);

    // 6. Verify player profile has updated tier
    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/players/111222333444',
      headers: { 'X-API-Key': botApiKey },
    });
    const profileBody = JSON.parse(profileRes.body);
    expect(profileBody.highestTier).toBe('HT3');
    expect(profileBody.tiers.sword.tier).toBe('HT3');

    // 7. Verify cooldown is active when attempting to queue again immediately
    const retestRes = await app.inject({
      method: 'POST',
      url: '/api/queues/join',
      headers: { 'X-API-Key': botApiKey },
      payload: {
        discordId: '111222333444',
        gamemodeId: 'sword',
      },
    });

    expect(retestRes.statusCode).toBe(429);
    const retestBody = JSON.parse(retestRes.body);
    expect(retestBody.error).toBe('COOLDOWN_ACTIVE');
  });
});
