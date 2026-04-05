import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TenderPackageWorkspace from './TenderPackageWorkspace';

describe('TenderPackageWorkspace', () => {
  it('renders user-facing guidance when no tender package is selected', () => {
    const markup = renderToStaticMarkup(
      <TenderPackageWorkspace
        selectedPackage={null}
        referenceProfiles={[]}
        onCreateClick={() => undefined}
        onStartAnalysis={async () => undefined}
        onStartDocumentExtraction={async () => ({}) as never}
        onStartPackageExtraction={async () => []}
        onUploadDocuments={async () => ({ uploaded: [], failed: [] })}
        onDeleteDocument={async () => undefined}
        onSelectDraftPackage={() => undefined}
        onCreateDraftPackage={async () => undefined}
        onImportDraftPackageToEditor={async () => undefined}
        onReimportDraftPackageToEditor={async () => undefined}
        onRefreshDraftPackageImportRegistryRepairPreview={async () => undefined}
        onRefreshDraftPackageImportDiagnosticsFromQuote={async () => undefined}
        onRepairDraftPackageImportRegistry={async () => undefined}
        onOpenImportedQuote={() => undefined}
        onUpdateDraftPackageItem={async () => undefined}
        onMarkDraftPackageReviewed={async () => undefined}
        onMarkDraftPackageExported={async () => undefined}
        onCreateReferenceProfile={async () => undefined}
        onUpdateReferenceProfile={async () => undefined}
        onDeleteReferenceProfile={async () => undefined}
        onUpdateReferenceSuggestion={async () => undefined}
        onRecomputeReferenceSuggestions={async () => undefined}
        onUpdateRequirement={async () => undefined}
        onUpdateMissingItem={async () => undefined}
        onUpdateRiskFlag={async () => undefined}
        onUpdateReviewTask={async () => undefined}
      />,
    );

    expect(markup).toContain('Aloita luomalla tarjouspyyntöpaketti');
    expect(markup).toContain('Tarjouspyyntöpaketti kokoaa tarjouspyynnön dokumentit, havainnot, tehtävät ja myöhemmät luonnospaketit samaan paikkaan.');
    expect(markup).toContain('Tarjouseditoriin vienti');
    expect(markup).not.toContain('Imported quote handoff');
    expect(markup).not.toContain('import-surface');
  });
});