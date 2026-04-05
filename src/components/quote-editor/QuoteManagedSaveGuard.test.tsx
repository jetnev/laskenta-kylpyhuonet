import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildTenderIntelligenceQuoteEditorHandoff } from '../../features/tender-intelligence/lib/tender-intelligence-handoff';
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

const repairLink = buildTenderIntelligenceQuoteEditorHandoff({
  tenderPackageId: '11111111-1111-4111-8111-111111111111',
  draftPackageId: '66666666-6666-4666-8666-666666666666',
  importedQuoteId: '77777777-7777-4777-8777-777777777777',
  intent: 'repair-managed-import',
  blockIds: ['requirements_and_quote_notes'],
});

describe('QuoteManagedSaveGuard', () => {
  it('renders a clean managed summary and save action', () => {
    const markup = renderToStaticMarkup(
      <QuoteManagedSaveGuard
        state={createState('clean')}
        isEditable
        onSave={() => undefined}
        tenderIntelligenceLink={repairLink}
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
        tenderIntelligenceLink={repairLink}
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
        tenderIntelligenceLink={repairLink}
      />,
    );

    expect(markup).toContain('Tarjousälyn hallinnoitu sisältö on rikkoutunut');
    expect(markup).toContain('Normaali tallennus on estetty');
    expect(markup).toContain('Korjaa Tarjousälyn hallittu sisältö');
    expect(markup).toContain('intent=repair-managed-import');
    expect(markup).not.toContain('Tallenna luonnos');
  });
});