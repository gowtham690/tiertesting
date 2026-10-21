import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from 'discord.js';
import { backendClient } from '../api/backendClient.js';
import { createSubmitModal } from '../components/submitModal.js';
import { createResultAnnouncementEmbed } from '../utils/embeds.js';
import { syncPlayerTierRole } from '../services/roleSync.js';
import { updateQueuePanel } from '../services/queueUpdater.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('submit')
  .setDescription('Submit official match score and assign tier (Testers only)')
  .addIntegerOption((opt) =>
    opt
      .setName('player_score')
      .setDescription('Points/rounds won by the player')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(20)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('tester_score')
      .setDescription('Points/rounds won by the tester')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(20)
  )
  .addStringOption((opt) =>
    opt
      .setName('notes')
      .setDescription('Optional feedback or notes')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const playerScore = interaction.options.getInteger('player_score');
  const testerScore = interaction.options.getInteger('tester_score');
  const notes = interaction.options.getString('notes') || undefined;

  // If scores are omitted, show interactive modal
  if (playerScore === null || testerScore === null) {
    const modal = createSubmitModal();
    return interaction.showModal(modal);
  }

  await interaction.deferReply();

  try {
    // Submit result to backend
    const result = await backendClient.submitTestResult({
      testerDiscordId: interaction.user.id,
      playerScore,
      testerScore,
      notes,
    });

    // Create result announcement embed
    const resultEmbed = createResultAnnouncementEmbed(result);

    // 1. Post embed in this ticket channel
    await interaction.editReply({
      content: `🎉 **Match result submitted successfully!**`,
      embeds: [resultEmbed],
    });

    // 2. Post embed in global results channel if configured
    if (config.resultsChannelId) {
      try {
        const resultsChannel = (await interaction.client.channels.fetch(
          config.resultsChannelId
        )) as TextChannel | null;
        if (resultsChannel?.isTextBased()) {
          await resultsChannel.send({ embeds: [resultEmbed] });
        }
      } catch (err) {
        console.error('Failed to post in results channel:', err);
      }
    }

    // 3. Sync player's Discord role
    if (interaction.guild) {
      await syncPlayerTierRole(interaction.guild, result.player.discordId, result.newTier);
    }

    // 4. Update queue panel
    await updateQueuePanel(interaction.client);
  } catch (err: any) {
    await interaction.editReply({
      content: `❌ **Failed to submit result:** ${err.message}`,
    });
  }
}
