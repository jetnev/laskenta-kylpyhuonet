import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import QuoteManagedInterceptionDialogContent, { type QuoteManagedInterceptionDialogRequest } from './QuoteManagedInterceptionDialogContent';

function createRequest(
  status: QuoteManagedInterceptionDialogRequest['status'],
  kind: QuoteManagedInterceptionDialogRequest['kind'],
): QuoteManagedInterceptionDialogRequest {
  return {
    kind,
    status,
    title: status === 'danger' ? 'Muokkaus estetty: Tarjoushuomautukset' : 'Vahvista muokkaus: Tarjoushuomautukset',
    description: status === 'danger'
      ? 'Managed surface on danger-tilassa, joten toimintoa ei voi jatkaa tästä editorista.'
      : 'Tarjousälyn hallinnoima sisältö vaatii vahvistuksen ennen jatkoa.',
    confirmLabel: kind === 'action' ? 'Jatka tästä huolimatta' : 'Muokkaa tästä huolimatta',
    issueMessages: ['Managed marker tai section-linkki puuttuu.'],
    tenderIntelligenceUrl: '/app/tarjousaly',
  };
}

describe('QuoteManagedInterceptionDialogContent', () => {
  it('renders an edit confirmation for clean and warning states', () => {
    const markup = renderToStaticMarkup(
      <QuoteManagedInterceptionDialogContent
        request={createRequest('warning', 'edit')}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(markup).toContain('Tarjousäly edit guard');
    expect(markup).toContain('Vahvista muokkaus: Tarjoushuomautukset');
    expect(markup).toContain('Muokkaa tästä huolimatta');
    expect(markup).toContain('Managed marker tai section-linkki puuttuu.');
  });

  it('renders a blocked danger action with return CTA', () => {
    const markup = renderToStaticMarkup(
      <QuoteManagedInterceptionDialogContent
        request={createRequest('danger', 'action')}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(markup).toContain('Tarjousäly action guard');
    expect(markup).toContain('Muokkaus estetty: Tarjoushuomautukset');
    expect(markup).toContain('Palaa Tarjousälyyn');
    expect(markup).not.toContain('Jatka tästä huolimatta');
  });
});