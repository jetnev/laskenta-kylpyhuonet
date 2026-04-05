import { describe, expect, it } from 'vitest';

import { buildTenderEditorManagedSurface } from './tender-editor-managed-surface';
import { buildTenderDraftPackageImportDiagnostics } from './tender-import-diagnostics';
import {
  buildTenderImportOwnedBlockAppliedContentHash,
  buildTenderImportOwnedBlockPayloadHash,
} from './tender-import-ownership-registry';
import {
  tenderDraftPackageImportRunSchema,
  tenderEditorImportPreviewSchema,
  tenderImportOwnedBlockSchema,
  type TenderEditorImportItem,
} from '../types/tender-editor-import';
import type { Quote, QuoteRow } from '../../../lib/types';

const draftPackageId = '66666666-6666-4666-8666-666666666666';
const tenderPackageId = '77777777-7777-4777-8777-777777777777';
const quoteId = '61616161-6161-4616-8616-616161616161';
const organizationId = '22222222-2222-4222-8222-222222222222';

function createItems(items: TenderEditorImportItem[] = []) {
  return items;
}

function createPreview(items: TenderEditorImportItem[]) {
  const managedSurface = buildTenderEditorManagedSurface({
    draftPackageId,
    items,
  });

  return tenderEditorImportPreviewSchema.parse({
    draft_item_count: items.length,
    importable_item_count: items.length,
    payload_hash: 'preview-payload-hash',
    payload: {
      schema_version: 'tender-editor-import/v2',
      generated_at: '2026-04-12T09:00:00.000Z',
      source_draft_package_id: draftPackageId,
      source_tender_package_id: tenderPackageId,
      source_analysis_job_id: null,
      metadata: {
        draft_package_title: 'Phase 17 draft',
        draft_package_status: 'draft',
        import_status: 'imported',
        reimport_status: 'up_to_date',
        target_quote_title: 'Aiemmin importoitu quote',
        target_quote_id: quoteId,
        target_customer_id: '99999999-9999-4999-8999-999999999999',
        target_project_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        imported_quote_id: quoteId,
        will_create_placeholder_target: false,
      },
      managed_surface: managedSurface,
      sections: {
        quote_notes_md: null,
        quote_internal_notes_md: null,
      },
      items,
    },
    validation: {
      is_valid: true,
      can_import: true,
      warning_count: 0,
      error_count: 0,
      issues: [],
    },
    sections: [],
  });
}

function createRun(runType: 'reimport' | 'diagnostics_refresh' | 'registry_repair', createdAt: string, payload: ReturnType<typeof createPreview>['payload']) {
  return tenderDraftPackageImportRunSchema.parse({
    id: `${createdAt.slice(0, 4)}000000-0000-4000-8000-000000000000`.replace(/[^0-9a-f-]/g, '1').slice(0, 36),
    tender_draft_package_id: draftPackageId,
    target_quote_id: quoteId,
    run_type: runType,
    import_mode: 'update_existing_quote',
    payload_hash: `hash-${runType}`,
    payload_snapshot: payload,
    result_status: 'success',
    summary: `${runType} valmis`,
    execution_metadata: {
      run_type: runType,
    },
    created_by_user_id: organizationId,
    created_at: createdAt,
  });
}

function createQuoteSnapshot(notes: string | null, rows: Array<{ id: string; productName: string; notes: string }>): { quote: Quote; rows: QuoteRow[] } {
  return {
    quote: {
      id: quoteId,
      projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      title: 'Aiemmin importoitu quote',
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
      createdAt: '2026-04-10T09:00:00.000Z',
      updatedAt: '2026-04-12T09:00:00.000Z',
      createdByUserId: organizationId,
      updatedByUserId: organizationId,
      notes: notes ?? undefined,
      internalNotes: undefined,
    },
    rows: rows.map((row, index) => ({
      id: row.id,
      quoteId,
      sortOrder: index,
      mode: 'section' as const,
      pricingModel: 'unit_price' as const,
      unitPricingMode: 'manual' as const,
      source: 'manual' as const,
      productName: row.productName,
      quantity: 0,
      unit: 'erä',
      purchasePrice: 0,
      salesPrice: 0,
      installationPrice: 0,
      marginPercent: 0,
      regionMultiplier: 1,
      notes: row.notes,
      manualSalesPrice: true,
      ownerUserId: organizationId,
      createdAt: '2026-04-10T09:00:00.000Z',
      updatedAt: '2026-04-12T09:00:00.000Z',
      createdByUserId: organizationId,
      updatedByUserId: organizationId,
    })),
  };
}

