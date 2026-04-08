import type { TenderUsageSummary } from '../types/tender-intelligence';

export type TenderUsageTier = 'starter';

export interface TenderUsageTierLimits {
  maxMeteredUnits30d: number;
}

export interface TenderUsageLimitState {
  tier: TenderUsageTier;
  limits: TenderUsageTierLimits;
  usedMeteredUnits30d: number;
  remainingMeteredUnits30d: number;
  usagePercent30d: number;
}

const TENDER_USAGE_LIMITS: Record<TenderUsageTier, TenderUsageTierLimits> = {
  starter: {
    maxMeteredUnits30d: 10000,
  },
};

const DEFAULT_TENDER_USAGE_TIER: TenderUsageTier = 'starter';

export function getTenderUsageLimitState(summary: TenderUsageSummary | null, tier: TenderUsageTier = DEFAULT_TENDER_USAGE_TIER): TenderUsageLimitState {
  const limits = TENDER_USAGE_LIMITS[tier];
  const usedMeteredUnits30d = Math.max(0, Math.floor(summary?.totalMeteredUnits ?? 0));
  const remainingMeteredUnits30d = Math.max(0, limits.maxMeteredUnits30d - usedMeteredUnits30d);
  const usagePercent30d = Math.min(100, Math.round((usedMeteredUnits30d / limits.maxMeteredUnits30d) * 100));

  return {
    tier,
    limits,
    usedMeteredUnits30d,
    remainingMeteredUnits30d,
    usagePercent30d,
  };
}

export function assertTenderUsageWithinLimit(options: {
  summary: TenderUsageSummary | null;
  projectedAdditionalUnits: number;
  actionLabel: string;
  tier?: TenderUsageTier;
}) {
  const limitState = getTenderUsageLimitState(options.summary, options.tier);
  const projectedAdditionalUnits = Math.max(0, Math.floor(options.projectedAdditionalUnits));

  if (projectedAdditionalUnits <= 0) {
    return;
  }

  if (projectedAdditionalUnits > limitState.remainingMeteredUnits30d) {
    throw new Error(
      `${options.actionLabel} estettiin, koska Tarjousälyn 30 päivän käyttöraja (${limitState.limits.maxMeteredUnits30d} yks.) ylittyisi. `
      + `Käytetty ${limitState.usedMeteredUnits30d} yks., jäljellä ${limitState.remainingMeteredUnits30d} yks.`,
    );
  }
}

export function estimateTenderUsageUnitsForFiles(files: File[]): number {
  return files.reduce((sum, file) => sum + Math.max(1, Math.ceil((file.size || 0) / 1024)), 0);
}
