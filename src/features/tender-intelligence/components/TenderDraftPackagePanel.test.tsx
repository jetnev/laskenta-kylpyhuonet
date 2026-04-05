import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TenderDraftPackagePanel from './TenderDraftPackagePanel';
import type {
  TenderDraftPackageImportRun,
  TenderDraftPackageImportState,
  TenderEditorImportPreview,
  TenderEditorReconciliationPreview,
} from '../types/tender-editor-import';
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
      linkedCustomerId: '12121212-1212-4212-8212-121212121212',
      linkedProjectId: '13131313-1313-4313-8313-131313131313',
      linkedQuoteId: '61616161-6161-4616-8616-616161616161',
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
    importStatus: 'imported',
    reimportStatus: 'stale',
    importRevision: 2,
    lastImportPayloadHash: '1234abcd',
    generatedFromAnalysisJobId: null,
    generatedByUserId: '22222222-2222-4222-8222-222222222222',
    importedQuoteId: '61616161-6161-4616-8616-616161616161',
    importedAt: '2026-04-05T13:07:00.000Z',
    importedByUserId: '22222222-2222-4222-8222-222222222222',
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
    updatedAt: '2026-04-05T13:08:00.000Z',
  };
}

function createEditorImportPreview(): TenderEditorImportPreview {
  return {
    draft_item_count: 2,
    importable_item_count: 1,
    payload_hash: 'cafebabe',
    payload: {
      schema_version: 'tender-editor-import/v2',
      generated_at: '2026-04-05T13:05:00.000Z',
      source_draft_package_id: '66666666-6666-4666-8666-666666666666',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        draft_package_title: 'Tarjouspaketti / draft package',
        draft_package_status: 'draft',
        import_status: 'imported',
        reimport_status: 'stale',
        target_quote_title: 'Tarjouspaketti / editor import',
        target_quote_id: '61616161-6161-4616-8616-616161616161',
        target_customer_id: '12121212-1212-4212-8212-121212121212',
        target_project_id: '13131313-1313-4313-8313-131313131313',
        imported_quote_id: '61616161-6161-4616-8616-616161616161',
        will_create_placeholder_target: false,
      },
      managed_surface: {
        contract_version: 'tender-editor-managed-surface/v1',
        ownership_notice: 'Tarjousäly päivittää vain nämä hallitut lohkot. Muu editorin sisältö ei kuulu adapterin hallintaan.',
        blocks: [
          {
            block_id: 'requirements_and_quote_notes',
            marker_key: '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
            import_group: 'requirements_and_quote_notes',
            target_kind: 'quote_notes_section',
            target_label: 'Tarjouksen notes-kenttä',
            title: 'Tarjoushuomiot',
            content_md: '## Tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nTämä on hyväksytty.',
            item_count: 1,
            owned_by_adapter: true,
          },
        ],
      },
      sections: {
        quote_notes_md: '## Tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nTämä on hyväksytty.',
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
        title: 'Tarjoushuomiot',
        target_kind: 'quote_notes_section',
        target_label: 'Tarjouksen notes-kenttä',
        item_count: 1,
        preview_md: '## Tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nTämä on hyväksytty.',
      },
      {
        key: 'selected_references',
        title: 'Referenssiyhteenveto',
        target_kind: 'quote_notes_section',
        target_label: 'Tarjouksen notes-kenttä',
        item_count: 0,
        preview_md: null,
      },
      {
        key: 'resolved_missing_items_and_attachment_notes',
        title: 'Liitehuomiot ja ratkaistut puutteet',
        target_kind: 'quote_internal_notes_section',
        target_label: 'Tarjouksen internalNotes-kenttä',
        item_count: 0,
        preview_md: null,
      },
      {
        key: 'notes_for_editor',
        title: 'Sisäiset editorihuomiot',
        target_kind: 'quote_internal_notes_section',
        target_label: 'Tarjouksen internalNotes-kenttä',
        item_count: 0,
        preview_md: null,
      },
    ],
  };
}

function createImportState(): TenderDraftPackageImportState {
  return {
    draft_package_id: '66666666-6666-4666-8666-666666666666',
    import_status: 'imported',
    reimport_status: 'stale',
    import_revision: 2,
    current_payload_hash: 'cafebabe',
    last_import_payload_hash: '1234abcd',
    imported_quote_id: '61616161-6161-4616-8616-616161616161',
    imported_at: '2026-04-05T13:07:00.000Z',
    target_quote_id: '61616161-6161-4616-8616-616161616161',
    target_quote_title: 'Tarjouspaketti / editor import',
    target_project_id: '13131313-1313-4313-8313-131313131313',
    target_customer_id: '12121212-1212-4212-8212-121212121212',
    can_import: true,
    can_reimport: true,
    suggested_import_mode: 'update_existing_quote',
    latest_run: createImportRuns()[0],
  };
}

