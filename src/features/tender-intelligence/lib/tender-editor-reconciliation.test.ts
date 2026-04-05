import { describe, expect, it } from 'vitest';

import { buildTenderEditorImportPreview } from './tender-editor-import';
import {
  buildTenderDraftPackageImportState,
  buildTenderEditorImportPayloadHash,
  buildTenderEditorReconciliationPreview,
  resolveTenderDraftPackageReimportStatus,
} from './tender-editor-reconciliation';
import { buildTenderImportOwnedBlockAppliedContentHash } from './tender-import-ownership-registry';
import type { TenderDraftPackage } from '../types/tender-intelligence';
import type { TenderDraftPackageImportRun, TenderImportOwnedBlock } from '../types/tender-editor-import';

function createDraftPackage(overrides: Partial<TenderDraftPackage> = {}): TenderDraftPackage {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    organizationId: '22222222-2222-4222-8222-222222222222',
    tenderPackageId: '11111111-1111-4111-8111-111111111111',
    title: 'Tarjouspaketti / draft package',
    status: 'draft',
    importStatus: 'not_imported',
    reimportStatus: 'never_imported',
    importRevision: 0,
    lastImportPayloadHash: null,
    generatedFromAnalysisJobId: '33333333-3333-4333-8333-333333333333',
    generatedByUserId: '22222222-2222-4222-8222-222222222222',
    importedQuoteId: null,
    importedAt: null,
    importedByUserId: null,
    summary: 'Luonnospaketti sisältää 2 riviä.',
    exportPayload: {
      schema_version: 'tender-draft-package/v1',
      generated_at: '2026-04-05T14:00:00.000Z',
      generated_by_user_id: '22222222-2222-4222-8222-222222222222',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: '33333333-3333-4333-8333-333333333333',
      metadata: {
        title: 'Tarjouspaketti / draft package',
        summary: 'Luonnospaketti sisältää 2 riviä.',
        draft_package_status: 'draft',
      },
      accepted_requirements: [],
      selected_references: [],
      resolved_missing_items: [],
      notes_for_editor: [],
    },
    items: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        draftPackageId: '66666666-6666-4666-8666-666666666666',
        itemType: 'accepted_requirement',
        sourceEntityType: 'requirement',
        sourceEntityId: '44444444-4444-4444-8444-444444444444',
        title: 'Mukana oleva vaatimus',
        contentMd: 'Tämä siirtyy tarjoushuomioihin.',
        sortOrder: 0,
        isIncluded: true,
        createdAt: '2026-04-05T14:00:00.000Z',
        updatedAt: '2026-04-05T14:00:00.000Z',
      },
      {
        id: '88888888-8888-4888-8888-888888888888',
        draftPackageId: '66666666-6666-4666-8666-666666666666',
        itemType: 'review_note',
        sourceEntityType: 'review_task',
        sourceEntityId: '55555555-5555-4555-8555-555555555555',
        title: 'Pidä rajaus näkyvillä',
        contentMd: 'Tämä siirtyy internal notesiin.',
        sortOrder: 1,
        isIncluded: true,
        createdAt: '2026-04-05T14:00:00.000Z',
        updatedAt: '2026-04-05T14:00:00.000Z',
      },
    ],
    createdAt: '2026-04-05T14:00:00.000Z',
    updatedAt: '2026-04-05T14:00:00.000Z',
    ...overrides,
  };
}

function createPreview(draftPackage: TenderDraftPackage) {
  return buildTenderEditorImportPreview({
    draftPackage,
    packageName: 'Tarjouspaketti',
    targetQuoteId: draftPackage.importedQuoteId ?? null,
    targetQuoteTitle: draftPackage.importedQuoteId ? 'Aiemmin importoitu tarjous' : undefined,
    targetCustomerId: null,
    targetProjectId: null,
    willCreatePlaceholderTarget: !draftPackage.importedQuoteId,
    generatedAt: '2026-04-05T14:05:00.000Z',
  });
}

