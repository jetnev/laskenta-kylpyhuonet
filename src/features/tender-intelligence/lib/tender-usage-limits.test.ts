import { describe, expect, it } from 'vitest';

import {
  assertTenderUsageWithinLimit,
  estimateTenderUsageUnitsForFiles,
  getTenderUsageLimitState,
} from './tender-usage-limits';
import type { TenderUsageSummary } from '../types/tender-intelligence';

function createSummary(totalMeteredUnits: number): TenderUsageSummary {
  return {
    windowDays: 30,
    totalEvents: 10,
    totalQuantity: 10,
    totalMeteredUnits,
    lastEventAt: '2026-04-08T10:00:00.000Z',
    events: [],
  };
}

describe('tender-usage-limits', () => {
  it('computes remaining usage against starter tier', () => {
    const state = getTenderUsageLimitState(createSummary(2300));

    expect(state.tier).toBe('starter');
    expect(state.limits.maxMeteredUnits30d).toBe(10000);
    expect(state.remainingMeteredUnits30d).toBe(7700);
    expect(state.usagePercent30d).toBe(23);
  });

  it('throws when projected usage would exceed limit', () => {
    expect(() => {
      assertTenderUsageWithinLimit({
        summary: createSummary(9900),
        projectedAdditionalUnits: 200,
        actionLabel: 'Dokumentin lataus',
      });
    }).toThrow(/käyttöraja/i);
  });

  it('estimates file usage units in kilobytes with minimum one unit per file', () => {
    const files = [
      new File(['12345'], 'small.txt'),
      new File([new Uint8Array(2048)], 'large.bin'),
    ];

    expect(estimateTenderUsageUnitsForFiles(files)).toBe(3);
  });
});
