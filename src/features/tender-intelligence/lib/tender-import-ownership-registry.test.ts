import { describe, expect, it } from 'vitest';

import { mapTenderImportOwnedBlockRowToDomain } from './tender-intelligence-mappers';
import {
  buildTenderImportOwnedBlockAppliedContentHash,
  buildTenderImportOwnedBlockPayloadHash,
  buildTenderImportOwnedBlockWriteRecords,
  resolveTenderEditorSelectiveReimportSelection,
} from './tender-import-ownership-registry';
import { buildTenderImportOwnedBlockDriftStates } from './tender-import-drift';
import type { TenderEditorManagedBlock, TenderEditorReconciliationBlock } from '../types/tender-editor-import';
import type { TenderImportOwnedBlockRow } from '../types/tender-intelligence-db';

const draftPackageId = '66666666-6666-4666-8666-666666666666';
const quoteId = '61616161-6161-4616-8616-616161616161';
const organizationId = '22222222-2222-4222-8222-222222222222';

function createCurrentBlocks(): TenderEditorManagedBlock[] {
  return [
    {
      block_id: 'requirements_and_quote_notes',
      marker_key: `${draftPackageId}:requirements_and_quote_notes`,
      import_group: 'requirements_and_quote_notes',
      target_kind: 'quote_notes_section',
      target_label: 'Tarjouksen notes-kenttä',
      title: 'Tarjoushuomiot',
      content_md: '## Tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nUusi sisältö.',
      item_count: 1,
      owned_by_adapter: true,
    },
    {
      block_id: 'notes_for_editor',
      marker_key: `${draftPackageId}:notes_for_editor`,
      import_group: 'notes_for_editor',
      target_kind: 'quote_internal_notes_section',
      target_label: 'Tarjouksen internalNotes-kenttä',
      title: 'Sisäiset editorihuomiot',
      content_md: '## Sisäiset editorihuomiot\n\n### Uusi note\n\nPidä mukana.',
      item_count: 1,
      owned_by_adapter: true,
    },
  ];
}

function createOwnedBlockRow(blockId: TenderImportOwnedBlockRow['block_id'], targetField: TenderImportOwnedBlockRow['target_field']): TenderImportOwnedBlockRow {
  const blockTitle = blockId === 'requirements_and_quote_notes' ? 'Vanha tarjoushuomio' : 'Vanha referenssiyhteenveto';
  const contentMd = blockId === 'requirements_and_quote_notes' ? 'Vanha tarjoushuomio.' : 'Vanha referenssi.';
  const appliedContentHash = buildTenderImportOwnedBlockAppliedContentHash({
    targetField,
    title: blockTitle,
    contentMd,
  });

  return {
    id: blockId === 'requirements_and_quote_notes'
      ? '11111111-1111-4111-8111-111111111111'
      : '22222222-2222-4222-8222-222222222222',
    organization_id: organizationId,
    tender_draft_package_id: draftPackageId,
    target_quote_id: quoteId,
    import_run_id: '31313131-3131-4313-8313-313131313131',
    block_id: blockId,
    marker_key: `${draftPackageId}:${blockId}`,
    target_field: targetField,
    target_section_key: `tender-editor-import:${draftPackageId}:${blockId}`,
    block_title: blockTitle,
    payload_hash: blockId === 'requirements_and_quote_notes' ? 'oldhash01' : 'oldhash02',
    last_applied_content_hash: appliedContentHash,
    last_seen_quote_content_hash: appliedContentHash,
    drift_status: 'up_to_date',
    last_drift_checked_at: '2026-04-05T15:00:00.000Z',
    revision: 2,
    last_synced_at: '2026-04-05T15:00:00.000Z',
    is_active: true,
    created_at: '2026-04-05T15:00:00.000Z',
    updated_at: '2026-04-05T15:00:00.000Z',
  };
}

function createExecutionMetadata() {
  return {
    selected_block_ids: ['requirements_and_quote_notes', 'notes_for_editor', 'selected_references'],
    selected_update_block_ids: ['requirements_and_quote_notes', 'notes_for_editor'],
    selected_remove_block_ids: ['selected_references'],
    conflict_block_ids: [],
    skipped_conflict_block_ids: [],
    override_conflict_block_ids: [],
    updated_block_ids: ['requirements_and_quote_notes', 'notes_for_editor'],
    removed_block_ids: ['selected_references'],
    missing_in_quote_block_ids: [],
    untouched_block_ids: [],
    run_mode: 'protected_reimport',
    conflict_policy: 'protect_conflicts' as const,
    summary_counts: {
      selected_blocks: 3,
      conflict_blocks: 0,
      skipped_conflicts: 0,
      updated_blocks: 2,
      removed_blocks: 1,
      missing_in_quote_blocks: 0,
      untouched_blocks: 0,
    },
  };
}

