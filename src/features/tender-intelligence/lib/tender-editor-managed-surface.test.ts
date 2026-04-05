import { describe, expect, it } from 'vitest';

import {
  buildTenderEditorManagedFieldContent,
  buildTenderEditorManagedSurface,
  buildTenderEditorManagedSurfaceFromPayload,
} from './tender-editor-managed-surface';
import type { TenderEditorImportItem, TenderEditorImportPayload } from '../types/tender-editor-import';

const draftPackageId = '66666666-6666-4666-8666-666666666666';

const items: TenderEditorImportItem[] = [
  {
    draft_package_item_id: '77777777-7777-4777-8777-777777777777',
    source_entity_type: 'requirement',
    source_entity_id: '44444444-4444-4444-8444-444444444444',
    item_type: 'accepted_requirement',
    import_group: 'requirements_and_quote_notes',
    target_kind: 'quote_notes_section',
    target_label: 'Tarjouksen notes-kenttä',
    title: 'Mukana oleva vaatimus',
    content_md: 'Tämä siirtyy tarjoushuomioihin.',
  },
  {
    draft_package_item_id: '88888888-8888-4888-8888-888888888888',
    source_entity_type: 'review_task',
    source_entity_id: '55555555-5555-4555-8555-555555555555',
    item_type: 'review_note',
    import_group: 'notes_for_editor',
    target_kind: 'quote_internal_notes_section',
    target_label: 'Tarjouksen internalNotes-kenttä',
    title: 'Pidä rajaus näkyvillä',
    content_md: 'Tämä siirtyy sisäisiin huomioihin.',
  },
];

describe('tender-editor-managed-surface', () => {
  it('builds deterministic managed block identifiers and grouped content', () => {
    const surface = buildTenderEditorManagedSurface({ draftPackageId, items });

    expect(surface.contract_version).toBe('tender-editor-managed-surface/v1');
    expect(surface.blocks.map((block) => block.block_id)).toEqual([
      'requirements_and_quote_notes',
      'notes_for_editor',
    ]);
    expect(surface.blocks[0]).toMatchObject({
      marker_key: `${draftPackageId}:requirements_and_quote_notes`,
      title: 'Tarjoushuomiot',
      target_label: 'Tarjouksen notes-kenttä',
    });
    expect(buildTenderEditorManagedFieldContent(surface, 'quote_notes_section')).toContain('## Tarjoushuomiot');
    expect(buildTenderEditorManagedFieldContent(surface, 'quote_internal_notes_section')).toContain('## Sisäiset editorihuomiot');
  });

  it('derives managed blocks from legacy import payload snapshots without managed_surface metadata', () => {
    const payload: TenderEditorImportPayload = {
      schema_version: 'tender-editor-import/v1',
      generated_at: '2026-04-05T14:05:00.000Z',
      source_draft_package_id: draftPackageId,
      source_tender_package_id: '11111111-1111-4111-8111-111111111111',
      source_analysis_job_id: null,
      metadata: {
        draft_package_title: 'Tarjouspaketti / draft package',
        draft_package_status: 'draft',
        import_status: 'imported',
        reimport_status: 'stale',
        target_quote_title: 'Tarjouspaketti / editor import',
        target_quote_id: '61616161-6161-4616-8616-616161616161',
        target_customer_id: null,
        target_project_id: null,
        imported_quote_id: '61616161-6161-4616-8616-616161616161',
        will_create_placeholder_target: false,
      },
      sections: {
        quote_notes_md: '## Tarjoushuomiot\n\n### Mukana oleva vaatimus\n\nTämä siirtyy tarjoushuomioihin.',
        quote_internal_notes_md: '## Sisäiset editorihuomiot\n\n### Pidä rajaus näkyvillä\n\nTämä siirtyy sisäisiin huomioihin.',
      },
      items,
    };

    const surface = buildTenderEditorManagedSurfaceFromPayload(payload);

    expect(surface.blocks).toHaveLength(2);
    expect(surface.blocks[1].marker_key).toBe(`${draftPackageId}:notes_for_editor`);
  });
});