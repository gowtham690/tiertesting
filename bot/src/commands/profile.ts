import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { backendClient } from '../api/backendClient.js';
import { createPlayerProfileEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription("View a player's Minecraft link and competitive tier summary")
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('Discord user to look up (defaults to yourself)')
      .setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName('ign')
      .setDescription('Minecraft in-game name or UUID to look up')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const user = interaction.options.getUser('user');
  const ign = interaction.options.getString('ign');

  const identifier = ign || (user ? user.id : interaction.user.id);

  try {
    const profile = await backendClient.getPlayerProfile(identifier);
    const embed = createPlayerProfileEmbed(profile);

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    await interaction.editReply({
      content: `❌ **Profile not found:** ${err.message || 'Player is not registered or linked.'}`,
    });
  }
}