describe('tender-import-diagnostics', () => {
  it('separates import-like runs from diagnostics and repair runs while keeping a healthy summary', () => {
    const items = createItems([
      {
        draft_package_item_id: '11111111-1111-4111-8111-111111111111',
        source_entity_type: 'requirement',
        source_entity_id: '12121212-1212-4212-8212-121212121212',
        item_type: 'accepted_requirement',
        import_group: 'requirements_and_quote_notes',
        target_kind: 'quote_notes_section',
        target_label: 'Tarjouksen notes-kenttä',
        title: 'Mukana oleva vaatimus',
        content_md: 'Ajantasainen sisältö.',
      },
    ]);
    const preview = createPreview(items);
    const currentBlock = preview.payload.managed_surface!.blocks[0];
    const appliedContentHash = buildTenderImportOwnedBlockAppliedContentHash({
      targetField: currentBlock.target_kind,
      title: currentBlock.title,
      contentMd: currentBlock.content_md,
    });
    const ownedBlock = tenderImportOwnedBlockSchema.parse({
      id: '13131313-1313-4313-8313-131313131313',
      organization_id: organizationId,
      tender_draft_package_id: draftPackageId,
      target_quote_id: quoteId,
      import_run_id: '14141414-1414-4414-8414-141414141414',
      block_id: currentBlock.block_id,
      marker_key: currentBlock.marker_key,
      target_field: currentBlock.target_kind,
      target_section_key: `tender-editor-import:${currentBlock.marker_key}`,
      block_title: currentBlock.title,
      payload_hash: buildTenderImportOwnedBlockPayloadHash(currentBlock),
      last_applied_content_hash: appliedContentHash,
      last_seen_quote_content_hash: appliedContentHash,
      drift_status: 'up_to_date',
      last_drift_checked_at: '2026-04-11T09:00:00.000Z',
      revision: 2,
      last_synced_at: '2026-04-11T09:00:00.000Z',
      is_active: true,
      created_at: '2026-04-10T09:00:00.000Z',
      updated_at: '2026-04-11T09:00:00.000Z',
    });
    const quoteNotes = [
      `<!-- tender-editor-import:block:${currentBlock.marker_key}:start -->`,
      currentBlock.content_md,
      `<!-- tender-editor-import:block:${currentBlock.marker_key}:end -->`,
    ].join('\n');

    const diagnostics = buildTenderDraftPackageImportDiagnostics({
      draftPackageId,
      targetQuoteId: quoteId,
      targetQuoteTitle: 'Aiemmin importoitu quote',
      preview,
      importRuns: [
        createRun('registry_repair', '2026-04-12T11:00:00.000Z', preview.payload),
        createRun('diagnostics_refresh', '2026-04-12T10:00:00.000Z', preview.payload),
        createRun('reimport', '2026-04-12T09:00:00.000Z', preview.payload),
      ],
      ownedBlocks: [ownedBlock],
      targetQuoteSnapshot: createQuoteSnapshot(quoteNotes, [
        {
          id: '15151515-1515-4515-8515-151515151515',
          productName: currentBlock.title,
          notes: `tender-editor-import:${currentBlock.marker_key}`,
        },
      ]),
    });

    expect(diagnostics.summary).toMatchObject({
      healthy_blocks: 1,
      stale_blocks: 0,
      orphaned_registry_blocks: 0,
      total_registry_blocks: 1,
    });
    expect(diagnostics.latest_import_run?.run_type).toBe('reimport');
    expect(diagnostics.latest_diagnostics_refresh_run?.run_type).toBe('diagnostics_refresh');
    expect(diagnostics.latest_registry_repair_run?.run_type).toBe('registry_repair');
    expect(diagnostics.safe_reimport_now).toBe(true);
    expect(diagnostics.repair_recommended).toBe(false);
  });

  it('classifies orphaned active registry rows and recommends metadata-only orphan marking', () => {
    const preview = createPreview([]);
    const markerKey = `${draftPackageId}:selected_references`;
    const orphanedBlock = tenderImportOwnedBlockSchema.parse({
      id: '16161616-1616-4616-8616-161616161616',
      organization_id: organizationId,
      tender_draft_package_id: draftPackageId,
      target_quote_id: quoteId,
      import_run_id: '17171717-1717-4717-8717-171717171717',
      block_id: 'selected_references',
      marker_key: markerKey,
      target_field: 'quote_notes_section',
      target_section_key: `tender-editor-import:${markerKey}`,
      block_title: 'Referenssiyhteenveto',
      payload_hash: 'old-payload-hash',
      last_applied_content_hash: buildTenderImportOwnedBlockAppliedContentHash({
        targetField: 'quote_notes_section',
        title: 'Referenssiyhteenveto',
        contentMd: 'Poistuva referenssi.',
      }),
      last_seen_quote_content_hash: null,
      drift_status: 'up_to_date',
      last_drift_checked_at: '2026-04-11T09:00:00.000Z',
      revision: 1,
      last_synced_at: '2026-04-11T09:00:00.000Z',
      is_active: true,
      created_at: '2026-04-10T09:00:00.000Z',
      updated_at: '2026-04-11T09:00:00.000Z',
    });

    const diagnostics = buildTenderDraftPackageImportDiagnostics({
      draftPackageId,
      targetQuoteId: quoteId,
      targetQuoteTitle: 'Aiemmin importoitu quote',
      preview,
      importRuns: [createRun('reimport', '2026-04-12T09:00:00.000Z', preview.payload)],
      ownedBlocks: [orphanedBlock],
      targetQuoteSnapshot: createQuoteSnapshot(null, []),
    });
    const block = diagnostics.blocks[0];

    expect(diagnostics.summary.orphaned_registry_blocks).toBe(1);
    expect(diagnostics.repair_recommended).toBe(true);
    expect(block.diagnostic_status).toBe('orphaned');
    expect(block.can_mark_orphaned).toBe(true);
    expect(block.recommended_repair_action).toBe('mark_orphaned_registry_entries');
  });
});