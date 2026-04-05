import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TenderDraftPackagePanel from './TenderDraftPackagePanel';
import type { TenderEditorImportPreview } from '../types/tender-editor-import';
import type { TenderDraftPackage, TenderPackageDetails } from '../types/tender-intelligence';

function createPackageDetails(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti',
      description: null,
      status: 'review-needed',
      createdAt: '2026-04-05T13:00:00.000Z',
      updatedAt: '2026-04-05T13:00:00.000Z',
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
        reviewTaskCount: 1,
      },
    },
    documents: [],
    documentExtractions: [],
    resultEvidence: [],
    analysisJobs: [],
    latestAnalysisJob: null,
    analysisReadiness: {
      canStart: true,
      blockedReason: null,
      coverage: {
        totalDocuments: 1,
        uploadedDocuments: 1,
        supportedDocuments: 1,
        extractedDocuments: 1,
        extractedChunks: 2,
        pendingExtractions: 0,
        failedExtractions: 0,
        unsupportedDocuments: 0,
        documentsNeedingExtraction: 0,
      },
    },
    results: {
      requirements: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          packageId: '11111111-1111-4111-8111-111111111111',
          sourceDocumentId: null,
          requirementType: 'technical',
          title: 'Mukana oleva vaatimus',
          description: 'Tämä on hyväksytty.',
          status: 'covered',
          confidence: 0.71,
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
      goNoGoAssessment: null,
      referenceSuggestions: [],
      draftArtifacts: [],
      reviewTasks: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          packageId: '11111111-1111-4111-8111-111111111111',
          taskType: 'draft',
          title: 'Avoin editor-note',
          description: 'Pidä tämä mukana editorissa.',
          status: 'in-review',
          assignedToUserId: null,
          createdAt: '2026-04-05T13:01:00.000Z',
          updatedAt: '2026-04-05T13:01:00.000Z',
          reviewStatus: 'needs_attention',
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionStatus: 'open',
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
        },
      ],
    },
  };
}

function createDraftPackage(): TenderDraftPackage {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    organizationId: '22222222-2222-4222-8222-222222222222',
    tenderPackageId: '11111111-1111-4111-8111-111111111111',
    title: 'Tarjouspaketti / draft package',
    status: 'draft',
    importStatus: 'not_imported',
    generatedFromAnalysisJobId: null,
    generatedByUserId: '22222222-2222-4222-8222-222222222222',
    importedQuoteId: null,
    importedAt: null,
    importedByUserId: null,
    summary: 'Luonnospaketti sisältää 1 hyväksyttyä vaatimusta, 1 editor-notea.',
    exportPayload: {
      schema_version: 'tender-draft-package/v1',
      generated_at: '2026-04-05T13:02:00.000Z',
      generated_by_user_id: '22222222-2222-4222-8222-222222222222',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        title: 'Tarjouspaketti / draft package',
        summary: 'Luonnospaketti sisältää 1 hyväksyttyä vaatimusta, 1 editor-notea.',
        draft_package_status: 'draft',
      },
      accepted_requirements: [
        {
          source_requirement_id: '44444444-4444-4444-8444-444444444444',
          title: 'Mukana oleva vaatimus',
          content_md: 'Tämä on hyväksytty.',
        },
      ],
      selected_references: [],
      resolved_missing_items: [],
      notes_for_editor: [
        {
          source_entity_type: 'review_task',
          source_entity_id: '55555555-5555-4555-8555-555555555555',
          title: 'Avoin editor-note',
          content_md: 'Pidä tämä mukana editorissa.',
        },
      ],
    },
    items: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        draftPackageId: '66666666-6666-4666-8666-666666666666',
        itemType: 'accepted_requirement',
        sourceEntityType: 'requirement',
        sourceEntityId: '44444444-4444-4444-8444-444444444444',
        title: 'Mukana oleva vaatimus',
        contentMd: 'Tämä on hyväksytty.',
        sortOrder: 0,
        isIncluded: true,
        createdAt: '2026-04-05T13:02:00.000Z',
        updatedAt: '2026-04-05T13:02:00.000Z',
      },
      {
        id: '88888888-8888-4888-8888-888888888888',
        draftPackageId: '66666666-6666-4666-8666-666666666666',
        itemType: 'review_note',
        sourceEntityType: 'review_task',
        sourceEntityId: '55555555-5555-4555-8555-555555555555',
        title: 'Avoin editor-note',
        contentMd: 'Pidä tämä mukana editorissa.',
        sortOrder: 1,
        isIncluded: false,
        createdAt: '2026-04-05T13:02:00.000Z',
        updatedAt: '2026-04-05T13:02:00.000Z',
      },
    ],
    createdAt: '2026-04-05T13:02:00.000Z',
    updatedAt: '2026-04-05T13:02:00.000Z',
  };
}

