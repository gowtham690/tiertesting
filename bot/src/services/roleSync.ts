import { Guild, GuildMember } from 'discord.js';
import { ORDERED_TIERS, Tier } from '@tiertesting/shared';

export async function syncPlayerTierRole(
  guild: Guild,
  discordId: string,
  newTier: Tier
): Promise<void> {
  if (newTier === 'UNRANKED') return;

  try {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return;

    // Find all tier roles in guild
    const tierRoleMap = new Map<string, string>(); // 'HT1' -> roleId
    for (const t of ORDERED_TIERS) {
      const role = guild.roles.cache.find((r) => r.name.toUpperCase() === t.toUpperCase());
      if (role) {
        tierRoleMap.set(t, role.id);
      }
    }

    const targetRoleId = tierRoleMap.get(newTier);

    // Remove any other tier roles the user currently has
    const rolesToRemove: string[] = [];
    for (const [tier, roleId] of tierRoleMap.entries()) {
      if (tier !== newTier && member.roles.cache.has(roleId)) {
        rolesToRemove.push(roleId);
      }
    }

    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove, `Tier updated to ${newTier}`);
    }

    // Add target role if not already present
    if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
      await member.roles.add(targetRoleId, `Achieved tier ${newTier}`);
    }
  } catch (err) {
    console.error(`Failed to sync tier role for ${discordId}:`, err);
  }
}
