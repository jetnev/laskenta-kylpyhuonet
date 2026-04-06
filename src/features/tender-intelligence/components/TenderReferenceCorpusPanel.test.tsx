import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TenderReferenceCorpusPanel from './TenderReferenceCorpusPanel';

describe('TenderReferenceCorpusPanel', () => {
  it('renders import and create actions for the organization corpus', () => {
    const markup = renderToStaticMarkup(
      <TenderReferenceCorpusPanel
        referenceProfiles={[]}
        selectedPackageId="11111111-1111-4111-8111-111111111111"
        selectedPackageName="Tarjouspaketti"
        onCreateProfile={async () => undefined}
        onImportProfiles={async () => undefined}
        onUpdateProfile={async () => undefined}
        onDeleteProfile={async () => undefined}
        onRecomputeSuggestions={async () => undefined}
      />,
    );

    expect(markup).toContain('Organisaation referenssikorpus');
    expect(markup).toContain('Tuo referenssejä');
    expect(markup).toContain('Lisää referenssi');
    expect(markup).toContain('Organisaation referenssikorpus on vielä tyhjä.');
  });
});