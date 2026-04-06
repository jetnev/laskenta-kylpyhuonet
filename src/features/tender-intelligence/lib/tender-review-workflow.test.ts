import { describe, expect, it } from 'vitest';

import {
  buildTenderWorkflowMetadataUpdate,
  buildTenderWorkflowSummary,
  getLatestTenderWorkflowNote,
  matchesTenderWorkflowFilter,
  syncTenderDraftArtifactStatus,
  syncTenderReviewTaskStatus,
} from './tender-review-workflow';
import type { TenderPackageResults } from '../types/tender-intelligence';

function createResults(): TenderPackageResults {
  return {
    requirements: [
      {
        id: 'req-1',
        packageId: 'pkg-1',
        sourceDocumentId: 'doc-1',
        requirementType: 'technical',
        title: 'Vahvista toimituslaajuus',
        description: null,
        status: 'unreviewed',
        confidence: 0.61,
        sourceExcerpt: null,
        reviewStatus: 'unreviewed',
        reviewNote: null,
        reviewedByUserId: null,
        reviewedAt: null,
        resolutionStatus: 'open',
        resolutionNote: null,
        resolvedByUserId: null,
        resolvedAt: null,
        assignedToUserId: null,
      },
    ],
    missingItems: [
      {
        id: 'missing-1',
        packageId: 'pkg-1',
        relatedRequirementId: 'req-1',
        itemType: 'document',
        title: 'Verovelkatodistus puuttuu',
        description: null,
        severity: 'medium',
        status: 'open',
        reviewStatus: 'needs_attention',
        reviewNote: 'Tarkista asiakkaalta',
        reviewedByUserId: 'user-1',
        reviewedAt: '2026-04-05T10:00:00.000Z',
        resolutionStatus: 'open',
        resolutionNote: 'Liite puuttuu paketista',
        resolvedByUserId: null,
        resolvedAt: null,
        assignedToUserId: null,
      },
    ],
    riskFlags: [
      {
        id: 'risk-1',
        packageId: 'pkg-1',
        riskType: 'delivery',
        title: 'Määräajan ylitys voi johtaa hylkäykseen',
        description: null,
        severity: 'high',
        status: 'open',
        reviewStatus: 'dismissed',
        reviewNote: 'Ei koske tätä kohdetta',
        reviewedByUserId: 'user-2',
        reviewedAt: '2026-04-05T10:05:00.000Z',
        resolutionStatus: 'wont_fix',
        resolutionNote: 'Ei toimenpidettä',
        resolvedByUserId: 'user-2',
        resolvedAt: '2026-04-05T10:06:00.000Z',
        assignedToUserId: null,
      },
    ],
    goNoGoAssessment: null,
    referenceSuggestions: [],
    draftArtifacts: [],
    reviewTasks: [
      {
        id: 'task-1',
        packageId: 'pkg-1',
        taskType: 'requirements',
        title: 'Käy löydökset läpi',
        description: null,
        status: 'in-review',
        assignedToUserId: 'user-3',
        createdAt: '2026-04-05T09:00:00.000Z',
        updatedAt: '2026-04-05T10:10:00.000Z',
        reviewStatus: 'accepted',
        reviewNote: 'Työ käynnistetty',
        reviewedByUserId: 'user-3',
        reviewedAt: '2026-04-05T10:10:00.000Z',
        resolutionStatus: 'resolved',
        resolutionNote: 'Valmis',
        resolvedByUserId: 'user-3',
        resolvedAt: '2026-04-05T10:15:00.000Z',
      },
    ],
  };
}

describe('tender-review-workflow helpers', () => {
  it('builds workflow summary counts across the result domain and supports filtering', () => {
    const results = createResults();
    const summary = buildTenderWorkflowSummary(results);

    expect(summary).toEqual({
      total: 4,
      unreviewed: 1,
      open: 2,
      inProgress: 0,
      resolved: 1,
      dismissed: 1,
      needsAttention: 1,
    });
    expect(matchesTenderWorkflowFilter(results.requirements[0], 'unreviewed')).toBe(true);
    expect(matchesTenderWorkflowFilter(results.riskFlags[0], 'dismissed')).toBe(true);
    expect(matchesTenderWorkflowFilter(results.reviewTasks[0], 'resolved')).toBe(true);
  });

  it('builds audit metadata updates and clears resolver metadata when a row is reopened', () => {
    const update = buildTenderWorkflowMetadataUpdate({
      current: {
        reviewStatus: 'accepted',
        reviewNote: 'Hyväksytty aiemmin',
        reviewedByUserId: 'user-1',
        reviewedAt: '2026-04-05T09:00:00.000Z',
        resolutionStatus: 'resolved',
        resolutionNote: 'Valmis',
        resolvedByUserId: 'user-1',
        resolvedAt: '2026-04-05T09:05:00.000Z',
        assignedToUserId: null,
      },
      input: {
        resolutionStatus: 'open',
        resolutionNote: 'Palautettiin tarkistukseen',
        assignedToUserId: 'user-2',
      },
      actorUserId: 'user-3',
      now: '2026-04-05T11:00:00.000Z',
    });

    expect(update).toMatchObject({
      resolutionStatus: 'open',
      resolutionNote: 'Palautettiin tarkistukseen',
      resolvedByUserId: null,
      resolvedAt: null,
      assignedToUserId: 'user-2',
    });
  });

  it('returns the latest workflow note and keeps review task legacy statuses in sync', () => {
    expect(
      getLatestTenderWorkflowNote({
        reviewStatus: 'accepted',
        reviewNote: 'Tarkistus tehty',
        reviewedAt: '2026-04-05T10:00:00.000Z',
        resolutionStatus: 'resolved',
        resolutionNote: 'Ratkaistu lopullisesti',
        resolvedAt: '2026-04-05T10:05:00.000Z',
      }),
    ).toBe('Ratkaistu lopullisesti');
    expect(syncTenderReviewTaskStatus('open')).toBe('todo');
    expect(syncTenderReviewTaskStatus('in_progress')).toBe('in-review');
    expect(syncTenderReviewTaskStatus('wont_fix')).toBe('done');
    expect(syncTenderDraftArtifactStatus({ reviewStatus: 'accepted', resolutionStatus: 'resolved' })).toBe('accepted');
    expect(syncTenderDraftArtifactStatus({ reviewStatus: 'needs_attention', resolutionStatus: 'open' })).toBe('ready-for-review');
  });
});