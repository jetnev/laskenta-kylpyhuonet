import { describe, expect, it } from 'vitest';

import {
  assertTenderUsageWithinLimit,
  estimateTenderUsageUnitsForFiles,
  getTenderUsageLimitState,
  resolveTenderUsageTierFromConfig,
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

  it('resolves usage tier from object or string config with starter fallback', () => {
    expect(resolveTenderUsageTierFromConfig({ tier: 'growth' })).toBe('growth');
    expect(resolveTenderUsageTierFromConfig('scale')).toBe('scale');
    expect(resolveTenderUsageTierFromConfig({ tier: 'invalid' })).toBe('starter');
    expect(resolveTenderUsageTierFromConfig(null)).toBe('starter');
  });

  it('uses growth tier limits when configured', () => {
    const state = getTenderUsageLimitState(createSummary(12000), 'growth');

    expect(state.limits.maxMeteredUnits30d).toBe(50000);
    expect(state.remainingMeteredUnits30d).toBe(38000);
    expect(state.usagePercent30d).toBe(24);
  });

  it('estimates file usage units in kilobytes with minimum one unit per file', () => {
    const files = [
      new File(['12345'], 'small.txt'),
      new File([new Uint8Array(2048)], 'large.bin'),
    ];

    expect(estimateTenderUsageUnitsForFiles(files)).toBe(3);
  });
});
