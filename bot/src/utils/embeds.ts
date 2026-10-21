import { EmbedBuilder } from 'discord.js';
import {
  GamemodeId,
  DEFAULT_GAMEMODES,
  PlayerProfile,
  Tier,
} from '@tiertesting/shared';
import { SubmitResultResponse, QueueStatusResponse } from '../api/backendClient.js';
import { config } from '../config.js';

export const TIER_COLORS: Record<Tier, number> = {
  HT1: 0xff3333, // Vivid Red
  LT1: 0xff8800, // Vibrant Orange
  HT2: 0xffcc00, // Gold Yellow
  LT2: 0x55ff55, // Lime Green
  HT3: 0x00aa00, // Forest Green
  LT3: 0x55ffff, // Cyan
  HT4: 0x00aaaa, // Dark Cyan
  LT4: 0xaa00aa, // Purple
  HT5: 0xaaaaaa, // Silver
  LT5: 0x555555, // Charcoal
  UNRANKED: 0x2b2d31,
};

export const TIER_BADGES: Record<Tier, string> = {
  HT1: '🔴 **HT1**',
  LT1: '🟠 **LT1**',
  HT2: '🟡 **HT2**',
  LT2: '🟢 **LT2**',
  HT3: '🌲 **HT3**',
  LT3: '💎 **LT3**',
  HT4: '🔷 **HT4**',
  LT4: '🔮 **LT4**',
  HT5: '⚪ **HT5**',
  LT5: '⚫ **LT5**',
  UNRANKED: '⚪ *Unranked*',
};

export function createQueuePanelEmbed(status: QueueStatusResponse): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('⚔️ Competitive Tier Testing Queue')
    .setDescription(
      'Select a gamemode button below to join the testing queue.\n' +
      'Once a tester is available, a private match ticket will be generated for you.\n\n' +
      '📌 **Rules:** Ensure you have linked your account (`/link`) and do not have an active cooldown.'
    )
    .setColor(0x5865f2)
    .setTimestamp();

  // Add field for each gamemode status
  for (const gm of status.gamemodes) {
    const playersList = gm.waitingPlayers.length > 0
      ? gm.waitingPlayers.slice(0, 5).map((p) => `\`#${p.position}\` **${p.minecraftName}** (${p.region})`).join('\n') +
        (gm.waitingPlayers.length > 5 ? `\n*+${gm.waitingPlayers.length - 5} more...*` : '')
      : '*No players in queue*';

    embed.addFields({
      name: `${gm.emoji} ${gm.name} • \`${gm.waitingCount} waiting\``,
      value: playersList,
      inline: true,
    });
  }

  embed.addFields({
    name: '⚡ Live Testing Status',
    value: `Active Tests Ongoing: **${status.activeTestsCount}**\nServer IP: \`${config.serverIp}\``,
    inline: false,
  });

  embed.setFooter({ text: 'Updates automatically • Click Leave Queue to exit' });

  return embed;
}

export function createTicketWelcomeEmbed(data: {
  testId: string;
  gamemode: { id: GamemodeId; name: string; maxRounds: number };
  player: { discordId: string; minecraftName: string; currentTier: Tier };
  tester: { discordId: string; tier: Tier };
}): EmbedBuilder {
  const gmConfig = DEFAULT_GAMEMODES[data.gamemode.id];
  const color = TIER_COLORS[data.player.currentTier] || 0x5865f2;

  return new EmbedBuilder()
    .setTitle(`⚔️ Match Testing Session • ${data.gamemode.name}`)
    .setDescription(
      `Welcome <@${data.player.discordId}> and Tester <@${data.tester.discordId}>!\n\n` +
      `**Test Server IP:** \`${config.serverIp}\`\n` +
      `**Match Format:** First to **${data.gamemode.maxRounds}** wins\n` +
      `**Player Tier:** ${TIER_BADGES[data.player.currentTier]}\n` +
      `**Tester Tier:** ${TIER_BADGES[data.tester.tier]}\n\n` +
      `**Instructions:**\n` +
      `1. Both players join the test server.\n` +
      `2. Prepare kits for **${data.gamemode.name}**.\n` +
      `3. Play out the test until score limit is reached.\n` +
      `4. Tester clicks **Submit Result** to enter the final score.`
    )
    .setColor(color)
    .addFields(
      { name: 'Player IGN', value: `\`${data.player.minecraftName}\``, inline: true },
      { name: 'Gamemode', value: `${gmConfig?.emoji || '⚔️'} ${data.gamemode.name}`, inline: true },
      { name: 'Test ID', value: `\`${data.testId.slice(0, 8)}\``, inline: true }
    )
    .setFooter({ text: 'Use the buttons below to manage this test session' })
    .setTimestamp();
}