function createExecutionMetadata(overrides: Partial<TenderDraftPackageImportRun['execution_metadata']> = {}) {
  return {
    selected_block_ids: ['requirements_and_quote_notes', 'selected_references'],
    selected_update_block_ids: ['requirements_and_quote_notes'],
    selected_remove_block_ids: ['selected_references'],
    conflict_block_ids: [],
    skipped_conflict_block_ids: [],
    override_conflict_block_ids: [],
    updated_block_ids: ['requirements_and_quote_notes'],
    removed_block_ids: ['selected_references'],
    missing_in_quote_block_ids: [],
    untouched_block_ids: [],
    run_mode: 'protected_reimport',
    conflict_policy: 'protect_conflicts',
    summary_counts: {
      selected_blocks: 2,
      conflict_blocks: 0,
      skipped_conflicts: 0,
      updated_blocks: 1,
      removed_blocks: 1,
      missing_in_quote_blocks: 0,
      untouched_blocks: 0,
    },
    ...overrides,
  };
}

function createSuccessfulRun(overrides: Partial<TenderDraftPackageImportRun> = {}): TenderDraftPackageImportRun {
  return {
    id: '91919191-9191-4919-8919-919191919191',
    tender_draft_package_id: '66666666-6666-4666-8666-666666666666',
    target_quote_id: '99999999-9999-4999-8999-999999999999',
    import_mode: 'update_existing_quote',
    payload_hash: '1234abcd',
    payload_snapshot: {
      schema_version: 'tender-editor-import/v1',
      generated_at: '2026-04-05T14:01:00.000Z',
      source_draft_package_id: '66666666-6666-4666-8666-666666666666',
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        draft_package_title: 'Tarjouspaketti / draft package',
        draft_package_status: 'draft',
        import_status: 'imported',
        reimport_status: 'up_to_date',
        target_quote_title: 'Aiemmin importoitu tarjous',
        target_quote_id: '99999999-9999-4999-8999-999999999999',
        target_customer_id: null,
        target_project_id: null,
        imported_quote_id: '99999999-9999-4999-8999-999999999999',
        will_create_placeholder_target: false,
      },
      sections: {
        quote_notes_md: '## Vaatimukset / tarjoushuomiot\n\n### Vanha vaatimus\n\nVanha sisältö.',
        quote_internal_notes_md: '## Notes for editor\n\n### Vanha note\n\nVanha note sisältö.',
      },
      items: [
        {
          draft_package_item_id: 'old-item',
          source_entity_type: 'requirement',
          source_entity_id: 'old-requirement',
          item_type: 'accepted_requirement',
          import_group: 'requirements_and_quote_notes',
          target_kind: 'quote_notes_section',
          target_label: 'Tarjouksen notes-kenttä',
          title: 'Vanha vaatimus',
          content_md: 'Vanha sisältö.',
        },
        {
          draft_package_item_id: 'old-reference-item',
          source_entity_type: 'reference_suggestion',
          source_entity_id: 'old-reference',
          item_type: 'selected_reference',
          import_group: 'selected_references',
          target_kind: 'quote_notes_section',
          target_label: 'Tarjouksen notes-kenttä',
          title: 'Vanha referenssi',
          content_md: 'Poistuva referenssiyhteenveto.',
        },
      ],
    },
    result_status: 'success',
    summary: 'Aiempi import onnistui.',
    execution_metadata: createExecutionMetadata(),
    created_by_user_id: '22222222-2222-4222-8222-222222222222',
    created_at: '2026-04-05T14:01:00.000Z',
    ...overrides,
  };
}

