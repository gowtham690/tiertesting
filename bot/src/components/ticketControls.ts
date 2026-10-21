import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function createTicketControlButtons(testId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_submit:${testId}`)
      .setLabel('Submit Result')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ticket_cancel:${testId}`)
      .setLabel('Cancel Match')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ticket_close:${testId}`)
      .setLabel('Close Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}