export function createResultAnnouncementEmbed(result: SubmitResultResponse): EmbedBuilder {
  const color = TIER_COLORS[result.newTier] || 0x5865f2;
  const isPromotion = result.pointsDelta > 0;
  const isDemotion = result.pointsDelta < 0;

  let trendEmoji = '➖ Retained';
  if (isPromotion) trendEmoji = '📈 Promoted';
  if (isDemotion) trendEmoji = '📉 Demoted';

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Official Test Result • ${result.gamemode}`)
    .setDescription(
      `**Player:** <@${result.player.discordId}> (\`${result.player.minecraftName}\`)\n` +
      `**Tester:** <@${result.testerTier ? result.player.discordId : 'Tester'}>\n\n` +
      `**Score:** **${result.score.playerScore}** - **${result.score.testerScore}**\n` +
      `**Previous Tier:** ${TIER_BADGES[result.oldTier]}\n` +
      `**New Assigned Tier:** ${TIER_BADGES[result.newTier]} (${trendEmoji})\n` +
      `**Points:** \`${result.points}\` (${result.pointsDelta >= 0 ? '+' : ''}${result.pointsDelta})\n\n` +
      `*${result.reason}*`
    )
    .setColor(color)
    .setThumbnail(`https://minotar.net/helm/${result.player.minecraftName}/100.png`)
    .setFooter({ text: `Test ID: ${result.testId.slice(0, 8)} • MCTiers Testing System` })
    .setTimestamp();

  return embed;
}

export function createPlayerProfileEmbed(profile: PlayerProfile): EmbedBuilder {
  const highestBadge = TIER_BADGES[profile.highestTier] || '⚪ Unranked';
  const color = TIER_COLORS[profile.highestTier] || 0x2b2d31;

  const embed = new EmbedBuilder()
    .setTitle(`Player Profile • ${profile.minecraftName}`)
    .setDescription(
      `**Discord:** <@${profile.discordId}>\n` +
      `**Minecraft IGN:** \`${profile.minecraftName}\`\n` +
      `**UUID:** \`${profile.minecraftUuid}\`\n` +
      `**Highest Overall Tier:** ${highestBadge}\n` +
      `**Role:** ${profile.isTester ? `⭐ ${profile.testerRole}` : 'Player'}\n` +
      `**Linked Since:** <t:${Math.floor(new Date(profile.linkedAt).getTime() / 1000)}:R>`
    )
    .setColor(color)
    .setThumbnail(`https://minotar.net/helm/${profile.minecraftUuid}/100.png`);

  const gamemodeEntries = Object.entries(DEFAULT_GAMEMODES);
  const tierLines = gamemodeEntries.map(([id, gm]) => {
    const tierData = profile.tiers[id as GamemodeId];
    const tierStr = tierData?.tier || 'UNRANKED';
    const badge = TIER_BADGES[tierStr];
    const points = tierData ? `\`${tierData.points} pts\`` : '`0 pts`';
    return `${gm.emoji} **${gm.name}:** ${badge} ${points}`;
  });

  embed.addFields({
    name: '📊 Gamemode Tiers',
    value: tierLines.join('\n'),
    inline: false,
  });

  return embed;
}