function createOwnedBlocks(): TenderImportOwnedBlock[] {
  const requirementsAppliedHash = buildTenderImportOwnedBlockAppliedContentHash({
    targetField: 'quote_notes_section',
    title: 'Vanha tarjoushuomio',
    contentMd: 'Vanha tarjoushuomio.',
  });
  const referencesAppliedHash = buildTenderImportOwnedBlockAppliedContentHash({
    targetField: 'quote_notes_section',
    title: 'Vanha referenssiyhteenveto',
    contentMd: 'Vanha referenssi.',
  });

  return [
    {
      id: '11111111-1111-4111-8111-111111111111',
      organization_id: '22222222-2222-4222-8222-222222222222',
      tender_draft_package_id: '66666666-6666-4666-8666-666666666666',
      target_quote_id: '99999999-9999-4999-8999-999999999999',
      import_run_id: '91919191-9191-4919-8919-919191919191',
      block_id: 'requirements_and_quote_notes',
      marker_key: '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
      target_field: 'quote_notes_section',
      target_section_key: 'tender-editor-import:66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
      block_title: 'Vanha tarjoushuomio',
      payload_hash: 'old-requirement-hash',
      last_applied_content_hash: requirementsAppliedHash,
      last_seen_quote_content_hash: requirementsAppliedHash,
      drift_status: 'up_to_date',
      last_drift_checked_at: '2026-04-05T14:01:00.000Z',
      revision: 1,
      last_synced_at: '2026-04-05T14:01:00.000Z',
      is_active: true,
      created_at: '2026-04-05T14:01:00.000Z',
      updated_at: '2026-04-05T14:01:00.000Z',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      organization_id: '22222222-2222-4222-8222-222222222222',
      tender_draft_package_id: '66666666-6666-4666-8666-666666666666',
      target_quote_id: '99999999-9999-4999-8999-999999999999',
      import_run_id: '91919191-9191-4919-8919-919191919191',
      block_id: 'selected_references',
      marker_key: '66666666-6666-4666-8666-666666666666:selected_references',
      target_field: 'quote_notes_section',
      target_section_key: 'tender-editor-import:66666666-6666-4666-8666-666666666666:selected_references',
      block_title: 'Vanha referenssiyhteenveto',
      payload_hash: 'old-reference-hash',
      last_applied_content_hash: referencesAppliedHash,
      last_seen_quote_content_hash: referencesAppliedHash,
      drift_status: 'up_to_date',
      last_drift_checked_at: '2026-04-05T14:01:00.000Z',
      revision: 1,
      last_synced_at: '2026-04-05T14:01:00.000Z',
      is_active: true,
      created_at: '2026-04-05T14:01:00.000Z',
      updated_at: '2026-04-05T14:01:00.000Z',
    },
  ];
}

