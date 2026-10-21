import { config } from '../config.js';
import {
  GamemodeId,
  PlayerProfile,
  Tier,
} from '@tiertesting/shared';

export interface QueueStatusResponse {
  gamemodes: Array<{
    gamemodeId: GamemodeId;
    name: string;
    emoji: string;
    waitingCount: number;
    waitingPlayers: Array<{
      queueId: string;
      position: number;
      discordId: string;
      minecraftName: string;
      region: string;
      joinedAt: string;
    }>;
  }>;
  activeTestsCount: number;
  activeTests: Array<{
    testId: string;
    gamemodeId: GamemodeId;
    playerDiscordId: string;
    playerName: string;
    testerDiscordId: string;
    startedAt: string;
  }>;
}

export interface ClaimResult {
  success: boolean;
  testId: string;
  queueEntryId: string;
  gamemode: {
    id: GamemodeId;
    name: string;
    maxRounds: number;
  };
  player: {
    id: string;
    discordId: string;
    minecraftName: string;
    minecraftUuid: string;
    currentTier: Tier;
  };
  tester: {
    discordId: string;
    tier: Tier;
  };
}

export interface SubmitResultResponse {
  success: boolean;
  testId: string;
  gamemode: string;
  gamemodeId: GamemodeId;
  player: {
    discordId: string;
    minecraftName: string;
  };
  score: {
    playerScore: number;
    testerScore: number;
  };
  testerTier: Tier;
  oldTier: Tier;
  newTier: Tier;
  points: number;
  pointsDelta: number;
  cappedByJumpRule: boolean;
  reason: string;
  completedAt: string;
}

class BackendClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.backendUrl;
    this.apiKey = config.botApiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `Request failed with status ${res.status}`;
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }

    return data as T;
  }

  // Account Linking
  async verifyLinkCode(code: string, discordId: string) {
    return this.request<{ success: boolean; player: any }>('/auth/link/verify', {
      method: 'POST',
      body: JSON.stringify({ code, discordId }),
    });
  }

  // Players
  async getPlayerProfile(identifier: string): Promise<PlayerProfile> {
    return this.request<PlayerProfile>(`/players/${identifier}`);
  }

  async blacklistPlayer(playerId: string, blacklisted: boolean, reason?: string) {
    return this.request(`/players/${playerId}/blacklist`, {
      method: 'POST',
      body: JSON.stringify({ blacklisted, reason }),
    });
  }

  // Queues
  async getQueueStatus(): Promise<QueueStatusResponse> {
    return this.request<QueueStatusResponse>('/queues/status');
  }

  async joinQueue(discordId: string, gamemodeId: string, region = 'NA') {
    return this.request<{
      success: boolean;
      queueId: string;
      position: number;
      gamemode: string;
      minecraftName: string;
    }>('/queues/join', {
      method: 'POST',
      body: JSON.stringify({ discordId, gamemodeId, region }),
    });
  }

  async leaveQueue(discordId: string, gamemodeId?: string) {
    return this.request<{ success: boolean; removedCount: number }>('/queues/leave', {
      method: 'POST',
      body: JSON.stringify({ discordId, gamemodeId }),
    });
  }

  async claimNext(testerDiscordId: string, gamemodeId?: string, ticketChannelId?: string): Promise<ClaimResult> {
    return this.request<ClaimResult>('/queues/claim', {
      method: 'POST',
      body: JSON.stringify({ testerDiscordId, gamemodeId, ticketChannelId }),
    });
  }

  // Tests
  async submitTestResult(data: {
    testId?: string;
    testerDiscordId: string;
    playerDiscordId?: string;
    gamemodeId?: string;
    playerScore: number;
    testerScore: number;
    notes?: string;
  }): Promise<SubmitResultResponse> {
    return this.request<SubmitResultResponse>('/tests/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelTest(testId: string, reason?: string) {
    return this.request(`/tests/${testId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getTestHistory(params: { playerDiscordId?: string; gamemodeId?: string; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.playerDiscordId) query.set('playerDiscordId', params.playerDiscordId);
    if (params.gamemodeId) query.set('gamemodeId', params.gamemodeId);
    if (params.limit) query.set('limit', params.limit.toString());
    return this.request<any[]>(`/tests/history?${query.toString()}`);
  }

  // Gamemodes
  async getGamemodes() {
    return this.request<any[]>('/gamemodes');
  }

  async toggleGamemode(id: string) {
    return this.request(`/gamemodes/${id}/toggle`, { method: 'PUT' });
  }

  // Testers
  async setTesterRole(discordId: string, role: string, active = true) {
    return this.request('/testers', {
      method: 'POST',
      body: JSON.stringify({ discordId, role, active }),
    });
  }

  async getTester(discordId: string) {
    return this.request<any>(`/testers/${discordId}`);
  }
}

export const backendClient = new BackendClient();
