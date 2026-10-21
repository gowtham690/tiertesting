import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { backendClient } from '../api/backendClient.js';
import { createMatchTicketChannel } from '../services/ticketManager.js';
import { updateQueuePanel } from '../services/queueUpdater.js';
import { DEFAULT_GAMEMODES } from '@tiertesting/shared';

export const data = new SlashCommandBuilder()
  .setName('next')
  .setDescription('Claim the next queued player and generate a test ticket channel (Testers only)')
  .addStringOption((opt) =>
    opt
      .setName('gamemode')
      .setDescription('Filter for a specific gamemode (optional)')
      .setRequired(false)
      .addChoices(
        ...Object.values(DEFAULT_GAMEMODES).map((gm) => ({
          name: `${gm.emoji} ${gm.name}`,
          value: gm.id,
        }))
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const gamemodeId = interaction.options.getString('gamemode') || undefined;

  try {
    // 1. Claim next player from backend
    const claim = await backendClient.claimNext(interaction.user.id, gamemodeId);

    // 2. Create private ticket channel for tester & player
    const ticketChannel = await createMatchTicketChannel(interaction.guild, claim);

    // 3. Update live queue panel
    await updateQueuePanel(interaction.client);

    await interaction.editReply({
      content: `✅ Claimed match! Ticket channel created: <#${ticketChannel.id}>\n` +
               `**Player:** <@${claim.player.discordId}> (\`${claim.player.minecraftName}\`) • **Mode:** ${claim.gamemode.name}`,
    });
  } catch (err: any) {
    await interaction.editReply({
      content: `❌ **Failed to claim next test:** ${err.message}`,
    });
  }
}