function createTargetQuoteSnapshot() {
  return {
    quote: {
      id: '99999999-9999-4999-8999-999999999999',
      projectId: '13131313-1313-4313-8313-131313131313',
      title: 'Aiemmin importoitu tarjous',
      quoteNumber: 'TAR-001',
      revisionNumber: 1,
      status: 'draft',
      vatPercent: 25.5,
      discountType: 'none',
      discountValue: 0,
      projectCosts: 0,
      deliveryCosts: 0,
      installationCosts: 0,
      travelKilometers: 0,
      travelRatePerKm: 0,
      disposalCosts: 0,
      demolitionCosts: 0,
      protectionCosts: 0,
      permitCosts: 0,
      selectedMarginPercent: 30,
      pricingMode: 'margin',
      ownerUserId: '22222222-2222-4222-8222-222222222222',
      createdAt: '2026-04-05T14:01:00.000Z',
      updatedAt: '2026-04-05T14:01:00.000Z',
      createdByUserId: '22222222-2222-4222-8222-222222222222',
      updatedByUserId: '22222222-2222-4222-8222-222222222222',
      notes: [
        '<!-- tender-editor-import:block:66666666-6666-4666-8666-666666666666:requirements_and_quote_notes:start -->',
        'Vanha tarjoushuomio.',
        '<!-- tender-editor-import:block:66666666-6666-4666-8666-666666666666:requirements_and_quote_notes:end -->',
        '<!-- tender-editor-import:block:66666666-6666-4666-8666-666666666666:selected_references:start -->',
        'Vanha referenssi.',
        '<!-- tender-editor-import:block:66666666-6666-4666-8666-666666666666:selected_references:end -->',
      ].join('\n'),
      internalNotes: null,
    },
    rows: [
      {
        id: '31313131-3131-4313-8313-313131313131',
        quoteId: '99999999-9999-4999-8999-999999999999',
        sortOrder: 0,
        mode: 'section',
        pricingModel: 'unit_price',
        unitPricingMode: 'manual',
        source: 'manual',
        productName: 'Vanha tarjoushuomio',
        quantity: 0,
        unit: 'erä',
        purchasePrice: 0,
        salesPrice: 0,
        installationPrice: 0,
        marginPercent: 0,
        regionMultiplier: 1,
        notes: 'tender-editor-import:66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
        manualSalesPrice: true,
        ownerUserId: '22222222-2222-4222-8222-222222222222',
        createdAt: '2026-04-05T14:01:00.000Z',
        updatedAt: '2026-04-05T14:01:00.000Z',
        createdByUserId: '22222222-2222-4222-8222-222222222222',
        updatedByUserId: '22222222-2222-4222-8222-222222222222',
      },
      {
        id: '41414141-4141-4414-8414-414141414141',
        quoteId: '99999999-9999-4999-8999-999999999999',
        sortOrder: 1,
        mode: 'section',
        pricingModel: 'unit_price',
        unitPricingMode: 'manual',
        source: 'manual',
        productName: 'Vanha referenssiyhteenveto',
        quantity: 0,
        unit: 'erä',
        purchasePrice: 0,
        salesPrice: 0,
        installationPrice: 0,
        marginPercent: 0,
        regionMultiplier: 1,
        notes: 'tender-editor-import:66666666-6666-4666-8666-666666666666:selected_references',
        manualSalesPrice: true,
        ownerUserId: '22222222-2222-4222-8222-222222222222',
        createdAt: '2026-04-05T14:01:00.000Z',
        updatedAt: '2026-04-05T14:01:00.000Z',
        createdByUserId: '22222222-2222-4222-8222-222222222222',
        updatedByUserId: '22222222-2222-4222-8222-222222222222',
      },
    ],
  };
}