function createTargetQuoteSnapshot() {
  return {
    quote: {
      id: quoteId,
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
      ownerUserId: organizationId,
      createdAt: '2026-04-05T15:00:00.000Z',
      updatedAt: '2026-04-05T15:00:00.000Z',
      createdByUserId: organizationId,
      updatedByUserId: organizationId,
      notes: [
        `<!-- tender-editor-import:block:${draftPackageId}:requirements_and_quote_notes:start -->`,
        'Vanha tarjoushuomio.',
        `<!-- tender-editor-import:block:${draftPackageId}:requirements_and_quote_notes:end -->`,
        `<!-- tender-editor-import:block:${draftPackageId}:selected_references:start -->`,
        'Vanha referenssi.',
        `<!-- tender-editor-import:block:${draftPackageId}:selected_references:end -->`,
      ].join('\n'),
      internalNotes: null,
    },
    rows: [
      {
        id: '31313131-3131-4313-8313-313131313131',
        quoteId,
        sortOrder: 0,
        mode: 'section' as const,
        pricingModel: 'unit_price' as const,
        unitPricingMode: 'manual' as const,
        source: 'manual' as const,
        productName: 'Vanha tarjoushuomio',
        quantity: 0,
        unit: 'erä',
        purchasePrice: 0,
        salesPrice: 0,
        installationPrice: 0,
        marginPercent: 0,
        regionMultiplier: 1,
        notes: `tender-editor-import:${draftPackageId}:requirements_and_quote_notes`,
        manualSalesPrice: true,
        ownerUserId: organizationId,
        createdAt: '2026-04-05T15:00:00.000Z',
        updatedAt: '2026-04-05T15:00:00.000Z',
        createdByUserId: organizationId,
        updatedByUserId: organizationId,
      },
      {
        id: '41414141-4141-4414-8414-414141414141',
        quoteId,
        sortOrder: 1,
        mode: 'section' as const,
        pricingModel: 'unit_price' as const,
        unitPricingMode: 'manual' as const,
        source: 'manual' as const,
        productName: 'Vanha referenssiyhteenveto',
        quantity: 0,
        unit: 'erä',
        purchasePrice: 0,
        salesPrice: 0,
        installationPrice: 0,
        marginPercent: 0,
        regionMultiplier: 1,
        notes: `tender-editor-import:${draftPackageId}:selected_references`,
        manualSalesPrice: true,
        ownerUserId: organizationId,
        createdAt: '2026-04-05T15:00:00.000Z',
        updatedAt: '2026-04-05T15:00:00.000Z',
        createdByUserId: organizationId,
        updatedByUserId: organizationId,
      },
    ],
  };
}

