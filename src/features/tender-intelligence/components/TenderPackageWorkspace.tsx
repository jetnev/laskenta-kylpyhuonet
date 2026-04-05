import { ArrowRight, FileText, WarningCircle } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import TenderAnalysisPanel from './TenderAnalysisPanel';
import TenderDraftPackagePanel from './TenderDraftPackagePanel';
import TenderDocumentsPanel from './TenderDocumentsPanel';
import TenderReferenceCorpusPanel from './TenderReferenceCorpusPanel';
import TenderResultPanels from './TenderResultPanels';
import {
  TENDER_ANALYSIS_JOB_STATUS_META,
  TENDER_GO_NO_GO_META,
  TENDER_PACKAGE_STATUS_META,
  TENDER_REVIEW_TASK_STATUS_META,
  formatTenderTimestamp,
  getTenderTextPreview,
} from '../lib/tender-intelligence-ui';
import { TENDER_INTELLIGENCE_BACKEND_PLAN } from '../services/tender-intelligence-backend-adapter';
import type { TenderDocumentsUploadResult } from '../hooks/use-tender-intelligence';
import type {
  TenderDraftPackageImportDiagnostics,
  TenderDraftPackageImportRun,
  TenderDraftPackageImportState,
  TenderEditorImportPreview,
  TenderImportRegistryRepairAction,
  TenderImportRegistryRepairPreview,
  TenderEditorReconciliationPreview,
  TenderEditorImportValidationResult,
} from '../types/tender-editor-import';
import type {
  TenderDraftPackage,
  CreateTenderReferenceProfileInput,
  TenderDocumentExtraction,
  TenderPackageDetails,
  TenderReferenceProfile,
  UpdateTenderDraftPackageItemInput,
  UpdateTenderReferenceProfileInput,
  UpdateTenderWorkflowInput,
} from '../types/tender-intelligence';
import type { TenderIntelligenceResolvedHandoff } from '../lib/tender-intelligence-handoff';

interface TenderPanelProps {
  title: string;
  value: string;
  description: string;
}

