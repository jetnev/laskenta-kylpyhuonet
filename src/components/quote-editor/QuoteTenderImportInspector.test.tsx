import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import QuoteManagedSectionBadge from './QuoteManagedSectionBadge';
import QuoteTenderImportInspector from './QuoteTenderImportInspector';
import type { QuoteTenderManagedSurfaceDiagnostics } from '../../features/tender-intelligence/lib/quote-managed-surface-inspector';

function createDiagnostics(overrides: Partial<QuoteTenderManagedSurfaceDiagnostics> = {}): QuoteTenderManagedSurfaceDiagnostics {
  return {
    has_tarjousaly_managed_surface: true,
    managed_blocks_total: 2,
    managed_sections_total: 2,
    managed_notes_blocks_total: 1,
    unknown_marker_blocks_total: 0,
    duplicate_marker_blocks_total: 0,
    probable_drift_blocks_total: 1,
    health_status: 'needs_attention',
    draft_package_ids: ['66666666-6666-4666-8666-666666666666'],
    primary_draft_package_id: '66666666-6666-4666-8666-666666666666',
    multiple_draft_package_sources: false,
    managed_block_ids: ['requirements_and_quote_notes', 'notes_for_editor'],
    marker_keys: [
      '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
      '66666666-6666-4666-8666-666666666666:notes_for_editor',
    ],
    detected_fields: ['notes', 'internalNotes', 'sections'],
    blocks: [
      {
        marker_key: '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
        draft_package_id: '66666666-6666-4666-8666-666666666666',
        block_id: 'requirements_and_quote_notes',
        known_block_id: 'requirements_and_quote_notes',
        title: 'Tarjoushuomiot',
        expected_target_kind: 'quote_notes_section',
        expected_text_field: 'notes',
        text_fields: ['notes'],
        text_marker_count: 1,
        section_row_ids: ['row-1'],
        section_row_titles: ['Tarjoushuomiot'],
        section_row_count: 1,
        has_text_marker: true,
        has_section_row: true,
        unknown_marker: false,
        duplicate_marker: false,
        probable_drift: false,
        health_status: 'clean',
      },
      {
        marker_key: '66666666-6666-4666-8666-666666666666:notes_for_editor',
        draft_package_id: '66666666-6666-4666-8666-666666666666',
        block_id: 'notes_for_editor',
        known_block_id: 'notes_for_editor',
        title: 'Sisäiset editorihuomiot',
        expected_target_kind: 'quote_internal_notes_section',
        expected_text_field: 'internalNotes',
        text_fields: ['internalNotes'],
        text_marker_count: 1,
        section_row_ids: ['row-2'],
        section_row_titles: ['Sisäiset editorihuomiot'],
        section_row_count: 1,
        has_text_marker: true,
        has_section_row: true,
        unknown_marker: false,
        duplicate_marker: false,
        probable_drift: true,
        health_status: 'needs_attention',
      },
    ],
    ...overrides,
  };
}

describe('QuoteTenderImportInspector', () => {
  it('renders source details, transparency guidance, and managed block summary', () => {
    const markup = renderToStaticMarkup(
      <QuoteTenderImportInspector
        diagnostics={createDiagnostics()}
        source={{
          draftPackageId: '66666666-6666-4666-8666-666666666666',
          draftPackageTitle: 'Kylpyhuone / draft package',
          tenderPackageId: '11111111-1111-4111-8111-111111111111',
          tenderPackageTitle: 'Kylpyhuoneen tarjouspyyntö',
        }}
        tenderIntelligenceUrl="/app/tarjousaly"
      />,
    );

    expect(markup).toContain('Tarjousäly-importti');
    expect(markup).toContain('Kylpyhuone / draft package');
    expect(markup).toContain('Kylpyhuoneen tarjouspyyntö');
    expect(markup).toContain('Avaa Tarjousäly');
    expect(markup).toContain('Tee päivitykset Tarjousälyn draft package / re-import -näkymästä');
    expect(markup).toContain('Tarjoushuomiot');
    expect(markup).toContain('Sisäiset editorihuomiot');
  });

  it('does not render when the quote has no managed Tarjousaly surface', () => {
    const markup = renderToStaticMarkup(
      <QuoteTenderImportInspector diagnostics={createDiagnostics({ has_tarjousaly_managed_surface: false })} />,
    );

    expect(markup).toBe('');
  });
});

describe('QuoteManagedSectionBadge', () => {
  it('renders the clean Tarjousaly section badge', () => {
    const markup = renderToStaticMarkup(
      <QuoteManagedSectionBadge
        sectionState={{
          marker_key: '66666666-6666-4666-8666-666666666666:requirements_and_quote_notes',
          block_id: 'requirements_and_quote_notes',
          title: 'Tarjoushuomiot',
          draft_package_id: '66666666-6666-4666-8666-666666666666',
          health_status: 'clean',
          label: 'Tarjousäly',
        }}
      />,
    );

    expect(markup).toContain('Tarjousäly');
  });

  it('renders the attention badge variant for drifting managed sections', () => {
    const markup = renderToStaticMarkup(
      <QuoteManagedSectionBadge
        sectionState={{
          marker_key: '66666666-6666-4666-8666-666666666666:notes_for_editor',
          block_id: 'notes_for_editor',
          title: 'Sisäiset editorihuomiot',
          draft_package_id: '66666666-6666-4666-8666-666666666666',
          health_status: 'needs_attention',
          label: 'Tarjousäly / tarkista',
        }}
      />,
    );

    expect(markup).toContain('Tarjousäly / tarkista');
  });
});