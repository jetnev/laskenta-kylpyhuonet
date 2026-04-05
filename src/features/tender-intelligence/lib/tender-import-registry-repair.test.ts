import { describe, expect, it } from 'vitest';

import {
  buildTenderImportRegistryRepairPlan,
  buildTenderImportRegistryRepairPreview,
} from './tender-import-registry-repair';
import {
  tenderDraftPackageImportDiagnosticsSchema,
  tenderImportRegistryDiagnosticBlockSchema,
  type TenderImportRegistryDiagnosticBlock,
  type TenderImportRegistryRepairAction,
} from '../types/tender-editor-import';

const draftPackageId = '66666666-6666-4666-8666-666666666666';
const quoteId = '61616161-6161-4616-8616-616161616161';
const organizationId = '22222222-2222-4222-8222-222222222222';

function createDiagnosticBlock(overrides: Partial<TenderImportRegistryDiagnosticBlock> = {}) {
  return tenderImportRegistryDiagnosticBlockSchema.parse({
    block_id: 'requirements_and_quote_notes',
    marker_key: `${draftPackageId}:requirements_and_quote_notes`,
    target_kind: 'quote_notes_section',
    target_label: 'Tarjouksen notes-kenttä',
    title: 'Tarjoushuomiot',
    registry_entry_id: '11111111-1111-4111-8111-111111111111',
    registry_revision: 2,
    registry_is_active: true,
    registry_last_synced_at: '2026-04-12T09:00:00.000Z',
    registry_last_drift_checked_at: '2026-04-12T09:00:00.000Z',
    registry_payload_hash: 'registry-payload-hash',
    registry_last_applied_content_hash: 'registry-applied-hash',
    registry_last_seen_quote_content_hash: 'registry-quote-hash',
    latest_payload_present: true,
    latest_payload_hash: 'latest-payload-hash',
    latest_payload_applied_content_hash: 'latest-applied-hash',
    live_quote_content_md: 'Ajantasainen live quote -sisalto.',
    live_quote_section_title: 'Tarjoushuomiot',
    live_quote_content_hash: 'live-quote-hash',
    live_quote_marker_present: true,
    live_quote_section_row_present: true,
    latest_import_run_id: '12121212-1212-4212-8212-121212121212',
    drift_status: 'registry_stale',
    diagnostic_status: 'stale',
    is_conflict: false,
    repair_recommended_before_reimport: true,
    recommended_repair_action: 'refresh_registry_metadata',
    can_refresh_registry_metadata: true,
    can_mark_orphaned: false,
    can_prune_inactive: false,
    can_resync_hashes_from_live_quote_markers: false,
    requires_reimport: false,
    warnings: [],
    ...overrides,
  });
}

function createDiagnostics(blocks: TenderImportRegistryDiagnosticBlock[]) {
  return tenderDraftPackageImportDiagnosticsSchema.parse({
    draft_package_id: draftPackageId,
    target_quote_id: quoteId,
    target_quote_title: 'Aiemmin importoitu quote',
    generated_at: '2026-04-12T10:00:00.000Z',
    registry_status: 'stale',
    summary: {
      healthy_blocks: blocks.filter((block) => block.diagnostic_status === 'healthy').length,
      stale_blocks: blocks.filter((block) => block.diagnostic_status === 'stale').length,
      orphaned_registry_blocks: blocks.filter((block) => block.diagnostic_status === 'orphaned').length,
      missing_quote_blocks: blocks.filter((block) => block.diagnostic_status === 'missing_quote').length,
      conflict_blocks: blocks.filter((block) => block.is_conflict).length,
      drifted_quote_blocks: blocks.filter((block) => block.diagnostic_status === 'drifted_quote' || block.diagnostic_status === 'conflict').length,
      drifted_draft_blocks: blocks.filter((block) => block.diagnostic_status === 'drifted_draft' || block.diagnostic_status === 'conflict').length,
      total_registry_blocks: blocks.length,
    },
    blocks,
    latest_import_run: null,
    latest_diagnostics_refresh_run: null,
    latest_registry_repair_run: null,
    last_live_drift_checked_at: '2026-04-12T09:00:00.000Z',
    last_registry_sync_at: '2026-04-12T09:00:00.000Z',
    safe_reimport_now: false,
    manual_quote_edit_detected: false,
    repair_recommended: true,
    warnings: [],
  });
}

