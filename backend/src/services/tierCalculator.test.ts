import { describe, it, expect } from 'vitest';
import { calculateTierResult, rankToTier } from './tierCalculator.js';
import { TIER_RANKS } from '@tiertesting/shared';

describe('tierCalculator', () => {
  it('correctly maps ranks to tiers', () => {
    expect(rankToTier(1)).toBe('LT5');
    expect(rankToTier(2)).toBe('HT5');
    expect(rankToTier(9)).toBe('LT1');
    expect(rankToTier(10)).toBe('HT1');
  });

  describe('Initial placement (from UNRANKED)', () => {
    it('places player at HT3 if dominant victory against HT4 tester', () => {
      const result = calculateTierResult(
        {
          playerId: 'p1',
          testerId: 't1',
          gamemodeId: 'sword',
          playerScore: 7,
          testerScore: 1,
          testerTier: 'HT4', // Rank 4 -> Target rank 5 (LT3)
        },
        'UNRANKED'
      );
      expect(result.newTier).toBe('LT3');
      expect(result.oldTier).toBe('UNRANKED');
    });

    it('caps initial placement at maxInitialPlacementTier (HT3)', () => {
      const result = calculateTierResult(
        {
          playerId: 'p1',
          testerId: 't1',
          gamemodeId: 'sword',
          playerScore: 10,
          testerScore: 0,
          testerTier: 'HT1', // Rank 10
        },
        'UNRANKED',
        { maxInitialPlacementTier: 'HT3' }
      );
      // Target would be 10, but capped at HT3 (rank 6)
      expect(result.newTier).toBe('HT3');
      expect(result.cappedByJumpRule).toBe(true);
    });

    it('places low when heavily defeated by tester', () => {
      const result = calculateTierResult(
        {
          playerId: 'p1',
          testerId: 't1',
          gamemodeId: 'pot',
          playerScore: 0,
          testerScore: 7,
          testerTier: 'LT3', // Rank 5 -> 5 - 3 = Rank 2 (HT5)
        },
        'UNRANKED'
      );
      expect(result.newTier).toBe('HT5');
    });
  });

  describe('Ranked player testing & jump rules', () => {
    it('caps rank jump by maxTierJump (+2 max)', () => {
      const result = calculateTierResult(
        {
          playerId: 'p1',
          testerId: 't1',
          gamemodeId: 'axe',
          playerScore: 7,
          testerScore: 0,
          testerTier: 'HT1', // Rank 10 -> Target 10
        },
        'LT5', // Current rank 1
        { maxTierJump: 2 }
      );
      // Rank 1 + 2 = Rank 3 ('LT4')
      expect(result.newTier).toBe('LT4');
      expect(result.cappedByJumpRule).toBe(true);
      expect(result.reason).toContain('capped by max jump limit of +2');
    });

    it('allows natural 1-tier promotion on close win', () => {
      const result = calculateTierResult(
        {
          playerId: 'p1',
          testerId: 't1',
          gamemodeId: 'crystal',
          playerScore: 7,
          testerScore: 5,
          testerTier: 'HT4', // Rank 4 -> Target 4
        },
        'LT4', // Rank 3
        { maxTierJump: 2 }
      );
      // Rank 3 -> Rank 4 ('HT4')
      expect(result.newTier).toBe('HT4');
      expect(result.cappedByJumpRule).toBe(false);
    });

    it('caps demotion to -2 tiers when heavily defeated', () => {
      const result = calculateTierResult(
        {
          playerId: 'p1',
          testerId: 't1',
          gamemodeId: 'sword',
          playerScore: 0,
          testerScore: 7,
          testerTier: 'LT3', // Rank 5 -> Target rank 2 (HT5)
        },
        'HT2', // Current rank 8. Target 2 is delta -6 -> capped at 8 - 2 = 6 (HT3)
        { maxTierJump: 2, allowDeranking: true }
      );
      expect(result.newTier).toBe('HT3');
      expect(result.cappedByJumpRule).toBe(true);
    });
  });

  describe('Edge cases and safety', () => {
    it('throws error when total rounds is 0', () => {
      expect(() =>
        calculateTierResult(
          {
            playerId: 'p1',
            testerId: 't1',
            gamemodeId: 'sword',
            playerScore: 0,
            testerScore: 0,
            testerTier: 'HT3',
          },
          'LT4'
        )
      ).toThrow('Total rounds played must be greater than zero.');
    });
  });
});
