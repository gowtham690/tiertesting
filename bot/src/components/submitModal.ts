import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export function createSubmitModal(testId?: string): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`modal_submit_result:${testId || ''}`)
    .setTitle('Submit Match Test Result');

  const playerScoreInput = new TextInputBuilder()
    .setCustomId('player_score')
    .setLabel('Player Score (Rounds Won)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 7')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2);

  const testerScoreInput = new TextInputBuilder()
    .setCustomId('tester_score')
    .setLabel('Tester Score (Rounds Won)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 3')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2);

  const notesInput = new TextInputBuilder()
    .setCustomId('notes')
    .setLabel('Tester Notes / Feedback (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Mechanics, movement, inventory management, or advice...')
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(playerScoreInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(testerScoreInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
  );

  return modal;
}