function TenderPanel({ title, value, description }: TenderPanelProps) {
  return (
    <Card className="border-slate-200/80 bg-white/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="space-y-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tracking-[-0.02em]">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

interface TenderPackageWorkspaceProps {
  selectedPackage: TenderPackageDetails | null;
  draftPackages?: TenderDraftPackage[];
  referenceProfiles?: TenderReferenceProfile[];
  currentUserId?: string | null;
  actorNameById?: Record<string, string>;
  loading?: boolean;
  notFound?: boolean;
  uploading?: boolean;
  analysisStarting?: boolean;
  extractingPackage?: boolean;
  extractingDocumentIds?: string[];
  deletingDocumentIds?: string[];
  selectedDraftPackageId?: string | null;
  creatingDraftPackagePackageId?: string | null;
  editorImportPreview?: TenderEditorImportPreview | null;
  editorImportValidation?: TenderEditorImportValidationResult | null;
  draftPackageImportState?: TenderDraftPackageImportState | null;
  draftPackageReimportPreview?: TenderEditorReconciliationPreview | null;
  draftPackageImportDiagnostics?: TenderDraftPackageImportDiagnostics | null;
  draftPackageImportRepairPreview?: TenderImportRegistryRepairPreview | null;
  draftPackageImportRuns?: TenderDraftPackageImportRun[];
  previewingEditorImportDraftPackageId?: string | null;
  importingDraftPackageId?: string | null;
  refreshingDraftPackageImportDiagnosticsId?: string | null;
  repairingDraftPackageId?: string | null;
  repairingDraftPackageRegistryAction?: TenderImportRegistryRepairAction | null;
  updatingDraftPackageItemIds?: string[];
  reviewingDraftPackageId?: string | null;
  exportingDraftPackageId?: string | null;
  referenceProfileSubmittingId?: string | 'new' | null;
  deletingReferenceProfileIds?: string[];
  workflowUpdatingTargetIds?: string[];
  recomputingReferenceSuggestionPackageId?: string | null;
  error?: string | null;
  editorHandoff?: TenderIntelligenceResolvedHandoff | null;
  onCreateClick: () => void;
  onStartAnalysis: (packageId: string) => Promise<void>;
  onStartDocumentExtraction: (packageId: string, documentId: string) => Promise<TenderDocumentExtraction>;
  onStartPackageExtraction: (packageId: string) => Promise<TenderDocumentExtraction[]>;
  onUploadDocuments: (packageId: string, files: File[]) => Promise<TenderDocumentsUploadResult>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onSelectDraftPackage: (draftPackageId: string) => void;
  onCreateDraftPackage: (packageId: string) => Promise<unknown>;
  onImportDraftPackageToEditor: (draftPackageId: string) => Promise<unknown>;
  onReimportDraftPackageToEditor: (draftPackageId: string, selection?: TenderEditorSelectiveReimportSelection) => Promise<unknown>;
  onRefreshDraftPackageImportRegistryRepairPreview: (draftPackageId: string) => Promise<unknown>;
  onRefreshDraftPackageImportDiagnosticsFromQuote: (draftPackageId: string) => Promise<unknown>;
  onRepairDraftPackageImportRegistry: (draftPackageId: string, action: TenderImportRegistryRepairAction) => Promise<unknown>;
  onOpenImportedQuote: (projectId: string, quoteId: string) => void;
  onUpdateDraftPackageItem: (itemId: string, input: UpdateTenderDraftPackageItemInput) => Promise<unknown>;
  onMarkDraftPackageReviewed: (draftPackageId: string) => Promise<unknown>;
  onMarkDraftPackageExported: (draftPackageId: string) => Promise<unknown>;
  onCreateReferenceProfile: (input: CreateTenderReferenceProfileInput) => Promise<unknown>;
  onUpdateReferenceProfile: (profileId: string, input: UpdateTenderReferenceProfileInput) => Promise<unknown>;
  onDeleteReferenceProfile: (profileId: string) => Promise<void>;
  onUpdateReferenceSuggestion: (referenceSuggestionId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
  onRecomputeReferenceSuggestions: (packageId: string) => Promise<unknown>;
  onUpdateRequirement: (requirementId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
  onUpdateMissingItem: (missingItemId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
  onUpdateRiskFlag: (riskFlagId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
  onUpdateReviewTask: (reviewTaskId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
}

export default function TenderPackageWorkspace({
  selectedPackage,
  draftPackages = [],
  referenceProfiles = [],
  currentUserId = null,
  actorNameById = {},
  loading = false,
  notFound = false,
  uploading = false,
  analysisStarting = false,
  extractingPackage = false,
  extractingDocumentIds = [],
  deletingDocumentIds = [],
  selectedDraftPackageId = null,
  creatingDraftPackagePackageId = null,
  editorImportPreview = null,
  editorImportValidation = null,
  draftPackageImportState = null,
  draftPackageReimportPreview = null,
  draftPackageImportDiagnostics = null,
  draftPackageImportRepairPreview = null,
  draftPackageImportRuns = [],
  previewingEditorImportDraftPackageId = null,
  importingDraftPackageId = null,
  refreshingDraftPackageImportDiagnosticsId = null,
  repairingDraftPackageId = null,
  repairingDraftPackageRegistryAction = null,
  updatingDraftPackageItemIds = [],
  reviewingDraftPackageId = null,
  exportingDraftPackageId = null,
  referenceProfileSubmittingId = null,
  deletingReferenceProfileIds = [],
  workflowUpdatingTargetIds = [],
  recomputingReferenceSuggestionPackageId = null,
  error = null,
  editorHandoff = null,
  onCreateClick,
  onStartAnalysis,
  onStartDocumentExtraction,
  onStartPackageExtraction,
  onUploadDocuments,
  onDeleteDocument,
  onSelectDraftPackage,
  onCreateDraftPackage,
  onImportDraftPackageToEditor,
  onReimportDraftPackageToEditor,
  onRefreshDraftPackageImportRegistryRepairPreview,
  onRefreshDraftPackageImportDiagnosticsFromQuote,
  onRepairDraftPackageImportRegistry,
  onOpenImportedQuote,
  onUpdateDraftPackageItem,
  onMarkDraftPackageReviewed,
  onMarkDraftPackageExported,
  onCreateReferenceProfile,
  onUpdateReferenceProfile,
  onDeleteReferenceProfile,
  onUpdateReferenceSuggestion,
  onRecomputeReferenceSuggestions,
  onUpdateRequirement,
  onUpdateMissingItem,
  onUpdateRiskFlag,
  onUpdateReviewTask,
}: TenderPackageWorkspaceProps) {
  if (loading && !selectedPackage) {
    return (
      <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
        <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
          Ladataan Tarjousälyn työtilaa...
        </CardContent>
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
        <CardHeader>
          <CardTitle>Pakettia ei löytynyt</CardTitle>
          <CardDescription>
            Valittua tarjouspyyntöpakettia ei löytynyt enää organisaation Tarjousäly-datasta. Valitse toinen paketti listalta tai luo uusi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button onClick={onCreateClick}>Luo tarjouspyyntöpaketti</Button>
        </CardContent>
      </Card>
    );
  }

  if (!selectedPackage) {
    return (
      <Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.75)]">
        <CardHeader className="space-y-4 border-b border-white/10 pb-6">
          <Badge className="w-fit border border-white/15 bg-white/10 text-white hover:bg-white/10">Phase 13 / Imported quote handoff + re-import reconciliation</Badge>
          <div className="space-y-3">
            <CardTitle className="text-3xl tracking-[-0.03em] text-white">Tarjousäly osaa nyt avata importoidun quoten handoffin ja päivittää saman import-surfacein hallitusti takaisin editoriin</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7 text-slate-200">
              Luo tarjouspyyntöpaketti, reviewaa löydökset, muodosta draft package ja tarkista reconciliation-preview. Import on edelleen käyttäjän eksplisiittinen toiminto, mutta sama draft voidaan nyt päivittää takaisin aiemmin importoituun quoteen ilman riskialtista ydinfuusiota.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TenderPanel
              title="Dokumentit"
              value="0"
              description="Dokumenttipaneeli osaa ladata tiedostot Storageen ja käynnistää niille server-side extractionin."
            />
            <TenderPanel
              title="Analyysijobit"
              value="0"
              description="Sääntöpohjainen baseline-run suoritetaan palvelinpuolella Edge Functionin kautta ja voi nyt kirjoittaa myös organisaation referenssikorpukseen perustuvat suggestion-rivit result-domainiin."
            />
            <TenderPanel
              title="Extraction"
              value="0"
              description="Extracted text ja chunkit tallentuvat omaan org-scoped domainiinsa ilman muutoksia Projekta-ytimeen."
            />
            <TenderPanel
              title="Evidence"
              value="0"
              description="Extraction-aware evidence kiinnittää sekä baseline-löydökset että myöhemmät review-päätökset oikeisiin dokumentti- ja chunk-lähteisiin."
            />
            <TenderPanel
              title="Referenssikorpus"
              value={String(referenceProfiles.length)}
              description="Organisaation omat referenssiprofiilit elävät nyt Tarjousälyn omassa corpus-domainissa ja niitä käytetään deterministiseen suggestion-matchaukseen."
            />
            <TenderPanel
              title="Go / No-Go"
              value="Odottaa analyysiä"
              description="Päätöstuki rakennetaan myöhemmin omaksi tulosobjektikseen. Näkyvä analyysitila syntyy jobin elinkaaresta ja result-domainin riveistä."
            />
            <TenderPanel
              title="Draft package"
              value="0"
              description="Reviewed löydöksistä voidaan nyt muodostaa Tarjousälyn staging-luonnospaketti, diffata muutokset viimeiseen importiin ja päivittää sama quote hallitusti adapterin omistamalta pinnalta."
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button className="gap-2" onClick={onCreateClick}>
              Luo tarjouspyyntöpaketti
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const packageStatus = TENDER_PACKAGE_STATUS_META[selectedPackage.package.status];
  const analysisStatus = selectedPackage.latestAnalysisJob
    ? TENDER_ANALYSIS_JOB_STATUS_META[selectedPackage.latestAnalysisJob.status]
    : null;
  const goNoGo = selectedPackage.results.goNoGoAssessment;
  const goNoGoMeta = goNoGo ? TENDER_GO_NO_GO_META[goNoGo.recommendation] : null;
  const nextReviewTask = selectedPackage.results.reviewTasks[0] ?? null;
  const nextReviewTaskMeta = nextReviewTask ? TENDER_REVIEW_TASK_STATUS_META[nextReviewTask.status] : null;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_32px_80px_-48px_rgba(15,23,42,0.75)]">
        <CardHeader className="space-y-5 border-b border-white/10 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/10">Tarjousäly</Badge>
            <Badge variant={packageStatus.variant}>{packageStatus.label}</Badge>
            {analysisStatus && <Badge variant={analysisStatus.variant}>{analysisStatus.label}</Badge>}
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl tracking-[-0.03em] text-white">{selectedPackage.package.name}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7 text-slate-200">
              Tämä tarjouspyyntöpaketti elää omassa Tarjousäly-domainissaan. Dokumentit tallentuvat Supabase Storageen, analyysijobi toimii näkyvästi ja result-domain kirjoittuu pysyvästi omiin tauluihinsa sääntöpohjaisten löydösten, evidence-rivien, review workflow -päätösten, org-korpukseen sidottujen referenssiehdotusten, draft package -stagingin sekä import reconciliation -ajohistorian kanssa, mutta nykyinen quote-editori, exportit, laskentalogiikka ja raportointi pysyvät edelleen mahdollisimman koskemattomina.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Luotu</p>
            <p className="mt-2 text-sm text-slate-100">{formatTenderTimestamp(selectedPackage.package.createdAt)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Viimeisin job</p>
            <p className="mt-2 text-sm text-slate-100">{selectedPackage.latestAnalysisJob?.stageLabel || 'Ei käynnistetty'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Data status</p>
            <p className="mt-2 text-sm text-slate-100">Paketti, dokumenttimetadata, extraction-data, chunkit, analyysijobit, result-domain, evidence-rivit, review workflow -metadata, organisaation referenssikorpus ja draft package -staging luetaan nyt suoraan Supabasesta ilman kytkentää tarjousytimeen.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TenderPanel
          title="Dokumentit"
          value={String(selectedPackage.documents.length)}
          description={
            selectedPackage.documents.length > 0
              ? `${selectedPackage.documents.length} dokumenttia näkyy paketin omassa Storage- ja metadata-tilassa.`
              : 'Dokumentteja ei ole lisätty. Upload-virta on valmis, mutta analyysiä ei vielä käynnistetä.'
          }
        />
        <TenderPanel
          title="Vaatimukset"
          value={String(selectedPackage.results.requirements.length)}
          description={
            selectedPackage.results.requirements.length > 0
              ? 'Baseline-vaatimukset luetaan nyt oikeasta result-domainista, niillä on evidence-ankkurit ja ne voidaan hyväksyä, hylätä tai nostaa huomiota vaativiksi.'
              : 'Vaatimuslista pysyy tyhjänä kunnes ensimmäisen completed-ajon baseline-seed on kirjoitettu tietokantaan.'
          }
        />
        <TenderPanel
          title="Puutteet"
          value={String(selectedPackage.results.missingItems.length)}
          description={
            selectedPackage.results.missingItems.length > 0
              ? 'Avoimet puutteet näkyvät nyt omana workflow-luokkanaan ja niille voi tallentaa ratkaisustatuksen sekä note-kentän.'
              : 'Puutelistat muodostuvat myöhemmin ilman että nykyiseen tarjousdomainiin lisätään väliaikaisia hakkeja.'
          }
        />
        <TenderPanel
          title="Riskit"
          value={String(selectedPackage.results.riskFlags.length)}
          description={
            selectedPackage.results.riskFlags.length > 0
              ? 'Riskit säilyvät omassa domain-kerroksessaan ja niiden käsittelypäätökset tallentuvat nyt audit-tyyppisenä workflow-metadatana.'
              : 'Riskit syntyvät tässä vaiheessa vain selkeistä sääntöosumista. AI-pohjainen riskianalyysi jätetään myöhemmäksi.'
          }
        />
        <TenderPanel
          title="Go / No-Go"
          value={goNoGoMeta?.label || 'Odottaa analyysiä'}
          description={goNoGo?.summary || 'Go / No-Go -päätöstukea ei ole vielä muodostettu.'}
        />
        <TenderPanel
          title="Luonnos"
          value={String(draftPackages.length)}
          description={
            draftPackages[0]?.summary ||
            'Reviewed löydöksistä voidaan nyt muodostaa erillinen draft package -stagingpaketti, jota voi säätää, vertailla viimeiseen importiin ja päivittää samaan quoteen hallitusti.'
          }
        />
        <TenderPanel
          title="Evidence"
          value={String(selectedPackage.resultEvidence.length)}
          description={
            selectedPackage.resultEvidence.length > 0
              ? `${selectedPackage.analysisReadiness.coverage.extractedChunks} chunkia toimii nyt tulosrivien provenance-lähteenä myös review workflow -vaiheessa.`
              : 'Evidence-rivit syntyvät ensimmäisen extraction-aware baseline-ajon yhteydessä.'
          }
        />
      </div>

      <TenderAnalysisPanel
        selectedPackage={selectedPackage}
        loading={loading}
        starting={analysisStarting}
        onStartAnalysis={onStartAnalysis}
      />

      <TenderResultPanels
        selectedPackage={selectedPackage}
        currentUserId={currentUserId}
        actorNameById={actorNameById}
        referenceProfileTitleById={Object.fromEntries(referenceProfiles.map((profile) => [profile.id, profile.title]))}
        updatingTargetIds={workflowUpdatingTargetIds}
        recomputingReferenceSuggestions={recomputingReferenceSuggestionPackageId === selectedPackage.package.id}
        onUpdateRequirement={onUpdateRequirement}
        onUpdateMissingItem={onUpdateMissingItem}
        onUpdateRiskFlag={onUpdateRiskFlag}
        onUpdateReferenceSuggestion={onUpdateReferenceSuggestion}
        onUpdateReviewTask={onUpdateReviewTask}
        onRecomputeReferenceSuggestions={() => onRecomputeReferenceSuggestions(selectedPackage.package.id)}
      />

      <TenderDraftPackagePanel
        selectedPackage={selectedPackage}
        draftPackages={draftPackages}
        selectedDraftPackageId={selectedDraftPackageId}
        creatingDraftPackage={creatingDraftPackagePackageId === selectedPackage.package.id}
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
        onSelectDraftPackage={onSelectDraftPackage}
        onCreateDraftPackage={onCreateDraftPackage}
        onImportDraftPackageToEditor={onImportDraftPackageToEditor}
        onReimportDraftPackageToEditor={onReimportDraftPackageToEditor}
        onRefreshDraftPackageImportRegistryRepairPreview={onRefreshDraftPackageImportRegistryRepairPreview}
        onRefreshDraftPackageImportDiagnosticsFromQuote={onRefreshDraftPackageImportDiagnosticsFromQuote}
        onRepairDraftPackageImportRegistry={onRepairDraftPackageImportRegistry}
        onOpenImportedQuote={onOpenImportedQuote}
        onUpdateDraftPackageItem={onUpdateDraftPackageItem}
        onMarkDraftPackageReviewed={onMarkDraftPackageReviewed}
        onMarkDraftPackageExported={onMarkDraftPackageExported}
        editorHandoff={editorHandoff}
      />

      <TenderDocumentsPanel
        selectedPackage={selectedPackage}
        loading={loading}
        uploading={uploading}
        extractingPackage={extractingPackage}
        extractingDocumentIds={extractingDocumentIds}
        deletingDocumentIds={deletingDocumentIds}
        error={error}
        onStartDocumentExtraction={onStartDocumentExtraction}
        onStartPackageExtraction={onStartPackageExtraction}
        onUploadDocuments={onUploadDocuments}
        onDeleteDocument={onDeleteDocument}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              Katselmointi ja jatkovaihe
            </CardTitle>
            <CardDescription>
              Analyysiajo kulkee edelleen Edge Function -rajan kautta ja käyttää extraction-aware evidence-lähteitä, mutta tämän vaiheen varsinainen hyöty on review workflow: löydökset voidaan nyt käsitellä hallitusti ilman että niitä tarvitsee siirtää vielä tarjousytimeen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {nextReviewTask ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {nextReviewTaskMeta && <Badge variant={nextReviewTaskMeta.variant}>{nextReviewTaskMeta.label}</Badge>}
                  <span className="text-sm font-medium text-slate-900">Seuraava tehtävä</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{nextReviewTask.title}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
                Katselmointitehtäviä ei ole vielä muodostettu.
              </div>
            )}

            <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
              Baseline tunnistaa nyt deadline-, liite- ja referenssiosumia extracted tekstistä, review workflow jalostaa ne käsiteltäviksi työobjekteiksi, draft package kokoaa hyväksytyt löydökset payloadiksi ja Phase 13 tuo niiden päälle imported quote handoffin, ajohistorian sekä hallitun re-import reconciliation -previewn. Varsinainen syvärakenteinen tarjousgenerointi jätetään silti tarkoituksella myöhempiin vaiheisiin.
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <WarningCircle className="h-5 w-5 text-slate-500" />
              Adapterivalmius
            </CardTitle>
            <CardDescription>
              Seuraava vaihe voidaan toteuttaa saman Edge Function -rajan taakse ilman että Tarjousälyä tarvitsee tunkea nykyiseen use-data.ts-monoliittiin tai nykyiseen tarjouseditoriin. Nyt myös provenance-lähteet, review-päätökset ja editoriin vietävä staging-payload kulkevat valmiiksi mukana.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="font-medium text-slate-900">Persistence</p>
              <p className="mt-2">{TENDER_INTELLIGENCE_BACKEND_PLAN.persistence}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="font-medium text-slate-900">Document storage</p>
              <p className="mt-2">{TENDER_INTELLIGENCE_BACKEND_PLAN.documentStorage}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="font-medium text-slate-900">Document extraction</p>
              <p className="mt-2">{TENDER_INTELLIGENCE_BACKEND_PLAN.documentExtraction}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="font-medium text-slate-900">Analysis execution</p>
              <p className="mt-2">{TENDER_INTELLIGENCE_BACKEND_PLAN.analysisExecution}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <TenderReferenceCorpusPanel
        referenceProfiles={referenceProfiles}
        selectedPackageId={selectedPackage.package.id}
        selectedPackageName={selectedPackage.package.name}
        submittingProfileId={referenceProfileSubmittingId}
        deletingProfileIds={deletingReferenceProfileIds}
        recomputingPackageId={recomputingReferenceSuggestionPackageId}
        onCreateProfile={onCreateReferenceProfile}
        onUpdateProfile={onUpdateReferenceProfile}
        onDeleteProfile={onDeleteReferenceProfile}
        onRecomputeSuggestions={onRecomputeReferenceSuggestions}
      />
    </div>
  );
}