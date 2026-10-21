import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { backendClient } from '../api/backendClient.js';

export const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Link your Minecraft account to Discord using your in-game code')
  .addStringOption((option) =>
    option
      .setName('code')
      .setDescription('The 6-character link code generated in-game via /link')
      .setRequired(true)
      .setMaxLength(8)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const code = interaction.options.getString('code', true).trim();
  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await backendClient.verifyLinkCode(code, interaction.user.id);
    const embed = new EmbedBuilder()
      .setTitle('✅ Account Successfully Linked')
      .setDescription(
        `Your Discord account has been linked to Minecraft account **${res.player.minecraftName}**!\n\n` +
        `UUID: \`${res.player.minecraftUuid}\`\n\n` +
        `You can now join competitive queues using the queue panel or \`/queue join\`!`
      )
      .setColor(0x55ff55)
      .setThumbnail(`https://minotar.net/helm/${res.player.minecraftName}/100.png`);

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    await interaction.editReply({
      content: `❌ **Failed to link account:** ${err.message || 'Invalid or expired code. Please generate a new code in-game using /link.'}`,
    });
  }
}
