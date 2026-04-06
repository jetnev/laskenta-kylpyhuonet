import { Plus, Sparkle, Stack, WarningCircle } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppLocationState } from '@/lib/app-routing';
import { useCustomers, useProjects, useQuotes } from '@/hooks/use-data';

import CreateTenderPackageDialog from '../components/CreateTenderPackageDialog';
import TenderPackageList from '../components/TenderPackageList';
import TenderReferenceCorpusPanel from '../components/TenderReferenceCorpusPanel';
import TenderPackageWorkspace from '../components/TenderPackageWorkspace';
import { useTenderIntelligence } from '../hooks/use-tender-intelligence';
import { getTenderIntelligenceEnvironmentIssueTypeFromMessage } from '../lib/tender-intelligence-errors';
import {
  buildTenderIntelligenceReadinessItems,
  buildTenderIntelligenceReadinessSteps,
  getTenderIntelligenceEnvironmentIssueTitle,
} from '../lib/tender-intelligence-readiness';
import { getTenderIntelligenceRepository } from '../services/tender-intelligence-repository';
import {
  resolveTenderIntelligenceHandoff,
  resolveTenderIntelligenceHandoffLabel,
  type TenderIntelligenceResolvedHandoff,
} from '../lib/tender-intelligence-handoff';

const SUMMARY_CARDS = [
  {
    key: 'packages',
    label: 'Paketit',
    description: 'Aktiiviset tarjouspyyntöpaketit',
  },
  {
    key: 'openReviewTasks',
    label: 'Avoimet tehtävät',
    description: 'Käsittelyä odottavat havainnot',
  },
  {
    key: 'referenceProfiles',
    label: 'Referenssit',
    description: 'Tallennetut referenssiprofiilit',
  },
  {
    key: 'openRisks',
    label: 'Riskit',
    description: 'Avoimet riskihavainnot',
  },
  {
    key: 'documents',
    label: 'Dokumentit',
    description: 'Paketteihin liitetyt tiedostot',
  },
] as const;

function resolveTenderIntelligenceErrorState(error: string | null) {
  if (!error) {
    return null;
  }

  const issueType = getTenderIntelligenceEnvironmentIssueTypeFromMessage(error);

  if (issueType) {
    return {
      tone: 'warning' as const,
      issueType,
      title: getTenderIntelligenceEnvironmentIssueTitle(issueType),
      description: error,
    };
  }

  return {
    tone: 'error' as const,
    issueType: null,
    title: 'Tarjousälyn lataus epäonnistui',
    description: error,
  };
}

interface TenderIntelligencePageProps {
  routeState?: AppLocationState;
  onNavigate?: (location: AppLocationState, options?: { replace?: boolean }) => void;
}

function createEmptyHandoffState(): TenderIntelligenceResolvedHandoff {
  return {
    isActive: false,
    status: 'none',
    context: null,
    resolvedTenderPackageId: null,
    resolvedDraftPackageId: null,
    focusedBlockIds: [],
    bannerTone: 'default',
    title: null,
    description: null,
    ctaLabel: null,
  };
}

