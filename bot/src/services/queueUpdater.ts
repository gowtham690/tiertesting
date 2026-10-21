import { Client, TextChannel, Message } from 'discord.js';
import { backendClient } from '../api/backendClient.js';
import { config } from '../config.js';
import { createQueuePanelEmbed } from '../utils/embeds.js';
import { createQueueButtons } from '../components/queuePanel.js';

let lastQueueMessageId: string | null = null;

export async function updateQueuePanel(client: Client): Promise<void> {
  if (!config.queueChannelId) return;

  try {
    const channel = (await client.channels.fetch(config.queueChannelId)) as TextChannel | null;
    if (!channel || !channel.isTextBased()) return;

    const queueStatus = await backendClient.getQueueStatus();
    const embed = createQueuePanelEmbed(queueStatus);
    const buttons = createQueueButtons();

    if (lastQueueMessageId) {
      try {
        const msg = await channel.messages.fetch(lastQueueMessageId);
        if (msg) {
          await msg.edit({ embeds: [embed], components: buttons });
          return;
        }
      } catch {
        // Message might have been deleted, fallback to search or create
      }
    }

    // Check recent messages for existing bot queue panel
    const recentMessages = await channel.messages.fetch({ limit: 10 });
    const existing = recentMessages.find(
      (m) => m.author.id === client.user?.id && m.embeds.length > 0 && m.embeds[0]?.title?.includes('Competitive Tier Testing Queue')
    );

    if (existing) {
      lastQueueMessageId = existing.id;
      await existing.edit({ embeds: [embed], components: buttons });
    } else {
      const sent = await channel.send({ embeds: [embed], components: buttons });
      lastQueueMessageId = sent.id;
    }
  } catch (err) {
    console.error('Error updating queue panel:', err);
  }
}

export function startQueueUpdater(client: Client, intervalSeconds = 15) {
  // Update immediately
  updateQueuePanel(client);

  // Periodic polling / refreshing
  return setInterval(() => {
    updateQueuePanel(client);
  }, intervalSeconds * 1000);
}
