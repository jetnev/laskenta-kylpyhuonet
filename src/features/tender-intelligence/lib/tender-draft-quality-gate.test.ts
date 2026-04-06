import { describe, expect, it } from 'vitest';

import { buildTenderDraftQualityGate } from './tender-draft-quality-gate';
import type { TenderDraftPackageImportState, TenderEditorImportValidationResult } from '../types/tender-editor-import';
import type { TenderDraftPackage, TenderPackageDetails } from '../types/tender-intelligence';

function createPackageDetails(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti',
      description: null,
      status: 'review-needed',
      createdAt: '2026-04-06T09:00:00.000Z',
      updatedAt: '2026-04-06T09:00:00.000Z',
      createdByUserId: '22222222-2222-4222-8222-222222222222',
      linkedCustomerId: null,
      linkedProjectId: null,
      linkedQuoteId: null,
      currentJobId: null,
      summary: {
        documentCount: 1,
        requirementCount: 1,
        missingItemCount: 0,
        riskCount: 0,
        reviewTaskCount: 0,
      },
    },
    documents: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        packageId: '11111111-1111-4111-8111-111111111111',
        fileName: 'tarjouspyynto.pdf',
        mimeType: 'application/pdf',
        kind: 'rfp',
        storageBucket: 'tender-intelligence',
        storagePath: 'org/package/file.pdf',
        fileSizeBytes: 120,
        checksum: null,
        uploadError: null,
        uploadState: 'uploaded',
        parseStatus: 'completed',
        createdAt: '2026-04-06T09:00:00.000Z',
        updatedAt: '2026-04-06T09:00:00.000Z',
      },
    ],
    documentExtractions: [],
    resultEvidence: [],
    analysisJobs: [],
    latestAnalysisJob: {
      id: '88888888-8888-4888-8888-888888888888',
      packageId: '11111111-1111-4111-8111-111111111111',
      jobType: 'placeholder_analysis',
      status: 'completed',
      stageLabel: 'Valmis',
      provider: null,
      model: null,
      requestedAt: '2026-04-06T09:01:00.000Z',
      startedAt: '2026-04-06T09:01:30.000Z',
      completedAt: '2026-04-06T09:02:00.000Z',
      errorMessage: null,
    },
    analysisReadiness: {
      canStart: true,
      blockedReason: null,
      coverage: {
        totalDocuments: 1,
        uploadedDocuments: 1,
        supportedDocuments: 1,
        extractedDocuments: 1,
        extractedChunks: 1,
        pendingExtractions: 0,
        failedExtractions: 0,
        unsupportedDocuments: 0,
        documentsNeedingExtraction: 0,
      },
    },
    results: {
      requirements: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          packageId: '11111111-1111-4111-8111-111111111111',
          sourceDocumentId: null,
          requirementType: 'technical',
          title: 'Hyväksytty vaatimus',
          description: null,
          status: 'covered',
          confidence: 0.7,
          sourceExcerpt: null,
          reviewStatus: 'accepted',
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionStatus: 'resolved',
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
          assignedToUserId: null,
        },
      ],
      missingItems: [],
      riskFlags: [],
      goNoGoAssessment: {
        packageId: '11111111-1111-4111-8111-111111111111',
        recommendation: 'go',
        summary: 'Valmis editorivientiin.',
        confidence: 0.7,
        updatedAt: '2026-04-06T09:02:00.000Z',
      },
      referenceSuggestions: [],
      draftArtifacts: [],
      reviewTasks: [],
    },
  };
}

function createDraftPackage(status: TenderDraftPackage['status'] = 'reviewed'): TenderDraftPackage {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    organizationId: '22222222-2222-4222-8222-222222222222',
    tenderPackageId: '11111111-1111-4111-8111-111111111111',
    title: 'Draft package',
    status,
    importStatus: 'not_imported',
    reimportStatus: 'never_imported',
    importRevision: 0,
    lastImportPayloadHash: null,
    generatedFromAnalysisJobId: null,
    generatedByUserId: null,
    importedQuoteId: null,
    importedAt: null,
    importedByUserId: null,
    summary: null,
    exportPayload: {
      schema_version: 'tender-draft-package/v1',
      generated_at: '2026-04-06T09:03:00.000Z',
      generated_by_user_id: null,
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        title: 'Draft package',
        summary: null,
        draft_package_status: status,
      },
      accepted_requirements: [],
      selected_references: [],
      resolved_missing_items: [],
      notes_for_editor: [],
    },
    items: [],
    createdAt: '2026-04-06T09:03:00.000Z',
    updatedAt: '2026-04-06T09:03:00.000Z',
  };
}

function createImportValidation(canImport = true): TenderEditorImportValidationResult {
  return {
    is_valid: canImport,
    can_import: canImport,
    warning_count: 0,
    error_count: canImport ? 0 : 1,
    issues: canImport ? [] : [{
      code: 'no_importable_items',
      severity: 'error',
      message: 'Import ei voi jatkua ilman importoitavia riveja.',
      draft_package_item_id: null,
    }],
  };
}

function createImportState(): TenderDraftPackageImportState {
  return {
    draft_package_id: '44444444-4444-4444-8444-444444444444',
    import_status: 'imported',
    reimport_status: 'stale',
    import_revision: 1,
    current_payload_hash: 'hash-a',
    last_import_payload_hash: 'hash-b',
    imported_quote_id: '55555555-5555-4555-8555-555555555555',
    imported_at: '2026-04-06T09:04:00.000Z',
    target_quote_id: '55555555-5555-4555-8555-555555555555',
    target_quote_title: 'Quote',
    target_project_id: null,
    target_customer_id: null,
    can_import: true,
    can_reimport: true,
    owned_block_count: 1,
    owned_block_last_synced_at: '2026-04-06T09:05:00.000Z',
    last_drift_checked_at: '2026-04-06T09:05:00.000Z',
    ownership_registry_status: 'current',
    selective_reimport_available: true,
    safe_reimport_now: true,
    manual_quote_edit_detected: false,
    conflict_block_count: 0,
    missing_in_quote_block_count: 0,
    registry_warning_count: 0,
    suggested_import_mode: 'create_new_quote',
    latest_run: null,
  };
}

describe('tender-draft-quality-gate', () => {
  it('allows editor export when reviewed draft, go recommendation and valid import are present', () => {
    const gate = buildTenderDraftQualityGate({
      packageDetails: createPackageDetails(),
      selectedDraftPackage: createDraftPackage('reviewed'),
      importValidation: createImportValidation(true),
      draftPackageImportState: createImportState(),
    });

    expect(gate.state).toBe('ready');
    expect(gate.canExportToEditor).toBe(true);
  });

  it('blocks editor export when draft package is still in draft state', () => {
    const gate = buildTenderDraftQualityGate({
      packageDetails: createPackageDetails(),
      selectedDraftPackage: createDraftPackage('draft'),
      importValidation: createImportValidation(true),
      draftPackageImportState: createImportState(),
    });

    expect(gate.state).toBe('blocked');
    expect(gate.canExportToEditor).toBe(false);
    expect(gate.summary).toContain('Merkitse draft package tarkistetuksi');
  });
});