export default function TenderIntelligencePage({ routeState, onNavigate }: TenderIntelligencePageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editorHandoff, setEditorHandoff] = useState<TenderIntelligenceResolvedHandoff>(() => createEmptyHandoffState());
  const repository = useMemo(() => getTenderIntelligenceRepository(), []);
  const { customers } = useCustomers();
  const { projects } = useProjects();
  const { quotes } = useQuotes();
  const {
    packages,
    draftPackages,
    editorImportPreview,
    editorImportValidation,
    draftPackageImportState,
    draftPackageReimportPreview,
    draftPackageImportDiagnostics,
    draftPackageImportRepairPreview,
    draftPackageImportRuns,
    selectedPackage,
    selectedPackageId,
    selectedDraftPackageId,
    selectedPackageMissing,
    loading,
    creating,
    creatingDraftPackagePackageId,
    previewingEditorImportDraftPackageId,
    importingDraftPackageId,
    refreshingDraftPackageImportDiagnosticsId,
    repairingDraftPackageId,
    repairingDraftPackageRegistryAction,
    error,
    overview,
    canCreate,
    selectPackage,
    selectDraftPackage,
    createPackage,
    referenceProfiles,
    startAnalysis,
    uploadDocuments,
    deleteDocument,
    uploading,
    updatingDraftPackageItemIds,
    referenceProfileSubmittingId,
    deletingReferenceProfileIds,
    importingReferenceProfiles,
    providerProfileSubmittingKey,
    deletingProviderProfileItemKeys,
    reviewingDraftPackageId,
    startingAnalysisPackageId,
    extractingPackageId,
    extractingDocumentIds,
    startDocumentExtraction,
    startPackageExtraction,
    deletingDocumentIds,
    exportingDraftPackageId,
    workflowUpdatingTargetIds,
    recomputingReferenceSuggestionPackageId,
    actorNameById,
    currentUserId,
    createDraftPackage,
    importDraftPackageToEditor,
    reimportDraftPackageToEditor,
    refreshDraftPackageImportRegistryRepairPreview,
    refreshDraftPackageImportDiagnosticsFromQuote,
    repairDraftPackageImportRegistry,
    updateDraftPackageItem,
    markDraftPackageReviewed,
    markDraftPackageExported,
    createReferenceProfile,
    importReferenceProfiles,
    updateReferenceProfile,
    deleteReferenceProfile,
    upsertProviderProfile,
    upsertProviderContact,
    deleteProviderContact,
    upsertProviderCredential,
    deleteProviderCredential,
    upsertProviderConstraint,
    deleteProviderConstraint,
    upsertProviderDocument,
    deleteProviderDocument,
    upsertProviderResponseTemplate,
    deleteProviderResponseTemplate,
    recomputeReferenceSuggestions,
    updateRequirementWorkflow,
    updateMissingItemWorkflow,
    updateRiskFlagWorkflow,
    updateReferenceSuggestionWorkflow,
    updateDraftArtifactWorkflow,
    updateReviewTaskWorkflow,
  } = useTenderIntelligence();

  useEffect(() => {
    let active = true;

    const resolveRouteHandoff = async () => {
      if (!routeState) {
        if (active) {
          setEditorHandoff(createEmptyHandoffState());
        }
        return;
      }

      const tenderPackageId = routeState.tenderContext?.tenderPackageId;
      const draftPackageId = routeState.tenderContext?.draftPackageId;

      try {
        const [tenderPackage, draftPackage] = await Promise.all([
          tenderPackageId ? repository.getTenderPackageById(tenderPackageId) : Promise.resolve(null),
          draftPackageId ? repository.getDraftPackageById(draftPackageId) : Promise.resolve(null),
        ]);

        if (active) {
          setEditorHandoff(resolveTenderIntelligenceHandoff(routeState, {
            tenderPackage: tenderPackage?.package ?? null,
            draftPackage,
          }));
        }
      } catch {
        if (active) {
          setEditorHandoff({
            isActive: true,
            status: 'missing_context',
            context: routeState.tenderContext ?? null,
            resolvedTenderPackageId: routeState.tenderContext?.tenderPackageId ?? null,
            resolvedDraftPackageId: routeState.tenderContext?.draftPackageId ?? null,
            focusedBlockIds: (routeState.tenderContext?.blockIds ?? []) as TenderIntelligenceResolvedHandoff['focusedBlockIds'],
            bannerTone: 'warning',
            title: 'Editorin lähdekontekstia ei voitu tarkistaa',
            description: 'Tarjousäly avattiin editorista, mutta lähdedraftin tarkistaminen epäonnistui. Työtila pysyy ehjänä ja voit valita luonnoksen myös käsin.',
            ctaLabel: routeState.tenderContext?.intent
              ? resolveTenderIntelligenceHandoffLabel(routeState.tenderContext.intent)
              : null,
          });
        }
      }
    };

    void resolveRouteHandoff();

    return () => {
      active = false;
    };
  }, [repository, routeState]);

  useEffect(() => {
    if (!editorHandoff.isActive) {
      return;
    }

    if (editorHandoff.resolvedTenderPackageId && selectedPackageId !== editorHandoff.resolvedTenderPackageId) {
      selectPackage(editorHandoff.resolvedTenderPackageId);
      return;
    }

    if (
      editorHandoff.resolvedDraftPackageId
      && selectedPackageId === editorHandoff.resolvedTenderPackageId
      && selectedDraftPackageId !== editorHandoff.resolvedDraftPackageId
    ) {
      selectDraftPackage(editorHandoff.resolvedDraftPackageId);
    }
  }, [editorHandoff, selectDraftPackage, selectPackage, selectedDraftPackageId, selectedPackageId]);

  const openImportedQuote = useCallback((projectId: string, quoteId: string) => {
    onNavigate?.({
      page: 'projects',
      projectId,
      quoteId,
      editor: 'quote',
    });
  }, [onNavigate]);
  const errorState = resolveTenderIntelligenceErrorState(error);
  const customerNameById = useMemo(
    () => Object.fromEntries(customers.map((customer) => [customer.id, customer.name])),
    [customers],
  );
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const quoteLabelById = useMemo(
    () => Object.fromEntries(quotes.map((quote) => [quote.id, `${quote.quoteNumber} • ${quote.title}`])),
    [quotes],
  );
  const readinessItems = useMemo(
    () => (errorState?.tone === 'warning' && errorState.issueType ? buildTenderIntelligenceReadinessItems(errorState.issueType) : []),
    [errorState],
  );
  const readinessSteps = useMemo(
    () => (errorState?.tone === 'warning' && errorState.issueType ? buildTenderIntelligenceReadinessSteps(errorState.issueType) : []),
    [errorState],
  );

  const resolveReadinessBadgeVariant = (state: 'ready' | 'check' | 'blocked') => {
    if (state === 'blocked') {
      return 'destructive' as const;
    }

    if (state === 'ready') {
      return 'default' as const;
    }

    return 'outline' as const;
  };

  const resolveReadinessBadgeLabel = (state: 'ready' | 'check' | 'blocked') => {
    if (state === 'blocked') {
      return 'Estää käytön';
    }

    if (state === 'ready') {
      return 'Näyttää valmiilta';
    }

    return 'Tarkista';
  };

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.75)]">
        <CardContent className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit border border-white/15 bg-white/10 text-white hover:bg-white/10">Tarjousäly</Badge>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Kokoa tarjouspyynnön aineisto yhteen paikkaan ja valmistele vastaus hallitusti</h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
                  Luo tarjouspyyntöpaketti, lisää dokumentit ja käy havainnot läpi ennen kuin viet sisältöä tarjouseditoriin. Tarjousäly pitää tarjouspyynnön aineiston, katselmoinnin ja luonnospaketit samassa näkymässä ilman että nykyinen tarjouseditori muuttuu taustalla.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:min-w-56">
              <Button className="justify-between bg-white text-slate-950 hover:bg-slate-100" onClick={() => setShowCreateDialog(true)} disabled={!canCreate || creating}>
                Luo tarjouspyyntöpaketti
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="justify-between border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" disabled>
                Dokumentit, katselmointi ja luonnospaketit etenevät paketin kautta
                <Sparkle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SUMMARY_CARDS.map((card) => (
              <div key={card.key} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{overview[card.key]}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {errorState && (
        <div className={[
          'rounded-2xl border px-4 py-4 text-sm leading-6',
          errorState.tone === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-950'
            : 'border-red-200 bg-red-50 text-red-700',
        ].join(' ')}>
          <div className="flex items-center gap-2 font-medium">
            <WarningCircle className="h-4 w-4" />
            {errorState.title}
          </div>
          <p className="mt-1">{errorState.description}</p>
        </div>
      )}

      {errorState?.tone === 'warning' && errorState.issueType && (
        <Card className="border-amber-200 bg-amber-50/70 shadow-none">
          <CardHeader className="border-b border-amber-200/80">
            <CardTitle className="text-base text-amber-950">Ympäristövalmius Tarjousälylle</CardTitle>
            <CardDescription className="text-amber-900/90">
              Nykyinen virhe näyttää siltä, että ympäristöstä puuttuu yksi tai useampi Tarjousälyn käyttöönoton peruspalikka. Tarkista nämä kohdat ennen uutta testiä tai frontend-rolloutia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-3 lg:grid-cols-2">
              {readinessItems.map((item) => (
                <div key={item.key} className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-amber-950">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-amber-900/90">{item.detail}</p>
                    </div>
                    <Badge variant={resolveReadinessBadgeVariant(item.state)}>{resolveReadinessBadgeLabel(item.state)}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-4">
              <p className="text-sm font-medium text-amber-950">Tarkista seuraavaksi tässä järjestyksessä</p>
              <div className="mt-3 space-y-2">
                {readinessSteps.map((step, index) => (
                  <p key={`${errorState.issueType}-step-${index}`} className="text-sm leading-6 text-amber-900/90">
                    {index + 1}. {step}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {editorHandoff.isActive && editorHandoff.title && editorHandoff.description && (editorHandoff.status !== 'ready' || !selectedPackage || !selectedDraftPackageId || selectedDraftPackageId === editorHandoff.resolvedDraftPackageId) && (
        <div className={[
          'rounded-2xl border px-4 py-4 text-sm leading-6',
          editorHandoff.bannerTone === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-950'
            : 'border-sky-200 bg-sky-50 text-sky-950',
        ].join(' ')}>
          <div className="font-medium">{editorHandoff.title}</div>
          <p className="mt-1">{editorHandoff.description}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <TenderPackageList
          packages={packages}
          selectedPackageId={selectedPackageId}
          customerNameById={customerNameById}
          projectNameById={projectNameById}
          quoteLabelById={quoteLabelById}
          loading={loading}
          createDisabled={!canCreate || creating}
          onCreateClick={() => setShowCreateDialog(true)}
          onSelectPackage={selectPackage}
        />
        <TenderPackageWorkspace
          selectedPackage={selectedPackage}
          draftPackages={draftPackages}
          referenceProfiles={referenceProfiles}
          currentUserId={currentUserId}
          actorNameById={actorNameById}
          customerNameById={customerNameById}
          projectNameById={projectNameById}
          quoteLabelById={quoteLabelById}
          loading={loading}
          notFound={selectedPackageMissing}
          uploading={uploading}
          analysisStarting={Boolean(selectedPackage && startingAnalysisPackageId === selectedPackage.package.id)}
          extractingPackage={Boolean(selectedPackage && extractingPackageId === selectedPackage.package.id)}
          extractingDocumentIds={extractingDocumentIds}
          deletingDocumentIds={deletingDocumentIds}
          selectedDraftPackageId={selectedDraftPackageId}
          creatingDraftPackagePackageId={creatingDraftPackagePackageId}
          editorImportPreview={editorImportPreview}
          editorImportValidation={editorImportValidation}
          draftPackageImportState={draftPackageImportState}
          draftPackageReimportPreview={draftPackageReimportPreview}
          draftPackageImportDiagnostics={draftPackageImportDiagnostics}
          draftPackageImportRepairPreview={draftPackageImportRepairPreview}
          draftPackageImportRuns={draftPackageImportRuns}
          previewingEditorImportDraftPackageId={previewingEditorImportDraftPackageId}
          importingDraftPackageId={importingDraftPackageId}
          refreshingDraftPackageImportDiagnosticsId={refreshingDraftPackageImportDiagnosticsId}
          repairingDraftPackageId={repairingDraftPackageId}
          repairingDraftPackageRegistryAction={repairingDraftPackageRegistryAction}
          updatingDraftPackageItemIds={updatingDraftPackageItemIds}
          reviewingDraftPackageId={reviewingDraftPackageId}
          exportingDraftPackageId={exportingDraftPackageId}
          referenceProfileSubmittingId={referenceProfileSubmittingId}
          deletingReferenceProfileIds={deletingReferenceProfileIds}
          importingReferenceProfiles={importingReferenceProfiles}
          providerProfileSubmittingKey={providerProfileSubmittingKey}
          deletingProviderProfileItemKeys={deletingProviderProfileItemKeys}
          workflowUpdatingTargetIds={workflowUpdatingTargetIds}
          recomputingReferenceSuggestionPackageId={recomputingReferenceSuggestionPackageId}
          error={error}
          onCreateClick={() => setShowCreateDialog(true)}
          onStartAnalysis={async (packageId) => {
            await startAnalysis(packageId);
          }}
          onStartDocumentExtraction={startDocumentExtraction}
          onStartPackageExtraction={startPackageExtraction}
          onUploadDocuments={uploadDocuments}
          onDeleteDocument={deleteDocument}
          onSelectDraftPackage={selectDraftPackage}
          onCreateDraftPackage={createDraftPackage}
          onImportDraftPackageToEditor={async (draftPackageId) => {
            const result = await importDraftPackageToEditor(draftPackageId);
            toast.success(result.summary);
            return result;
          }}
          onReimportDraftPackageToEditor={async (draftPackageId, selection) => {
            const result = await reimportDraftPackageToEditor(draftPackageId, selection);
            toast.success(result.summary);
            return result;
          }}
          onRefreshDraftPackageImportRegistryRepairPreview={async (draftPackageId) => {
            const preview = await refreshDraftPackageImportRegistryRepairPreview(draftPackageId);
            toast.success('Registry repair -preview päivitettiin.');
            return preview;
          }}
          onRefreshDraftPackageImportDiagnosticsFromQuote={async (draftPackageId) => {
            const diagnostics = await refreshDraftPackageImportDiagnosticsFromQuote(draftPackageId);
            toast.success('Import-diagnostiikka päivitettiin live quotesta.');
            return diagnostics;
          }}
          onRepairDraftPackageImportRegistry={async (draftPackageId, action) => {
            const result = await repairDraftPackageImportRegistry(draftPackageId, action);
            toast.success(result.summary);
            return result;
          }}
          onOpenImportedQuote={openImportedQuote}
          onUpdateDraftPackageItem={updateDraftPackageItem}
          onMarkDraftPackageReviewed={markDraftPackageReviewed}
          onMarkDraftPackageExported={markDraftPackageExported}
          onCreateReferenceProfile={createReferenceProfile}
          onImportReferenceProfiles={importReferenceProfiles}
          onUpdateReferenceProfile={updateReferenceProfile}
          onDeleteReferenceProfile={deleteReferenceProfile}
          onUpsertProviderProfile={upsertProviderProfile}
          onUpsertProviderContact={upsertProviderContact}
          onDeleteProviderContact={deleteProviderContact}
          onUpsertProviderCredential={upsertProviderCredential}
          onDeleteProviderCredential={deleteProviderCredential}
          onUpsertProviderConstraint={upsertProviderConstraint}
          onDeleteProviderConstraint={deleteProviderConstraint}
          onUpsertProviderDocument={upsertProviderDocument}
          onDeleteProviderDocument={deleteProviderDocument}
          onUpsertProviderResponseTemplate={upsertProviderResponseTemplate}
          onDeleteProviderResponseTemplate={deleteProviderResponseTemplate}
          onUpdateReferenceSuggestion={updateReferenceSuggestionWorkflow}
          onRecomputeReferenceSuggestions={recomputeReferenceSuggestions}
          onUpdateRequirement={updateRequirementWorkflow}
          onUpdateMissingItem={updateMissingItemWorkflow}
          onUpdateRiskFlag={updateRiskFlagWorkflow}
          onUpdateDraftArtifact={updateDraftArtifactWorkflow}
          onUpdateReviewTask={updateReviewTaskWorkflow}
          editorHandoff={editorHandoff}
        />
      </div>

      {!selectedPackage && (
        <TenderReferenceCorpusPanel
          referenceProfiles={referenceProfiles}
          selectedPackageId={null}
          selectedPackageName={null}
          submittingProfileId={referenceProfileSubmittingId}
          deletingProfileIds={deletingReferenceProfileIds}
          importingProfiles={importingReferenceProfiles}
          recomputingPackageId={recomputingReferenceSuggestionPackageId}
          onCreateProfile={createReferenceProfile}
          onImportProfiles={importReferenceProfiles}
          onUpdateProfile={updateReferenceProfile}
          onDeleteProfile={deleteReferenceProfile}
        />
      )}

      <Card className="border-dashed border-slate-200 bg-slate-50/70 shadow-none">
        <CardContent className="flex flex-col gap-4 px-6 py-5 text-sm text-slate-700 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-950">
              <Stack className="h-4 w-4" />
              <span className="font-medium">Mitä tämä vaihe jo tekee</span>
            </div>
            <p>Tarjouspyyntöpaketteihin voi jo tallentaa dokumentit, ajaa analyysin, käsitellä havainnot, hyödyntää referenssiprofiileja ja muodostaa luonnospaketin tarjouseditoria varten. Työ etenee vaiheittain, jotta tarjouspyynnön valmistelu pysyy erillään varsinaisesta tarjouksen kirjoittamisesta.</p>
          </div>
          <div className="space-y-2 sm:max-w-sm">
            <p className="font-medium text-slate-950">Mitä tästä puuttuu tarkoituksella</p>
            <p>Ei vielä OCR:ää, AI-avusteista sisällöntuotantoa tai täysin automaattista tarjouksen muodostusta. Tarjouseditoriin tehdään vain hallittu vienti, jotta nykyinen tarjous-, projekti- ja raportointilogiikka pysyy vakaana.</p>
          </div>
        </CardContent>
      </Card>

      <CreateTenderPackageDialog
        open={showCreateDialog}
        submitting={creating}
        customers={customers}
        projects={projects}
        quotes={quotes}
        onOpenChange={setShowCreateDialog}
        onCreate={async (input) => {
          const created = await createPackage(input);
          toast.success(`Tarjouspyyntöpaketti “${created.package.name}” tallennettiin organisaation Tarjousäly-dataan.`);
        }}
      />
    </div>
  );
}