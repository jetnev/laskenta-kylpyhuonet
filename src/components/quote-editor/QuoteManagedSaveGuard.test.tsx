import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { QuoteTenderManagedEditorState } from '../../features/tender-intelligence/lib/quote-managed-surface-inspector';
import QuoteManagedSaveGuard from './QuoteManagedSaveGuard';

function createState(
  status: QuoteTenderManagedEditorState['status'],
  overrides: Partial<QuoteTenderManagedEditorState> = {},
): QuoteTenderManagedEditorState {
  return {
    has_tarjousaly_managed_surface: true,
    status,
    warning_count: status === 'warning' ? 1 : 0,
    danger_count: status === 'danger' ? 1 : 0,
    issues: status === 'clean'
      ? []
      : [
          {
            code: status === 'danger' ? 'marker_missing' : 'managed_notes_block_changed',
            severity: status === 'danger' ? 'danger' : 'warning',
            message: status === 'danger'
              ? 'Managed marker tai siihen sidottu section-linkki puuttuu.'
              : 'Managed notes -lohkon rakenne on muuttunut editorissa.',
            marker_key: 'draft:block',
            block_id: 'requirements_and_quote_notes',
            field: 'notes',
          },
        ],
    ...overrides,
  };
}

describe('QuoteManagedSaveGuard', () => {
  it('renders a clean managed summary and save action', () => {
    const markup = renderToStaticMarkup(
      <QuoteManagedSaveGuard
        state={createState('clean')}
        isEditable
        onSave={() => undefined}
        tenderIntelligenceUrl="/app/tarjousaly"
      />,
    );

    expect(markup).toContain('Tarjousälyn hallinnoitu sisältö kunnossa');
    expect(markup).toContain('Tallenna luonnos');
    expect(markup).not.toContain('Palaa Tarjousälyyn');
  });

  it('renders warning summary without hiding the save path', () => {
    const markup = renderToStaticMarkup(
      <QuoteManagedSaveGuard
        state={createState('warning')}
        isEditable
        onSave={() => undefined}
        tenderIntelligenceUrl="/app/tarjousaly"
      />,
    );

    expect(markup).toContain('Tarjousälyn hallinnoidussa sisällössä muutoksia');
    expect(markup).toContain('Tallenna luonnos');
    expect(markup).toContain('Managed notes -lohkon rakenne on muuttunut editorissa.');
  });

  it('renders blocked danger state with return CTA', () => {
    const markup = renderToStaticMarkup(
      <QuoteManagedSaveGuard
        state={createState('danger')}
        isEditable
        onSave={() => undefined}
        tenderIntelligenceUrl="/app/tarjousaly"
      />,
    );

    expect(markup).toContain('Tarjousälyn hallinnoitu sisältö on rikkoutunut');
    expect(markup).toContain('Normaali tallennus on estetty');
    expect(markup).toContain('Palaa Tarjousälyyn');
    expect(markup).not.toContain('Tallenna luonnos');
  });
});