import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { backendClient } from '../api/backendClient.js';
import { updateQueuePanel } from '../services/queueUpdater.js';
import { DEFAULT_GAMEMODES, GamemodeId } from '@tiertesting/shared';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Manage your competitive tier testing queue status')
  .addSubcommand((sub) =>
    sub
      .setName('join')
      .setDescription('Join the testing queue for a specific gamemode')
      .addStringOption((opt) =>
        opt
          .setName('gamemode')
          .setDescription('The gamemode you want to be tested in')
          .setRequired(true)
          .addChoices(
            ...Object.values(DEFAULT_GAMEMODES).map((gm) => ({
              name: `${gm.emoji} ${gm.name}`,
              value: gm.id,
            }))
          )
      )
      .addStringOption((opt) =>
        opt
          .setName('region')
          .setDescription('Preferred testing server region')
          .setRequired(false)
          .addChoices(
            { name: 'North America (NA)', value: 'NA' },
            { name: 'Europe (EU)', value: 'EU' },
            { name: 'Asia (AS)', value: 'AS' }
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('leave')
      .setDescription('Leave your current waiting queue')
      .addStringOption((opt) =>
        opt
          .setName('gamemode')
          .setDescription('Leave a specific gamemode queue (or all)')
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('panel')
      .setDescription('Post or refresh the live interactive queue panel (Admin/Staff only)')
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'join') {
    await interaction.deferReply({ ephemeral: true });
    const gamemode = interaction.options.getString('gamemode', true);
    const region = interaction.options.getString('region') || 'NA';

    try {
      const res = await backendClient.joinQueue(interaction.user.id, gamemode, region);
      await updateQueuePanel(interaction.client);

      const embed = new EmbedBuilder()
        .setTitle('✅ Joined Queue')
        .setDescription(
          `You have joined the queue for **${res.gamemode}**!\n` +
          `• Position in line: \`#${res.position}\`\n` +
          `• Minecraft IGN: \`${res.minecraftName}\`\n` +
          `• Region: \`${region}\`\n\n` +
          `You will be pinged when a tester claims your match!`
        )
        .setColor(0x55ff55);

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({
        content: `❌ **Could not join queue:** ${err.message}`,
      });
    }
  } else if (subcommand === 'leave') {
    await interaction.deferReply({ ephemeral: true });
    const gamemode = interaction.options.getString('gamemode') || undefined;

    try {
      await backendClient.leaveQueue(interaction.user.id, gamemode);
      await updateQueuePanel(interaction.client);

      await interaction.editReply({
        content: '✅ You have left the queue.',
      });
    } catch (err: any) {
      await interaction.editReply({
        content: `❌ **Error leaving queue:** ${err.message}`,
      });
    }
  } else if (subcommand === 'panel') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ You must have Manage Server permissions to spawn the queue panel.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    await updateQueuePanel(interaction.client);
    await interaction.editReply({
      content: '✅ Queue panel has been refreshed in the configured queue channel.',
    });
  }
}
