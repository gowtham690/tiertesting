import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { backendClient } from '../api/backendClient.js';
import { DEFAULT_GAMEMODES, GamemodeId } from '@tiertesting/shared';
import { TIER_BADGES, TIER_COLORS } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('tiers')
  .setDescription("View a player's official tier standings across all gamemodes")
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('Discord user to inspect (defaults to yourself)')
      .setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName('ign')
      .setDescription('Minecraft in-game name to inspect')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const user = interaction.options.getUser('user');
  const ign = interaction.options.getString('ign');

  const identifier = ign || (user ? user.id : interaction.user.id);

  try {
    const profile = await backendClient.getPlayerProfile(identifier);
    const color = TIER_COLORS[profile.highestTier] || 0x5865f2;

    const embed = new EmbedBuilder()
      .setTitle(`⚔️ Competitive Tier Standings • ${profile.minecraftName}`)
      .setDescription(
        `Highest Tier: ${TIER_BADGES[profile.highestTier]}\n` +
        `Discord: <@${profile.discordId}> • IGN: \`${profile.minecraftName}\``
      )
      .setColor(color)
      .setThumbnail(`https://minotar.net/helm/${profile.minecraftName}/100.png`)
      .setTimestamp();

    for (const [id, gm] of Object.entries(DEFAULT_GAMEMODES)) {
      const tierData = profile.tiers[id as GamemodeId];
      const tierBadge = tierData ? TIER_BADGES[tierData.tier] : '⚪ *Unranked*';
      const points = tierData ? `${tierData.points} pts` : '0 pts';

      let cooldownText = '';
      if (profile.retestCooldownExpiresAt?.[id as GamemodeId]) {
        const expiryUnix = Math.floor(
          new Date(profile.retestCooldownExpiresAt[id as GamemodeId]).getTime() / 1000
        );
        cooldownText = ` • ⏳ Retest: <t:${expiryUnix}:R>`;
      }

      embed.addFields({
        name: `${gm.emoji} ${gm.name}`,
        value: `${tierBadge} (\`${points}\`)${cooldownText}`,
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    await interaction.editReply({
      content: `❌ **Failed to retrieve tiers:** ${err.message}`,
    });
  }
}
