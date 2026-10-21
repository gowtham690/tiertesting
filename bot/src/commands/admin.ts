import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { backendClient } from '../api/backendClient.js';
import { DEFAULT_GAMEMODES } from '@tiertesting/shared';

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('MCTiers testing administrative operations')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup((group) =>
    group
      .setName('tester')
      .setDescription('Manage testing staff')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Authorize a user as a tester')
          .addUserOption((opt) =>
            opt.setName('user').setDescription('Discord user to promote').setRequired(true)
          )
          .addStringOption((opt) =>
            opt
              .setName('role')
              .setDescription('Tester rank tier')
              .setRequired(false)
              .addChoices(
                { name: 'Tester', value: 'TESTER' },
                { name: 'Head Tester', value: 'HEAD_TESTER' },
                { name: 'Admin', value: 'ADMIN' }
              )
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Revoke tester permissions from a user')
          .addUserOption((opt) =>
            opt.setName('user').setDescription('Discord user to demote').setRequired(true)
          )
      )
  )
  .addSubcommandGroup((group) =>
    group
      .setName('blacklist')
      .setDescription('Manage player blacklist')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Blacklist a player from testing')
          .addStringOption((opt) =>
            opt.setName('identifier').setDescription('Discord ID, IGN, or UUID').setRequired(true)
          )
          .addStringOption((opt) =>
            opt.setName('reason').setDescription('Reason for blacklisting').setRequired(false)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Remove a player from the blacklist')
          .addStringOption((opt) =>
            opt.setName('identifier').setDescription('Discord ID, IGN, or UUID').setRequired(true)
          )
      )
  )
  .addSubcommandGroup((group) =>
    group
      .setName('gamemode')
      .setDescription('Manage gamemodes')
      .addSubcommand((sub) =>
        sub
          .setName('toggle')
          .setDescription('Enable or disable a gamemode')
          .addStringOption((opt) =>
            opt
              .setName('gamemode')
              .setDescription('Gamemode to toggle')
              .setRequired(true)
              .addChoices(
                ...Object.values(DEFAULT_GAMEMODES).map((gm) => ({
                  name: `${gm.emoji} ${gm.name}`,
                  value: gm.id,
                }))
              )
          )
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const group = interaction.options.getSubcommandGroup();
  const sub = interaction.options.getSubcommand();

  try {
    if (group === 'tester') {
      const user = interaction.options.getUser('user', true);

      if (sub === 'add') {
        const role = interaction.options.getString('role') || 'TESTER';
        await backendClient.setTesterRole(user.id, role, true);
        await interaction.editReply(`✅ Successfully granted **${role}** permissions to <@${user.id}>.`);
      } else if (sub === 'remove') {
        await backendClient.setTesterRole(user.id, 'TESTER', false);
        await interaction.editReply(`✅ Deactivated tester status for <@${user.id}>.`);
      }
    } else if (group === 'blacklist') {
      const identifier = interaction.options.getString('identifier', true);
      const profile = await backendClient.getPlayerProfile(identifier);

      if (sub === 'add') {
        const reason = interaction.options.getString('reason') || 'Administrative blacklist';
        await backendClient.blacklistPlayer(profile.id, true, reason);
        await interaction.editReply(`🚫 Blacklisted **${profile.minecraftName}** (<@${profile.discordId}>). Reason: ${reason}`);
      } else if (sub === 'remove') {
        await backendClient.blacklistPlayer(profile.id, false);
        await interaction.editReply(`✅ Removed **${profile.minecraftName}** from blacklist.`);
      }
    } else if (group === 'gamemode') {
      const gamemodeId = interaction.options.getString('gamemode', true);
      const updated = (await backendClient.toggleGamemode(gamemodeId)) as { id: string; enabled: boolean };
      await interaction.editReply(`⚙️ Gamemode **${gamemodeId}** is now **${updated.enabled ? 'ENABLED' : 'DISABLED'}**.`);
    }
  } catch (err: any) {
    await interaction.editReply(`❌ **Admin operation failed:** ${err.message}`);
  }
}