describe('tender-import-ownership-registry', () => {
  it('maps ownership registry rows from DB shape into domain shape', () => {
    const row = createOwnedBlockRow('requirements_and_quote_notes', 'quote_notes_section');
    const block = mapTenderImportOwnedBlockRowToDomain(row);

    expect(block).toMatchObject({
      id: row.id,
      block_id: 'requirements_and_quote_notes',
      target_field: 'quote_notes_section',
      target_section_key: `tender-editor-import:${draftPackageId}:requirements_and_quote_notes`,
      revision: 2,
      is_active: true,
    });
  });

  it('builds write records only for selected updates and safe owned removals when registry already exists', () => {
    const currentBlocks = createCurrentBlocks();
    const ownedBlocks = [
      mapTenderImportOwnedBlockRowToDomain(createOwnedBlockRow('requirements_and_quote_notes', 'quote_notes_section')),
      mapTenderImportOwnedBlockRowToDomain(createOwnedBlockRow('selected_references', 'quote_notes_section')),
    ];
    const targetQuoteSnapshot = createTargetQuoteSnapshot();
    const driftStates = buildTenderImportOwnedBlockDriftStates({
      draftPackageId,
      currentBlocks,
      ownedBlocks,
      fallbackBlocks: [],
      fallbackMeta: {
        importRunId: '31313131-3131-4313-8313-313131313131',
        revision: 2,
        lastSyncedAt: '2026-04-05T15:00:00.000Z',
      },
      quote: targetQuoteSnapshot.quote,
      rows: targetQuoteSnapshot.rows,
    });
    const records = buildTenderImportOwnedBlockWriteRecords({
      organizationId,
      draftPackageId,
      targetQuoteId: quoteId,
      importRunId: '41414141-4141-4414-8414-414141414141',
      currentBlocks,
      driftStates,
      executionMetadata: createExecutionMetadata(),
      syncedAt: '2026-04-05T16:00:00.000Z',
      nextRevision: 3,
    });

    expect(records).toHaveLength(3);
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        block_id: 'requirements_and_quote_notes',
        is_active: true,
        revision: 3,
        payload_hash: buildTenderImportOwnedBlockPayloadHash(currentBlocks[0]),
      }),
      expect.objectContaining({
        block_id: 'notes_for_editor',
        is_active: true,
        target_field: 'quote_internal_notes_section',
      }),
      expect.objectContaining({
        block_id: 'selected_references',
        is_active: false,
        revision: 3,
      }),
    ]));
  });

  it('keeps only selectable block ids in selective reimport selection resolution', () => {
    const blocks: TenderEditorReconciliationBlock[] = [
      {
        block_id: 'requirements_and_quote_notes',
        marker_key: `${draftPackageId}:requirements_and_quote_notes`,
        import_group: 'requirements_and_quote_notes',
        target_kind: 'quote_notes_section',
        target_label: 'Tarjouksen notes-kenttä',
        title: 'Tarjoushuomiot',
        change_type: 'changed',
        current_content_md: 'Uusi sisältö.',
        previous_content_md: 'Vanha sisältö.',
        current_item_count: 1,
        previous_item_count: 1,
        registry_entry_id: '11111111-1111-4111-8111-111111111111',
        registry_revision: 2,
        registry_last_synced_at: '2026-04-05T15:00:00.000Z',
        last_applied_content_hash: 'applied-hash-1',
        last_seen_quote_content_hash: 'quote-hash-1',
        drift_status: 'changed_in_both',
        is_conflict: true,
        can_override_conflict: true,
        ownership_source: 'registry',
        text_marker_present: true,
        section_row_present: true,
        can_select_for_update: true,
        can_select_for_removal: false,
        selected_for_update: true,
        selected_for_removal: false,
        selected_conflict_override: false,
        warnings: [],
        owned_by_adapter: true,
      },
      {
        block_id: 'selected_references',
        marker_key: `${draftPackageId}:selected_references`,
        import_group: 'selected_references',
        target_kind: 'quote_notes_section',
        target_label: 'Tarjouksen notes-kenttä',
        title: 'Referenssiyhteenveto',
        change_type: 'removed',
        current_content_md: null,
        previous_content_md: 'Poistuva sisältö.',
        current_item_count: null,
        previous_item_count: 1,
        registry_entry_id: '22222222-2222-4222-8222-222222222222',
        registry_revision: 2,
        registry_last_synced_at: '2026-04-05T15:00:00.000Z',
        last_applied_content_hash: 'applied-hash-2',
        last_seen_quote_content_hash: 'quote-hash-2',
        drift_status: 'changed_in_draft',
        is_conflict: false,
        can_override_conflict: false,
        ownership_source: 'registry',
        text_marker_present: true,
        section_row_present: true,
        can_select_for_update: false,
        can_select_for_removal: true,
        selected_for_update: false,
        selected_for_removal: true,
        selected_conflict_override: false,
        warnings: [],
        owned_by_adapter: true,
      },
      {
        block_id: 'notes_for_editor',
        marker_key: `${draftPackageId}:notes_for_editor`,
        import_group: 'notes_for_editor',
        target_kind: 'quote_internal_notes_section',
        target_label: 'Tarjouksen internalNotes-kenttä',
        title: 'Sisäiset editorihuomiot',
        change_type: 'unchanged',
        current_content_md: 'Sama sisältö.',
        previous_content_md: 'Sama sisältö.',
        current_item_count: 1,
        previous_item_count: 1,
        registry_entry_id: '33333333-3333-4333-8333-333333333333',
        registry_revision: 2,
        registry_last_synced_at: '2026-04-05T15:00:00.000Z',
        last_applied_content_hash: 'applied-hash-3',
        last_seen_quote_content_hash: 'quote-hash-3',
        drift_status: 'up_to_date',
        is_conflict: false,
        can_override_conflict: false,
        ownership_source: 'registry',
        text_marker_present: true,
        section_row_present: true,
        can_select_for_update: false,
        can_select_for_removal: false,
        selected_for_update: false,
        selected_for_removal: false,
        selected_conflict_override: false,
        warnings: [],
        owned_by_adapter: true,
      },
    ];

    const selection = resolveTenderEditorSelectiveReimportSelection({
      blocks,
      selection: {
        update_block_ids: ['requirements_and_quote_notes', 'notes_for_editor'],
        remove_block_ids: ['selected_references', 'notes_for_editor'],
        override_conflict_block_ids: ['requirements_and_quote_notes', 'selected_references'],
        conflict_policy: 'override_selected_conflicts',
      },
    });

    expect(selection.updateBlockIds).toEqual(['requirements_and_quote_notes']);
    expect(selection.removeBlockIds).toEqual(['selected_references']);
    expect(selection.overrideConflictBlockIds).toEqual(['requirements_and_quote_notes']);
    expect(selection.conflictPolicy).toBe('override_selected_conflicts');
  });
});