describe('tender-import-registry-repair', () => {
  it('builds repair preview summaries and leaves reimport-only blocks as skipped', () => {
    const diagnostics = createDiagnostics([
      createDiagnosticBlock({
        block_id: 'requirements_and_quote_notes',
        recommended_repair_action: 'resync_registry_hashes_from_live_quote_markers',
        can_refresh_registry_metadata: false,
        can_resync_hashes_from_live_quote_markers: true,
      }),
      createDiagnosticBlock({
        block_id: 'selected_references',
        marker_key: `${draftPackageId}:selected_references`,
        title: 'Referenssiyhteenveto',
        registry_entry_id: '13131313-1313-4313-8313-131313131313',
        latest_payload_present: false,
        diagnostic_status: 'missing_quote',
        drift_status: 'removed_from_quote',
        requires_reimport: true,
        recommended_repair_action: null,
        can_refresh_registry_metadata: false,
        can_mark_orphaned: false,
        can_prune_inactive: false,
        can_resync_hashes_from_live_quote_markers: false,
        warnings: ['Vaatii re-importin.'],
      }),
    ]);

    const preview = buildTenderImportRegistryRepairPreview({ diagnostics });
    const resyncAction = preview.actions.find((action) => action.action === 'resync_registry_hashes_from_live_quote_markers');
    const skippedBlock = preview.blocks.find((block) => block.block_id === 'selected_references');

    expect(resyncAction?.eligible_block_ids).toEqual(['requirements_and_quote_notes']);
    expect(skippedBlock?.available_repair_actions).toEqual([]);
    expect(skippedBlock?.skip_reason).toContain('Vaatii re-importin');
  });

  it('builds prune and resync plans without quote content writes', () => {
    const diagnostics = createDiagnostics([
      createDiagnosticBlock({
        block_id: 'selected_references',
        marker_key: `${draftPackageId}:selected_references`,
        title: 'Referenssiyhteenveto',
        registry_entry_id: '14141414-1414-4414-8414-141414141414',
        registry_is_active: false,
        latest_payload_present: false,
        diagnostic_status: 'orphaned',
        drift_status: 'orphaned_registry',
        can_refresh_registry_metadata: false,
        can_mark_orphaned: false,
        can_prune_inactive: true,
        can_resync_hashes_from_live_quote_markers: false,
        recommended_repair_action: 'prune_inactive_registry_entries',
      }),
      createDiagnosticBlock({
        block_id: 'notes_for_editor',
        marker_key: `${draftPackageId}:notes_for_editor`,
        target_kind: 'quote_internal_notes_section',
        target_label: 'Tarjouksen internalNotes-kentta',
        title: 'Sisaiset editorihuomiot',
        registry_entry_id: '15151515-1515-4515-8515-151515151515',
        live_quote_content_hash: 'latest-applied-hash',
        registry_payload_hash: 'old-payload-hash',
        registry_last_applied_content_hash: 'old-applied-hash',
        registry_last_seen_quote_content_hash: 'old-seen-hash',
        can_refresh_registry_metadata: false,
        can_mark_orphaned: false,
        can_prune_inactive: false,
        can_resync_hashes_from_live_quote_markers: true,
        recommended_repair_action: 'resync_registry_hashes_from_live_quote_markers',
      }),
    ]);

    const preview = buildTenderImportRegistryRepairPreview({ diagnostics });
    const prunePlan = buildTenderImportRegistryRepairPlan({
      organizationId: organizationId,
      draftPackageId,
      targetQuoteId: quoteId,
      currentImportRevision: 3,
      diagnostics,
      preview,
      action: 'prune_inactive_registry_entries',
      syncedAt: '2026-04-12T11:00:00.000Z',
    });
    const resyncPlan = buildTenderImportRegistryRepairPlan({
      organizationId: organizationId,
      draftPackageId,
      targetQuoteId: quoteId,
      currentImportRevision: 3,
      diagnostics,
      preview,
      action: 'resync_registry_hashes_from_live_quote_markers',
      syncedAt: '2026-04-12T11:00:00.000Z',
    });

    expect(prunePlan.pruneRegistryRowIds).toEqual(['14141414-1414-4414-8414-141414141414']);
    expect(prunePlan.upsertRecords).toHaveLength(0);
    expect(prunePlan.executionMetadata.pruned_registry_block_ids).toEqual(['selected_references']);

    expect(resyncPlan.pruneRegistryRowIds).toHaveLength(0);
    expect(resyncPlan.upsertRecords).toHaveLength(1);
    expect(resyncPlan.upsertRecords[0]).toMatchObject({
      block_id: 'notes_for_editor',
      payload_hash: 'latest-payload-hash',
      last_applied_content_hash: 'latest-applied-hash',
      last_seen_quote_content_hash: 'latest-applied-hash',
      drift_status: 'up_to_date',
      is_active: true,
    });
    expect(resyncPlan.executionMetadata.refreshed_hash_block_ids).toEqual(['notes_for_editor']);
  });
});