describe('tender-editor-reconciliation', () => {
  it('builds a deterministic payload hash from the managed import surface', () => {
    const preview = createPreview(createDraftPackage());
    const sameHash = buildTenderEditorImportPayloadHash(preview.payload);
    const changedPreview = createPreview(createDraftPackage({
      items: [
        {
          ...createDraftPackage().items[0],
          contentMd: 'Muuttunut tarjoushuomio.',
        },
        createDraftPackage().items[1],
      ],
    }));

    expect(sameHash).toBe(preview.payload_hash);
    expect(buildTenderEditorImportPayloadHash(changedPreview.payload)).not.toBe(preview.payload_hash);
  });

  it('marks an imported draft package as stale and reimportable when the payload hash has changed', () => {
    const draftPackage = createDraftPackage({
      importStatus: 'imported',
      reimportStatus: 'up_to_date',
      importRevision: 1,
      lastImportPayloadHash: '1234abcd',
      importedQuoteId: '99999999-9999-4999-8999-999999999999',
      importedAt: '2026-04-05T14:01:00.000Z',
      importedByUserId: '22222222-2222-4222-8222-222222222222',
    });
    const preview = createPreview(draftPackage);
    const latestSuccessfulRun = createSuccessfulRun();
    const reconciliation = buildTenderEditorReconciliationPreview({
      draftPackage,
      preview,
      latestSuccessfulRun,
      targetQuoteId: '99999999-9999-4999-8999-999999999999',
      targetQuoteTitle: 'Aiemmin importoitu tarjous',
      importMode: 'update_existing_quote',
      ownedBlocks: createOwnedBlocks(),
      targetQuoteSnapshot: createTargetQuoteSnapshot(),
    });
    const importState = buildTenderDraftPackageImportState({
      draftPackage,
      preview,
      latestRun: latestSuccessfulRun,
      latestSuccessfulRun,
      targetQuoteId: '99999999-9999-4999-8999-999999999999',
      targetQuoteTitle: 'Aiemmin importoitu tarjous',
      targetProjectId: '13131313-1313-4313-8313-131313131313',
      targetCustomerId: '12121212-1212-4212-8212-121212121212',
      reconciliation,
    });

    expect(resolveTenderDraftPackageReimportStatus({
      draftPackage,
      currentPayloadHash: preview.payload_hash,
      latestSuccessfulRun,
    })).toBe('stale');
    expect(importState.reimport_status).toBe('stale');
    expect(importState.can_reimport).toBe(true);
    expect(importState.ownership_registry_status).toBe('stale');
    expect(importState.owned_block_count).toBe(2);
    expect(importState.last_drift_checked_at).toBe('2026-04-05T14:01:00.000Z');
    expect(importState.safe_reimport_now).toBe(true);
    expect(importState.manual_quote_edit_detected).toBe(false);
    expect(importState.conflict_block_count).toBe(0);
    expect(importState.suggested_import_mode).toBe('update_existing_quote');
  });

  it('builds reconciliation counts for added, changed, removed, and unchanged items', () => {
    const draftPackage = createDraftPackage({
      importStatus: 'imported',
      reimportStatus: 'stale',
      importRevision: 1,
      lastImportPayloadHash: '1234abcd',
      importedQuoteId: '99999999-9999-4999-8999-999999999999',
    });
    const preview = createPreview(draftPackage);
    const reconciliation = buildTenderEditorReconciliationPreview({
      draftPackage,
      preview,
      latestSuccessfulRun: createSuccessfulRun(),
      targetQuoteId: '99999999-9999-4999-8999-999999999999',
      targetQuoteTitle: 'Aiemmin importoitu tarjous',
      importMode: 'update_existing_quote',
      ownedBlocks: createOwnedBlocks(),
      targetQuoteSnapshot: createTargetQuoteSnapshot(),
    });

    expect(reconciliation.added_count).toBe(2);
    expect(reconciliation.changed_count).toBe(0);
    expect(reconciliation.removed_count).toBe(2);
    expect(reconciliation.unchanged_count).toBe(0);
    expect(reconciliation.added_blocks).toBe(1);
    expect(reconciliation.changed_blocks).toBe(1);
    expect(reconciliation.removed_blocks).toBe(1);
    expect(reconciliation.unchanged_blocks).toBe(0);
    expect(reconciliation.blocks.map((block) => block.change_type)).toEqual(['changed', 'added', 'removed']);
    expect(reconciliation.registry_status).toBe('stale');
    expect(reconciliation.safe_reimport_now).toBe(true);
    expect(reconciliation.manual_quote_edit_detected).toBe(false);
    expect(reconciliation.safe_update_block_count).toBe(2);
    expect(reconciliation.conflict_block_count).toBe(0);
    expect(reconciliation.missing_in_quote_block_count).toBe(0);
    expect(reconciliation.registry_stale_block_count).toBe(0);
    expect(reconciliation.skipped_block_count).toBe(0);
    expect(reconciliation.default_update_block_ids).toEqual(['requirements_and_quote_notes', 'notes_for_editor']);
    expect(reconciliation.default_remove_block_ids).toEqual(['selected_references']);
    expect(reconciliation.default_override_conflict_block_ids).toEqual([]);
    expect(reconciliation.blocks.map((block) => block.drift_status)).toEqual(['changed_in_draft', 'changed_in_draft', 'changed_in_draft']);
    expect(reconciliation.can_reimport).toBe(true);
    expect(reconciliation.warnings).toEqual([]);
  });
});
