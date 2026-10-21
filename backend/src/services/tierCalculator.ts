import {
  Tier,
  TIER_RANKS,
  ORDERED_TIERS,
  CalculatedTierResult,
  TestResultSubmission,
} from '@tiertesting/shared';

export interface TierCalculatorConfig {
  maxTierJump: number;
  allowDeranking: boolean;
  maxInitialPlacementTier: Tier;
}

const DEFAULT_CONFIG: TierCalculatorConfig = {
  maxTierJump: 2,
  allowDeranking: true,
  maxInitialPlacementTier: 'HT3',
};

/**
 * Converts a numeric rank (1..10) to the corresponding Tier enum.
 */
export function rankToTier(rank: number): Tier {
  const clamped = Math.max(1, Math.min(10, Math.round(rank)));
  return ORDERED_TIERS[clamped - 1] ?? 'LT5';
}

/**
 * Calculates the resulting tier based on match performance, tester tier, and current tier.
 */
export function calculateTierResult(
  submission: TestResultSubmission,
  currentTier: Tier = 'UNRANKED',
  config: Partial<TierCalculatorConfig> = {}
): CalculatedTierResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { playerScore, testerScore, testerTier } = submission;

  const totalRounds = playerScore + testerScore;
  if (totalRounds <= 0) {
    throw new Error('Total rounds played must be greater than zero.');
  }

  const testerRank = TIER_RANKS[testerTier];
  if (!testerRank || testerRank <= 0) {
    throw new Error(`Invalid tester tier: ${testerTier}`);
  }

  const playerWinRatio = playerScore / totalRounds;
  const scoreDiff = playerScore - testerScore;

  // Determine tentative target rank based on performance vs the tester
  let targetRank: number;

  if (scoreDiff > 0) {
    // Player won the match
    if (playerWinRatio >= 0.7) {
      // Dominant victory against tester (e.g., 7-0 to 7-2)
      targetRank = Math.min(10, testerRank + 1);
    } else {
      // Solid victory (e.g., 7-3 to 7-5)
      targetRank = testerRank;
    }
  } else if (scoreDiff === 0) {
    // Exact draw against tester
    targetRank = Math.max(1, testerRank - 1);
  } else {
    // Player lost to tester
    if (playerWinRatio >= 0.4) {
      // Close match loss (e.g., 5-7, 6-7)
      targetRank = Math.max(1, testerRank - 1);
    } else if (playerWinRatio >= 0.2) {
      // Moderate loss (e.g., 2-7, 3-7)
      targetRank = Math.max(1, testerRank - 2);
    } else {
      // Heavy loss (e.g., 0-7, 1-7)
      targetRank = Math.max(1, testerRank - 3);
    }
  }

  let finalRank = targetRank;
  let cappedByJumpRule = false;
  let reason = '';

  const oldRank = TIER_RANKS[currentTier];

  if (currentTier === 'UNRANKED' || oldRank === 0) {
    // First time placement
    const maxInitialRank = TIER_RANKS[cfg.maxInitialPlacementTier];
    if (finalRank > maxInitialRank) {
      finalRank = maxInitialRank;
      cappedByJumpRule = true;
      reason = `Initial placement capped at ${cfg.maxInitialPlacementTier}.`;
    } else {
      reason = `Initial placement based on ${playerScore}-${testerScore} vs ${testerTier}.`;
    }
  } else {
    // Re-test for an existing tier
    const rankDelta = targetRank - oldRank;

    if (rankDelta > cfg.maxTierJump) {
      finalRank = oldRank + cfg.maxTierJump;
      cappedByJumpRule = true;
      reason = `Promotion capped by max jump limit of +${cfg.maxTierJump} tiers.`;
    } else if (rankDelta < -cfg.maxTierJump && cfg.allowDeranking) {
      finalRank = oldRank - cfg.maxTierJump;
      cappedByJumpRule = true;
      reason = `Demotion capped by max jump limit of -${cfg.maxTierJump} tiers.`;
    } else if (!cfg.allowDeranking && rankDelta < 0) {
      finalRank = oldRank;
      cappedByJumpRule = true;
      reason = `De-ranking is disabled; tier retained.`;
    } else {
      reason = `Standard test result: ${playerScore}-${testerScore} vs ${testerTier}.`;
    }
  }

  // Ensure rank within 1..10
  finalRank = Math.max(1, Math.min(10, finalRank));

  const newTier = rankToTier(finalRank);
  const basePoints = finalRank * 100;
  // Performance sub-points from 0 to 99 based on win ratio
  const performanceBonus = Math.round(playerWinRatio * 99);
  const newPoints = basePoints + performanceBonus;

  const oldPoints = oldRank * 100;
  const pointsDelta = newPoints - oldPoints;

  return {
    oldTier: currentTier,
    newTier,
    pointsDelta,
    newPoints,
    cappedByJumpRule,
    reason,
  };
}
