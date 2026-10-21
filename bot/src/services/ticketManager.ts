import {
  ChannelType,
  Guild,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { config } from '../config.js';
import { ClaimResult } from '../api/backendClient.js';
import { createTicketWelcomeEmbed } from '../utils/embeds.js';
import { createTicketControlButtons } from '../components/ticketControls.js';

export async function createMatchTicketChannel(
  guild: Guild,
  claim: ClaimResult
): Promise<TextChannel> {
  const channelName = `test-${claim.player.minecraftName.toLowerCase()}-${claim.gamemode.id}`;

  // Find category if configured
  const parentCategory = config.ticketsCategoryId
    ? guild.channels.cache.get(config.ticketsCategoryId)
    : undefined;

  // Find tester role if present in guild
  const testerRole = guild.roles.cache.find(
    (r) => r.name.toLowerCase() === config.testerRoleName.toLowerCase()
  );

  const permissionOverwrites: any[] = [
    {
      id: guild.id, // @everyone
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: guild.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
      ],
    },
    {
      id: claim.player.discordId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: claim.tester.discordId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (testerRole) {
    permissionOverwrites.push({
      id: testerRole.id,
      allow: [PermissionFlagsBits.ViewChannel],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentCategory?.id,
    topic: `Test Match Session | Gamemode: ${claim.gamemode.name} | Test ID: ${claim.testId}`,
    permissionOverwrites,
  });

  // Post welcome briefing embed
  const welcomeEmbed = createTicketWelcomeEmbed({
    testId: claim.testId,
    gamemode: claim.gamemode,
    player: claim.player,
    tester: claim.tester,
  });

  const controls = createTicketControlButtons(claim.testId);

  await channel.send({
    content: `<@${claim.player.discordId}> ⚔️ <@${claim.tester.discordId}> your testing match is ready!`,
    embeds: [welcomeEmbed],
    components: [controls],
  });

  return channel;
}

export async function closeTicketChannel(channel: TextChannel, delaySeconds = 5) {
  await channel.send(`🔒 *Closing ticket and archiving in ${delaySeconds} seconds...*`);
  setTimeout(async () => {
    try {
      await channel.delete('Test completed or ticket closed.');
    } catch (err) {
      console.error(`Failed to delete channel ${channel.id}:`, err);
    }
  }, delaySeconds * 1000);
}
