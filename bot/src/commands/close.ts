import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from 'discord.js';
import { closeTicketChannel } from '../services/ticketManager.js';

export const data = new SlashCommandBuilder()
  .setName('close')
  .setDescription('Close and archive the current test ticket channel')
  .addIntegerOption((opt) =>
    opt
      .setName('delay')
      .setDescription('Seconds to wait before deleting channel (default: 5)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(60)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || !(channel instanceof TextChannel)) {
    return interaction.reply({ content: '❌ Invalid channel.', ephemeral: true });
  }

  if (!channel.name.startsWith('test-')) {
    return interaction.reply({
      content: '❌ This command can only be used inside a test ticket channel.',
      ephemeral: true,
    });
  }

  const delay = interaction.options.getInteger('delay') || 5;

  await interaction.reply({
    content: `🔒 Ticket close requested by <@${interaction.user.id}>. Channel will be deleted in ${delay} seconds.`,
  });

  await closeTicketChannel(channel, delay);
}
