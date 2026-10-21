import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function createQueueButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('queue_join_sword')
      .setLabel('Sword')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('queue_join_crystal')
      .setLabel('Crystal')
      .setEmoji('🔮')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('queue_join_pot')
      .setLabel('Pot (Nodebuff)')
      .setEmoji('🧪')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('queue_join_axe')
      .setLabel('Axe')
      .setEmoji('🪓')
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('queue_join_smp')
      .setLabel('SMP')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue_join_uhc')
      .setLabel('UHC')
      .setEmoji('🍎')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue_join_mace')
      .setLabel('Mace')
      .setEmoji('🔨')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue_leave')
      .setLabel('Leave Queue')
      .setEmoji('🚪')
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}