function createReimportPreview(): TenderEditorReconciliationPreview {
  return {
    draft_package_id: '66666666-6666-4666-8666-666666666666',
    target_quote_id: '61616161-6161-4616-8616-616161616161',
    target_quote_title: 'Tarjouspaketti / editor import',
    import_mode: 'update_existing_quote',
    reimport_status: 'stale',
    current_payload_hash: 'cafebabe',
    previous_payload_hash: '1234abcd',
    added_count: 1,
    changed_count: 1,
    removed_count: 0,
    unchanged_count: 0,
    added_blocks: 1,
    changed_blocks: 1,
    removed_blocks: 0,
    unchanged_blocks: 0,
    can_reimport: true,
    warnings: [],
    blocks: [
      {
        block_id: 'requirements_and_quote_notes',
        marker_key: '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
        import_group: 'requirements_and_quote_notes',
        target_kind: 'quote_notes_section',
        target_label: 'Tarjouksen notes-kenttä',
        title: 'Tarjoushuomiot',
        change_type: 'changed',
        current_content_md: '## Tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nTämä on hyväksytty.',
        previous_content_md: '## Tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nVanha sisältö.',
        current_item_count: 1,
        previous_item_count: 1,
        owned_by_adapter: true,
      },
      {
        block_id: 'notes_for_editor',
        marker_key: '66666666-6666-4666-8666-666666666666:notes_for_editor',
        import_group: 'notes_for_editor',
        target_kind: 'quote_internal_notes_section',
        target_label: 'Tarjouksen internalNotes-kenttä',
        title: 'Sisäiset editorihuomiot',
        change_type: 'added',
        current_content_md: '## Sisäiset editorihuomiot\n\n### Avoin editor-note\n\nPidä tämä mukana editorissa.',
        previous_content_md: null,
        current_item_count: 1,
        previous_item_count: null,
        owned_by_adapter: true,
      },
    ],
    entries: [
      {
        key: 'requirements_and_quote_notes:accepted_requirement:requirement:44444444-4444-4444-8444-444444444444',
        import_group: 'requirements_and_quote_notes',
        target_kind: 'quote_notes_section',
        title: 'Mukana oleva vaatimus',
        change_type: 'changed',
        current_content_md: 'Tämä on hyväksytty.',
        previous_content_md: 'Vanha sisältö.',
      },
    ],
  };
}

function createImportRuns(): TenderDraftPackageImportRun[] {
  return [
    {
      id: '71717171-7171-4717-8717-717171717171',
      tender_draft_package_id: '66666666-6666-4666-8666-666666666666',
      target_quote_id: '61616161-6161-4616-8616-616161616161',
      import_mode: 'update_existing_quote',
      payload_hash: '1234abcd',
      payload_snapshot: createEditorImportPreview().payload,
      result_status: 'success',
      summary: 'Päivitettiin aiemmin importoitu tarjous “Tarjouspaketti / editor import”.',
      created_by_user_id: '22222222-2222-4222-8222-222222222222',
      created_at: '2026-04-05T13:07:00.000Z',
    },
  ];
}

describe('TenderDraftPackagePanel', () => {
  it('renders imported quote handoff and re-import reconciliation state for draft packages', () => {
    const markup = renderToStaticMarkup(
      <TenderDraftPackagePanel
        selectedPackage={createPackageDetails()}
        draftPackages={[createDraftPackage()]}
        editorImportPreview={createEditorImportPreview()}
        editorImportValidation={createEditorImportPreview().validation}
        draftPackageImportState={createImportState()}
        draftPackageReimportPreview={createReimportPreview()}
        draftPackageImportRuns={createImportRuns()}
        selectedDraftPackageId="66666666-6666-4666-8666-666666666666"
        onSelectDraftPackage={async () => undefined as unknown as void}
        onCreateDraftPackage={async () => undefined}
        onImportDraftPackageToEditor={async () => undefined}
        onReimportDraftPackageToEditor={async () => undefined}
        onOpenImportedQuote={() => undefined}
        onUpdateDraftPackageItem={async () => undefined}
        onMarkDraftPackageReviewed={async () => undefined}
        onMarkDraftPackageExported={async () => undefined}
      />,
    );

    expect(markup).toContain('Managed import surface hardening');
    expect(markup).toContain('Päivitä samaan quoteen');
    expect(markup).toContain('Avaa importoitu quote');
    expect(markup).toContain('Import handoff');
    expect(markup).toContain('Re-import reconciliation');
    expect(markup).toContain('Adapterin hallitsema pinta');
    expect(markup).toContain('Tarjousäly hallitsee vain alla näkyviä lohkoja');
    expect(markup).toContain('Tarjoushuomiot');
    expect(markup).toContain('Import-ajohistoria');
    expect(markup).toContain('Draft muuttunut importin jälkeen');
    expect(markup).toContain('Revision 2');
    expect(markup).toContain('Tarjouspaketti / editor import');
  });
});
