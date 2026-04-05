import { describe, expect, it } from 'vitest';

import { TENDER_ANALYSIS_JOB_STATUS_META, TENDER_ANALYSIS_JOB_TYPE_META } from './tender-intelligence-ui';
import { getLatestSuccessfulTenderAnalysisJob, getTenderAnalysisStartState, isTenderAnalysisJobActive } from './tender-analysis';
import type { TenderAnalysisJob } from '../types/tender-intelligence';

function createAnalysisJob(overrides: Partial<TenderAnalysisJob> = {}): TenderAnalysisJob {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    packageId: '22222222-2222-4222-8222-222222222222',
    jobType: 'placeholder_analysis',
    status: 'completed',
    stageLabel: 'Placeholder-analyysi valmistui',
    provider: null,
    model: null,
    requestedAt: '2026-04-05T08:00:00.000Z',
    startedAt: '2026-04-05T08:01:00.000Z',
    completedAt: '2026-04-05T08:02:00.000Z',
    errorMessage: null,
    ...overrides,
  };
}

describe('TENDER_ANALYSIS_JOB_STATUS_META', () => {
  it('maps the phase 3 analysis statuses into visible finnish labels', () => {
    expect(TENDER_ANALYSIS_JOB_STATUS_META.pending.label).toBe('Valmistellaan');
    expect(TENDER_ANALYSIS_JOB_STATUS_META.queued.label).toBe('Jonossa');
    expect(TENDER_ANALYSIS_JOB_STATUS_META.running.label).toBe('Käynnissä');
    expect(TENDER_ANALYSIS_JOB_STATUS_META.completed.label).toBe('Valmis');
    expect(TENDER_ANALYSIS_JOB_STATUS_META.failed.label).toBe('Epäonnistui');
    expect(TENDER_ANALYSIS_JOB_TYPE_META.placeholder_analysis.label).toBe('Placeholder-analyysi');
  });
});

describe('getTenderAnalysisStartState', () => {
  it('disables analysis start when the package has no documents', () => {
    expect(getTenderAnalysisStartState({ documentCount: 0, latestAnalysisJob: null })).toEqual({
      canStart: false,
      reason: 'Lisää pakettiin vähintään yksi dokumentti ennen analyysin käynnistämistä.',
    });
  });

  it('disables analysis start when a previous job is still active', () => {
    const queuedJob = createAnalysisJob({ status: 'queued', completedAt: null, stageLabel: 'Placeholder-analyysi odottaa suoritusvuoroa' });

    expect(isTenderAnalysisJobActive(queuedJob.status)).toBe(true);
    expect(getTenderAnalysisStartState({ documentCount: 2, latestAnalysisJob: queuedJob })).toEqual({
      canStart: false,
      reason: 'Paketille on jo käynnissä analyysiajo. Odota nykyisen ajon valmistumista.',
    });
  });

  it('allows analysis start when documents exist and the previous job is terminal', () => {
    const failedJob = createAnalysisJob({ status: 'failed', completedAt: '2026-04-05T09:00:00.000Z', errorMessage: 'Virhe' });

    expect(getTenderAnalysisStartState({ documentCount: 2, latestAnalysisJob: failedJob })).toEqual({
      canStart: true,
      reason: null,
    });
  });
});

describe('getLatestSuccessfulTenderAnalysisJob', () => {
  it('returns the most recent completed job for the status panel', () => {
    const oldestCompleted = createAnalysisJob({
      id: '33333333-3333-4333-8333-333333333333',
      completedAt: '2026-04-05T08:02:00.000Z',
    });
    const failedJob = createAnalysisJob({
      id: '44444444-4444-4444-8444-444444444444',
      status: 'failed',
      completedAt: '2026-04-05T09:00:00.000Z',
      errorMessage: 'Virhe',
    });
    const latestCompleted = createAnalysisJob({
      id: '55555555-5555-4555-8555-555555555555',
      completedAt: '2026-04-05T10:00:00.000Z',
    });

    expect(getLatestSuccessfulTenderAnalysisJob([oldestCompleted, failedJob, latestCompleted])?.id).toBe(latestCompleted.id);
  });
});