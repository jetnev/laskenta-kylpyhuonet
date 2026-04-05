import { describe, expect, it } from 'vitest';

import { buildTenderEditorImportPreview, validateTenderEditorImport } from './tender-editor-import';
import type { TenderDraftPackage } from '../types/tender-intelligence';

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

describe('tender-editor-import', () => {
  it('builds a grouped editor import preview from included draft package items', () => {
    const preview = buildTenderEditorImportPreview({
      draftPackage: createDraftPackage(),
      packageName: 'Tarjouspaketti',
      targetCustomerId: null,
      targetProjectId: null,
      willCreatePlaceholderTarget: true,
      generatedAt: '2026-04-05T14:05:00.000Z',
    });

    expect(preview.importable_item_count).toBe(2);
    expect(preview.payload_hash).toHaveLength(8);
    expect(preview.payload.schema_version).toBe('tender-editor-import/v2');
    expect(preview.payload.managed_surface).toMatchObject({
      contract_version: 'tender-editor-managed-surface/v1',
      blocks: [
        expect.objectContaining({
          block_id: 'requirements_and_quote_notes',
          marker_key: '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
        }),
        expect.objectContaining({
          block_id: 'notes_for_editor',
          marker_key: '66666666-6666-4666-8666-666666666666:notes_for_editor',
        }),
      ],
    });
    expect(preview.payload.metadata.target_quote_title).toBe('Tarjouspaketti / editor import');
    expect(preview.payload.sections.quote_notes_md).toContain('Tarjoushuomiot');
    expect(preview.payload.sections.quote_internal_notes_md).toContain('Sisäiset editorihuomiot');
    expect(preview.sections.find((section) => section.key === 'requirements_and_quote_notes')).toMatchObject({
      item_count: 1,
      target_kind: 'quote_notes_section',
    });
    expect(preview.validation.can_import).toBe(true);
  });

  it('keeps an already imported draft package valid for Phase 13 re-import preview generation', () => {
    const draftPackage = createDraftPackage({
      importStatus: 'imported',
      reimportStatus: 'stale',
      importRevision: 1,
      lastImportPayloadHash: '1234abcd',
      importedQuoteId: '99999999-9999-4999-8999-999999999999',
      importedAt: '2026-04-05T14:10:00.000Z',
      importedByUserId: '22222222-2222-4222-8222-222222222222',
    });
    const preview = buildTenderEditorImportPreview({
      draftPackage,
      packageName: 'Tarjouspaketti',
      targetQuoteId: '99999999-9999-4999-8999-999999999999',
      targetQuoteTitle: 'Aiemmin importoitu tarjous',
      targetCustomerId: '12121212-1212-4212-8212-121212121212',
      targetProjectId: '13131313-1313-4313-8313-131313131313',
      willCreatePlaceholderTarget: false,
      generatedAt: '2026-04-05T14:15:00.000Z',
    });

    expect(preview.validation.can_import).toBe(true);
    expect(preview.payload.metadata.target_quote_id).toBe('99999999-9999-4999-8999-999999999999');
    expect(preview.payload.metadata.reimport_status).toBe('stale');
  });

  it('warns when importable content is missing while still producing a preview payload', () => {
    const draftPackage = createDraftPackage({
      items: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          draftPackageId: '66666666-6666-4666-8666-666666666666',
          itemType: 'accepted_requirement',
          sourceEntityType: 'requirement',
          sourceEntityId: '44444444-4444-4444-8444-444444444444',
          title: 'Mukana oleva vaatimus',
          contentMd: null,
          sortOrder: 0,
          isIncluded: true,
          createdAt: '2026-04-05T14:00:00.000Z',
          updatedAt: '2026-04-05T14:00:00.000Z',
        },
      ],
    });
    const items = buildTenderEditorImportPreview({
      draftPackage,
      packageName: 'Tarjouspaketti',
      targetCustomerId: null,
      targetProjectId: null,
      willCreatePlaceholderTarget: true,
      generatedAt: '2026-04-05T14:20:00.000Z',
    }).payload.items;
    const validation = validateTenderEditorImport({ draftPackage, items });

    expect(validation.can_import).toBe(true);
    expect(validation.warning_count).toBe(1);
    expect(validation.issues[0]).toMatchObject({ code: 'missing_content', severity: 'warning' });
  });
});