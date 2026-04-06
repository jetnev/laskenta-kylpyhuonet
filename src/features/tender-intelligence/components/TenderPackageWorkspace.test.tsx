import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TenderPackageWorkspace from './TenderPackageWorkspace';
import type { TenderPackageDetails } from '../types/tender-intelligence';

function createSelectedPackage(): TenderPackageDetails {
  return {
    package: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tarjouspaketti',
      description: null,
      status: 'review-needed',
      createdAt: '2026-04-06T11:00:00.000Z',
      updatedAt: '2026-04-06T11:00:00.000Z',
      createdByUserId: '22222222-2222-4222-8222-222222222222',
      linkedCustomerId: null,
      linkedProjectId: null,
      linkedQuoteId: null,
      currentJobId: null,
      summary: {
        documentCount: 1,
        requirementCount: 1,
        missingItemCount: 0,
        riskCount: 1,
        reviewTaskCount: 0,
      },
    },
    documents: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        packageId: '11111111-1111-4111-8111-111111111111',
        fileName: 'tarjouspyynto.pdf',
        mimeType: 'application/pdf',
        kind: 'rfp',
        storageBucket: 'tender-intelligence',
        storagePath: 'org/package/file.pdf',
        fileSizeBytes: 200,
        checksum: null,
        uploadError: null,
        uploadState: 'uploaded',
        parseStatus: 'completed',
        createdAt: '2026-04-06T11:00:00.000Z',
        updatedAt: '2026-04-06T11:00:00.000Z',
      },
    ],
    documentExtractions: [],
    resultEvidence: [],
    analysisJobs: [],
    latestAnalysisJob: {
      id: '44444444-4444-4444-8444-444444444444',
      packageId: '11111111-1111-4111-8111-111111111111',
      jobType: 'placeholder_analysis',
      status: 'completed',
      stageLabel: 'Valmis',
      provider: null,
      model: null,
      requestedAt: '2026-04-06T11:01:00.000Z',
      startedAt: '2026-04-06T11:02:00.000Z',
      completedAt: '2026-04-06T11:03:00.000Z',
      errorMessage: null,
    },
    analysisReadiness: {
      canStart: true,
      blockedReason: null,
      coverage: {
        totalDocuments: 1,
        uploadedDocuments: 1,
        supportedDocuments: 1,
        extractedDocuments: 1,
        extractedChunks: 2,
        pendingExtractions: 0,
        failedExtractions: 0,
        unsupportedDocuments: 0,
        documentsNeedingExtraction: 0,
      },
    },
    results: {
      requirements: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          packageId: '11111111-1111-4111-8111-111111111111',
          sourceDocumentId: null,
          requirementType: 'technical',
          title: 'Hyväksytty vaatimus',
          description: null,
          status: 'covered',
          confidence: 0.7,
          sourceExcerpt: null,
          reviewStatus: 'accepted',
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionStatus: 'resolved',
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
          assignedToUserId: null,
        },
      ],
      missingItems: [],
      riskFlags: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          packageId: '11111111-1111-4111-8111-111111111111',
          riskType: 'legal',
          title: 'Sopimusriski auki',
          description: null,
          severity: 'high',
          status: 'open',
          reviewStatus: 'needs_attention',
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          resolutionStatus: 'open',
          resolutionNote: null,
          resolvedByUserId: null,
          resolvedAt: null,
          assignedToUserId: null,
        },
      ],
      goNoGoAssessment: {
        packageId: '11111111-1111-4111-8111-111111111111',
        recommendation: 'conditional-go',
        summary: 'Tarjous voidaan jättää, jos avoin sopimusriski suljetaan ensin.',
        confidence: 0.62,
        updatedAt: '2026-04-06T11:04:00.000Z',
      },
      referenceSuggestions: [],
      draftArtifacts: [],
      reviewTasks: [],
    },
  };
}

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
        onImportReferenceProfiles={async () => undefined}
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

  it('renders go no-go decision support for a selected package', () => {
    const markup = renderToStaticMarkup(
      <TenderPackageWorkspace
        selectedPackage={createSelectedPackage()}
        draftPackages={[]}
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
        onImportReferenceProfiles={async () => undefined}
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

    expect(markup).toContain('Go / No-Go päätöstuki');
    expect(markup).toContain('Tarjous voidaan jättää, jos avoin sopimusriski suljetaan ensin.');
    expect(markup).toContain('Korkean prioriteetin riskit');
    expect(markup).toContain('Seuraavat päätösaskelmat');
    expect(markup).toContain('Tuo referenssejä');
  });
});