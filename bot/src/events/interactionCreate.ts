import {
  Interaction,
  TextChannel,
} from 'discord.js';
import { backendClient } from '../api/backendClient.js';
import { updateQueuePanel } from '../services/queueUpdater.js';
import { createSubmitModal } from '../components/submitModal.js';
import { createResultAnnouncementEmbed } from '../utils/embeds.js';
import { syncPlayerTierRole } from '../services/roleSync.js';
import { closeTicketChannel } from '../services/ticketManager.js';
import { config } from '../config.js';

export async function handleInteraction(interaction: Interaction, commands: Map<string, any>) {
  // 1. Slash Commands
  if (interaction.isChatInputCommand()) {
    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;

    try {
      await cmd.execute(interaction);
    } catch (err: any) {
      console.error(`Error executing /${interaction.commandName}:`, err);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: `❌ An unexpected error occurred while executing this command: ${err.message}`,
        }).catch(() => null);
      } else {
        await interaction.reply({
          content: `❌ An unexpected error occurred while executing this command: ${err.message}`,
          ephemeral: true,
        }).catch(() => null);
      }
    }
    return;
  }

  // 2. Button clicks
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // Queue buttons: queue_join_sword, queue_join_crystal, etc.
    if (customId.startsWith('queue_join_')) {
      await interaction.deferReply({ ephemeral: true });
      const gamemodeId = customId.replace('queue_join_', '');

      try {
        const res = await backendClient.joinQueue(interaction.user.id, gamemodeId);
        await updateQueuePanel(interaction.client);

        await interaction.editReply({
          content: `✅ Joined queue for **${res.gamemode}**! Position: \`#${res.position}\`. IGN: \`${res.minecraftName}\`.`,
        });
      } catch (err: any) {
        await interaction.editReply({
          content: `❌ **Cannot join queue:** ${err.message}`,
        });
      }
      return;
    }

    // Leave queue button
    if (customId === 'queue_leave') {
      await interaction.deferReply({ ephemeral: true });
      try {
        await backendClient.leaveQueue(interaction.user.id);
        await updateQueuePanel(interaction.client);
        await interaction.editReply({ content: '✅ You have left the queue.' });
      } catch (err: any) {
        await interaction.editReply({
          content: `❌ **Error leaving queue:** ${err.message}`,
        });
      }
      return;
    }

    // Ticket buttons
    if (customId.startsWith('ticket_submit:')) {
      const testId = customId.replace('ticket_submit:', '');
      const modal = createSubmitModal(testId);
      await interaction.showModal(modal);
      return;
    }

    if (customId.startsWith('ticket_cancel:')) {
      const testId = customId.replace('ticket_cancel:', '');
      await interaction.deferReply();

      try {
        await backendClient.cancelTest(testId, `Cancelled by <@${interaction.user.id}>`);
        await updateQueuePanel(interaction.client);
        await interaction.editReply('❌ **Test session cancelled.** You can now safely close this ticket.');
      } catch (err: any) {
        await interaction.editReply(`❌ Failed to cancel test: ${err.message}`);
      }
      return;
    }

    if (customId.startsWith('ticket_close:')) {
      if (interaction.channel instanceof TextChannel) {
        await interaction.reply('🔒 Close requested via button.');
        await closeTicketChannel(interaction.channel, 5);
      }
      return;
    }
  }

  // 3. Modals
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('modal_submit_result:')) {
      const testId = interaction.customId.replace('modal_submit_result:', '') || undefined;
      await interaction.deferReply();

      const rawPlayerScore = interaction.fields.getTextInputValue('player_score').trim();
      const rawTesterScore = interaction.fields.getTextInputValue('tester_score').trim();
      const notes = interaction.fields.getTextInputValue('notes') || undefined;

      const playerScore = parseInt(rawPlayerScore, 10);
      const testerScore = parseInt(rawTesterScore, 10);

      if (isNaN(playerScore) || isNaN(testerScore) || playerScore < 0 || testerScore < 0) {
        return interaction.editReply('❌ Scores must be non-negative whole numbers.');
      }

      try {
        const result = await backendClient.submitTestResult({
          testId: testId || undefined,
          testerDiscordId: interaction.user.id,
          playerScore,
          testerScore,
          notes,
        });

        const resultEmbed = createResultAnnouncementEmbed(result);

        // 1. Announce in ticket channel
        await interaction.editReply({
          content: `🎉 **Match result submitted successfully!**`,
          embeds: [resultEmbed],
        });

        // 2. Announce in results channel if set
        if (config.resultsChannelId) {
          try {
            const resultsChannel = (await interaction.client.channels.fetch(
              config.resultsChannelId
            )) as TextChannel | null;
            if (resultsChannel?.isTextBased()) {
              await resultsChannel.send({ embeds: [resultEmbed] });
            }
          } catch (err) {
            console.error('Failed to post result in results channel:', err);
          }
        }

        // 3. Sync Discord role
        if (interaction.guild) {
          await syncPlayerTierRole(interaction.guild, result.player.discordId, result.newTier);
        }

        // 4. Update queue panel
        await updateQueuePanel(interaction.client);
      } catch (err: any) {
        await interaction.editReply(`❌ **Failed to submit result:** ${err.message}`);
      }
    }
  }
}
