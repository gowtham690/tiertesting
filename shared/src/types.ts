export type Tier =
  | 'UNRANKED'
  | 'LT5'
  | 'HT5'
  | 'LT4'
  | 'HT4'
  | 'LT3'
  | 'HT3'
  | 'LT2'
  | 'HT2'
  | 'LT1'
  | 'HT1';

export const ORDERED_TIERS: Tier[] = [
  'LT5',
  'HT5',
  'LT4',
  'HT4',
  'LT3',
  'HT3',
  'LT2',
  'HT2',
  'LT1',
  'HT1',
];

export const TIER_RANKS: Record<Tier, number> = {
  UNRANKED: 0,
  LT5: 1,
  HT5: 2,
  LT4: 3,
  HT4: 4,
  LT3: 5,
  HT3: 6,
  LT2: 7,
  HT2: 8,
  LT1: 9,
  HT1: 10,
};

export const TIER_POINTS: Record<Tier, number> = {
  UNRANKED: 0,
  LT5: 100,
  HT5: 200,
  LT4: 300,
  HT4: 400,
  LT3: 500,
  HT3: 600,
  LT2: 700,
  HT2: 800,
  LT1: 900,
  HT1: 1000,
};

export type GamemodeId =
  | 'sword'
  | 'crystal'
  | 'pot'
  | 'axe'
  | 'smp'
  | 'uhc'
  | 'mace';

export interface GamemodeInfo {
  id: GamemodeId;
  name: string;
  description: string;
  emoji: string;
  enabled: boolean;
  maxRounds: number;
}

export const DEFAULT_GAMEMODES: Record<GamemodeId, GamemodeInfo> = {
  sword: {
    id: 'sword',
    name: 'Sword',
    description: '1.21 Sword PvP with shields and regeneration',
    emoji: '⚔️',
    enabled: true,
    maxRounds: 10,
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal',
    description: 'End Crystal & Respawn Anchor combat',
    emoji: '🔮',
    enabled: true,
    maxRounds: 7,
  },
  pot: {
    id: 'pot',
    name: 'Pot (Nodebuff)',
    description: 'Speed II, Strength, splash health potions',
    emoji: '🧪',
    enabled: true,
    maxRounds: 7,
  },
  axe: {
    id: 'axe',
    name: 'Axe',
    description: 'Shield disable and Axe critical hits',
    emoji: '🪓',
    enabled: true,
    maxRounds: 7,
  },
  smp: {
    id: 'smp',
    name: 'SMP Kit',
    description: 'Survival Multiplayer kit combat',
    emoji: '🛡️',
    enabled: true,
    maxRounds: 7,
  },
  uhc: {
    id: 'uhc',
    name: 'UHC',
    description: 'Golden heads, gapples, rod and bow PvP',
    emoji: '🍎',
    enabled: true,
    maxRounds: 7,
  },
  mace: {
    id: 'mace',
    name: 'Mace',
    description: '1.21 Mace combat and Wind Charge aerial mechanics',
    emoji: '🔨',
    enabled: true,
    maxRounds: 7,
  },
};

export type QueueStatus = 'WAITING' | 'TESTING' | 'COMPLETED' | 'CANCELLED';

export interface QueueEntry {
  id: string;
  playerId: string;
  discordId: string;
  minecraftUuid: string;
  minecraftName: string;
  gamemodeId: GamemodeId;
  region: string;
  status: QueueStatus;
  joinedAt: string;
  ticketChannelId?: string;
  testerId?: string;
}

export type TestStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'VOIDED';

export interface TestResultSubmission {
  testId?: string;
  playerId: string;
  testerId: string; // discordId or tester DB id
  gamemodeId: GamemodeId;
  playerScore: number;
  testerScore: number;
  testerTier: Tier;
  notes?: string;
}

export interface CalculatedTierResult {
  oldTier: Tier;
  newTier: Tier;
  pointsDelta: number;
  newPoints: number;
  cappedByJumpRule: boolean;
  reason: string;
}

export interface PlayerProfile {
  id: string;
  discordId: string;
  minecraftUuid: string;
  minecraftName: string;
  linkedAt: string;
  tiers: Record<GamemodeId, { tier: Tier; points: number; lastTestedAt?: string }>;
  highestTier: Tier;
  isTester: boolean;
  testerRole?: 'TESTER' | 'HEAD_TESTER' | 'ADMIN';
  isBlacklisted: boolean;
  retestCooldownExpiresAt?: Record<GamemodeId, string>;
}