function createEditorImportPreview(): TenderEditorImportPreview {
  return {
    draft_item_count: 2,
    importable_item_count: 1,
    payload: {
      schema_version: 'tender-editor-import/v1',
      generated_at: '2026-04-05T13:05:00.000Z',
      source_draft_package_id: '66666666-6666-4666-8666-666666666666',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        draft_package_title: 'Tarjouspaketti / draft package',
        draft_package_status: 'draft',
        import_status: 'not_imported',
        target_quote_title: 'Tarjouspaketti / editor import',
        target_customer_id: null,
        target_project_id: null,
        imported_quote_id: null,
        will_create_placeholder_target: true,
      },
      sections: {
        quote_notes_md: '## Vaatimukset / tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nTämä on hyväksytty.',
        quote_internal_notes_md: null,
      },
      items: [
        {
          draft_package_item_id: '77777777-7777-4777-8777-777777777777',
          source_entity_type: 'requirement',
          source_entity_id: '44444444-4444-4444-8444-444444444444',
          item_type: 'accepted_requirement',
          import_group: 'requirements_and_quote_notes',
          target_kind: 'quote_notes_section',
          target_label: 'Tarjouksen notes-kenttä',
          title: 'Mukana oleva vaatimus',
          content_md: 'Tämä on hyväksytty.',
        },
      ],
    },
    validation: {
      is_valid: true,
      can_import: true,
      warning_count: 0,
      error_count: 0,
      issues: [],
    },
    sections: [
      {
        key: 'requirements_and_quote_notes',
        title: 'Vaatimukset / tarjoushuomiot',
        target_kind: 'quote_notes_section',
        target_label: 'Tarjouksen notes-kenttä',
        item_count: 1,
        preview_md: '## Vaatimukset / tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nTämä on hyväksytty.',
      },
      {
        key: 'selected_references',
        title: 'Valitut referenssit',
        target_kind: 'quote_notes_section',
        target_label: 'Tarjouksen notes-kenttä',
        item_count: 0,
        preview_md: null,
      },
      {
        key: 'resolved_missing_items_and_attachment_notes',
        title: 'Ratkaistut puutteet / liitehuomiot',
        target_kind: 'quote_internal_notes_section',
        target_label: 'Tarjouksen internalNotes-kenttä',
        item_count: 0,
        preview_md: null,
      },
      {
        key: 'notes_for_editor',
        title: 'Notes for editor',
        target_kind: 'quote_internal_notes_section',
        target_label: 'Tarjouksen internalNotes-kenttä',
        item_count: 0,
        preview_md: null,
      },
    ],
  };
}

describe('TenderDraftPackagePanel', () => {
  it('renders readiness, included and excluded preview sections for draft packages', () => {
    const markup = renderToStaticMarkup(
      <TenderDraftPackagePanel
        selectedPackage={createPackageDetails()}
        draftPackages={[createDraftPackage()]}
        editorImportPreview={createEditorImportPreview()}
        editorImportValidation={createEditorImportPreview().validation}
        selectedDraftPackageId="66666666-6666-4666-8666-666666666666"
        onSelectDraftPackage={async () => undefined as unknown as void}
        onCreateDraftPackage={async () => undefined}
        onImportDraftPackageToEditor={async () => undefined}
        onUpdateDraftPackageItem={async () => undefined}
        onMarkDraftPackageReviewed={async () => undefined}
        onMarkDraftPackageExported={async () => undefined}
      />,
    );

    expect(markup).toContain('Editor import boundary');
    expect(markup).toContain('Hyväksytyt vaatimukset');
    expect(markup).toContain('Mukana (1)');
    expect(markup).toContain('Ulkona (1)');
    expect(markup).toContain('Export preview');
    expect(markup).toContain('Editor import');
    expect(markup).toContain('Mukana oleva vaatimus');
    expect(markup).toContain('Avoin editor-note');
    expect(markup).toContain('accepted_requirements');
    expect(markup).toContain('notes_for_editor');
    expect(markup).toContain('Import preview');
    expect(markup).toContain('Tarjouspaketti / editor import');
  });
});