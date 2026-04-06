import { describe, expect, it } from 'vitest';

import {
  buildTenderIntelligenceReadinessItems,
  buildTenderIntelligenceReadinessSteps,
  getTenderIntelligenceEnvironmentIssueTitle,
} from './tender-intelligence-readiness';

describe('tender-intelligence-readiness', () => {
  it('marks schema readiness as blocked for database setup', () => {
    const items = buildTenderIntelligenceReadinessItems('schema');

    expect(items.find((item) => item.key === 'database')?.state).toBe('blocked');
    expect(items.find((item) => item.key === 'storage')?.state).toBe('check');
  });

  it('marks analysis runner issue with database and extraction already ready', () => {
    const items = buildTenderIntelligenceReadinessItems('analysis-runner');

    expect(items.find((item) => item.key === 'database')?.state).toBe('ready');
    expect(items.find((item) => item.key === 'extraction')?.state).toBe('ready');
    expect(items.find((item) => item.key === 'analysis')?.state).toBe('blocked');
  });

  it('builds rollout steps and titles for environment issues', () => {
    expect(getTenderIntelligenceEnvironmentIssueTitle('storage')).toContain('dokumenttivarasto');
    expect(buildTenderIntelligenceReadinessSteps('storage')[0]).toContain('tender-intelligence');
  });
});