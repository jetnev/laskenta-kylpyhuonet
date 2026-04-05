import { ArrowSquareOut, ArrowsClockwise, ClockCounterClockwise, FileText, ListChecks, Note, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { buildTenderDraftPackageReadiness } from '../lib/tender-draft-package';
import { buildTenderEditorManagedSurfaceFromPayload } from '../lib/tender-editor-managed-surface';
import {
  formatTenderTimestamp,
  getTenderTextPreview,
  TENDER_DRAFT_PACKAGE_IMPORT_STATUS_META,
  TENDER_DRAFT_PACKAGE_REIMPORT_STATUS_META,
  TENDER_EDITOR_IMPORT_MODE_META,
  TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META,
  TENDER_IMPORT_OWNERSHIP_REGISTRY_STATUS_META,
  TENDER_DRAFT_PACKAGE_ITEM_TYPE_META,
  TENDER_DRAFT_PACKAGE_STATUS_META,
  TENDER_RESOLUTION_STATUS_META,
  TENDER_REVIEW_STATUS_META,
} from '../lib/tender-intelligence-ui';
import type {
  TenderDraftPackageImportRun,
  TenderDraftPackageImportState,
  TenderEditorImportPreview,
  TenderEditorManagedBlockId,
  TenderEditorSelectiveReimportSelection,
  TenderEditorReconciliationPreview,
  TenderEditorImportValidationResult,
} from '../types/tender-editor-import';
import type {
  TenderDraftPackage,
  TenderDraftPackageItem,
  TenderPackageDetails,
  UpdateTenderDraftPackageItemInput,
} from '../types/tender-intelligence';

interface TenderDraftPackagePanelProps {
  selectedPackage: TenderPackageDetails;
  draftPackages: TenderDraftPackage[];
  selectedDraftPackageId?: string | null;
  creatingDraftPackage?: boolean;
  editorImportPreview?: TenderEditorImportPreview | null;
  editorImportValidation?: TenderEditorImportValidationResult | null;
  draftPackageImportState?: TenderDraftPackageImportState | null;
  draftPackageReimportPreview?: TenderEditorReconciliationPreview | null;
  draftPackageImportRuns?: TenderDraftPackageImportRun[];
  previewingEditorImportDraftPackageId?: string | null;
  importingDraftPackageId?: string | null;
  reviewingDraftPackageId?: string | null;
  exportingDraftPackageId?: string | null;
  updatingDraftPackageItemIds?: string[];
  onSelectDraftPackage: (draftPackageId: string) => void;
  onCreateDraftPackage: (packageId: string) => Promise<unknown>;
  onImportDraftPackageToEditor: (draftPackageId: string) => Promise<unknown>;
  onReimportDraftPackageToEditor: (draftPackageId: string, selection?: TenderEditorSelectiveReimportSelection) => Promise<unknown>;
  onOpenImportedQuote: (projectId: string, quoteId: string) => void;
  onUpdateDraftPackageItem: (itemId: string, input: UpdateTenderDraftPackageItemInput) => Promise<unknown>;
  onMarkDraftPackageReviewed: (draftPackageId: string) => Promise<unknown>;
  onMarkDraftPackageExported: (draftPackageId: string) => Promise<unknown>;
}

function resolveIssueVariant(severity: 'info' | 'warning' | 'error') {
  if (severity === 'error') {
    return 'destructive' as const;
  }

  if (severity === 'warning') {
    return 'outline' as const;
  }

  return 'secondary' as const;
}

function shortenHash(value?: string | null) {
  const nextValue = value?.trim();
  return nextValue ? nextValue.slice(0, 8) : 'Ei hashia';
}

function resolvePrimaryImportActionLabel(importState: TenderDraftPackageImportState | null | undefined) {
  if (importState?.suggested_import_mode === 'update_existing_quote') {
    return 'Päivitä samaan quoteen';
  }

  return 'Tuo editoriin';
}

function resolveReconciliationChangeLabel(changeType: 'added' | 'changed' | 'removed' | 'unchanged') {
  switch (changeType) {
    case 'added':
      return 'Uusi lohko';
    case 'changed':
      return 'Muuttuu';
    case 'removed':
      return 'Poistuu';
    case 'unchanged':
      return 'Ennallaan';
    default:
      return changeType;
  }
}

function resolveReconciliationChangeVariant(changeType: 'added' | 'changed' | 'removed' | 'unchanged') {
  switch (changeType) {
    case 'added':
      return 'default' as const;
    case 'changed':
      return 'outline' as const;
    case 'removed':
      return 'destructive' as const;
    case 'unchanged':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

function resolveOwnershipSourceLabel(source: 'registry' | 'latest_successful_run' | 'current_payload') {
  switch (source) {
    case 'registry':
      return 'Registry';
    case 'latest_successful_run':
      return 'Viimeisin onnistunut import';
    case 'current_payload':
      return 'Nykyinen payload';
    default:
      return source;
  }
}

function ReadinessCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function resolveSourceEntity(selectedPackage: TenderPackageDetails, item: TenderDraftPackageItem) {
  switch (item.sourceEntityType) {
    case 'requirement':
      return selectedPackage.results.requirements.find((candidate) => candidate.id === item.sourceEntityId) ?? null;
    case 'missing_item':
      return selectedPackage.results.missingItems.find((candidate) => candidate.id === item.sourceEntityId) ?? null;
    case 'reference_suggestion':
      return selectedPackage.results.referenceSuggestions.find((candidate) => candidate.id === item.sourceEntityId) ?? null;
    case 'review_task':
      return selectedPackage.results.reviewTasks.find((candidate) => candidate.id === item.sourceEntityId) ?? null;
    case 'draft_artifact':
      return selectedPackage.results.draftArtifacts.find((candidate) => candidate.id === item.sourceEntityId) ?? null;
    default:
      return null;
  }
}

function getExcludedMessage(sourceEntity: ReturnType<typeof resolveSourceEntity>) {
  if (!sourceEntity) {
    return 'Rivi on jätetty pois nykyisen luonnospaketin payloadista.';
  }

  if (sourceEntity.reviewStatus === 'unreviewed') {
    return 'Rivi on vielä tarkistamatta, joten sitä ei viedä oletuksena draft packageen.';
  }

  if (sourceEntity.reviewStatus === 'dismissed' || sourceEntity.resolutionStatus === 'wont_fix') {
    return 'Rivi on hylätty katselmoinnissa, joten se jätetään export payloadin ulkopuolelle.';
  }

  if (sourceEntity.resolutionStatus === 'open' || sourceEntity.resolutionStatus === 'in_progress') {
    return 'Rivin ratkaisu on vielä kesken, joten sitä ei viedä oletuksena luonnospakettiin.';
  }

  return 'Rivi on jätetty pois tämän draft package -version payloadista.';
}

function DraftItemCard({
  item,
  selectedPackage,
  pending,
  onToggle,
}: {
  item: TenderDraftPackageItem;
  selectedPackage: TenderPackageDetails;
  pending: boolean;
  onToggle: (nextIncluded: boolean) => Promise<unknown>;
}) {
  const sourceEntity = resolveSourceEntity(selectedPackage, item);
  const itemMeta = TENDER_DRAFT_PACKAGE_ITEM_TYPE_META[item.itemType];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={itemMeta.variant}>{itemMeta.label}</Badge>
          {sourceEntity && <Badge variant={TENDER_REVIEW_STATUS_META[sourceEntity.reviewStatus].variant}>{TENDER_REVIEW_STATUS_META[sourceEntity.reviewStatus].label}</Badge>}
          {sourceEntity && <Badge variant={TENDER_RESOLUTION_STATUS_META[sourceEntity.resolutionStatus].variant}>{TENDER_RESOLUTION_STATUS_META[sourceEntity.resolutionStatus].label}</Badge>}
        </div>
        <Button
          type="button"
          size="sm"
          variant={item.isIncluded ? 'outline' : 'default'}
          disabled={pending}
          onClick={() => {
            void onToggle(!item.isIncluded);
          }}
        >
          {pending ? 'Tallennetaan...' : item.isIncluded ? 'Jätä pois' : 'Lisää mukaan'}
        </Button>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-950">{item.title}</p>
      {item.contentMd && <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-line">{getTenderTextPreview(item.contentMd, 320)}</p>}
      {!item.isIncluded && <p className="mt-3 text-xs leading-5 text-muted-foreground">{getExcludedMessage(sourceEntity)}</p>}
    </div>
  );
}

export default function TenderDraftPackagePanel({
  selectedPackage,
  draftPackages,
  selectedDraftPackageId = null,
  creatingDraftPackage = false,
  editorImportPreview = null,
  editorImportValidation = null,
  draftPackageImportState = null,
  draftPackageReimportPreview = null,
  draftPackageImportRuns = [],
  previewingEditorImportDraftPackageId = null,
  importingDraftPackageId = null,
  reviewingDraftPackageId = null,
  exportingDraftPackageId = null,
  updatingDraftPackageItemIds = [],
  onSelectDraftPackage,
  onCreateDraftPackage,
  onImportDraftPackageToEditor,
  onReimportDraftPackageToEditor,
  onOpenImportedQuote,
  onUpdateDraftPackageItem,
  onMarkDraftPackageReviewed,
  onMarkDraftPackageExported,
}: TenderDraftPackagePanelProps) {
  const readiness = useMemo(() => buildTenderDraftPackageReadiness(selectedPackage), [selectedPackage]);
  const selectedDraftPackage = useMemo(
    () => draftPackages.find((candidate) => candidate.id === selectedDraftPackageId) ?? draftPackages[0] ?? null,
    [draftPackages, selectedDraftPackageId],
  );
  const includedItems = selectedDraftPackage?.items.filter((item) => item.isIncluded) ?? [];
  const excludedItems = selectedDraftPackage?.items.filter((item) => !item.isIncluded) ?? [];
  const payload = selectedDraftPackage?.exportPayload ?? null;
  const importValidation = editorImportValidation ?? editorImportPreview?.validation ?? null;
  const managedSurface = useMemo(
    () => (editorImportPreview ? buildTenderEditorManagedSurfaceFromPayload(editorImportPreview.payload) : null),
    [editorImportPreview],
  );
  const managedBlocks = managedSurface?.blocks ?? [];
  const latestImportRun = draftPackageImportRuns[0] ?? draftPackageImportState?.latest_run ?? null;
  const canOpenImportedQuote = Boolean(selectedDraftPackage?.importedQuoteId && selectedPackage.package.linkedProjectId);
  const [selectedUpdateBlockIds, setSelectedUpdateBlockIds] = useState<TenderEditorManagedBlockId[]>([]);
  const [selectedRemoveBlockIds, setSelectedRemoveBlockIds] = useState<TenderEditorManagedBlockId[]>([]);
  const [confirmSelectiveReimport, setConfirmSelectiveReimport] = useState(false);
  const selectedUpdateBlockIdSet = useMemo(() => new Set(selectedUpdateBlockIds), [selectedUpdateBlockIds]);
  const selectedRemoveBlockIdSet = useMemo(() => new Set(selectedRemoveBlockIds), [selectedRemoveBlockIds]);
  const selectedSelectiveBlockCount = selectedUpdateBlockIds.length + selectedRemoveBlockIds.length;
  const canExecuteSelectiveReimport = Boolean(
    selectedDraftPackage
    && draftPackageImportState?.suggested_import_mode === 'update_existing_quote'
    && draftPackageReimportPreview?.selective_reimport_available
    && confirmSelectiveReimport
    && selectedSelectiveBlockCount > 0,
  );
  const selectiveReimportSelection = useMemo<TenderEditorSelectiveReimportSelection>(
    () => ({
      update_block_ids: selectedUpdateBlockIds,
      remove_block_ids: selectedRemoveBlockIds,
    }),
    [selectedRemoveBlockIds, selectedUpdateBlockIds],
  );

  const updateSelectedBlockIds = (
    setIds: typeof setSelectedUpdateBlockIds,
    blockId: TenderEditorManagedBlockId,
    checked: boolean,
  ) => {
    setIds((current) => {
      if (checked) {
        return current.includes(blockId) ? current : [...current, blockId];
      }

      return current.filter((candidate) => candidate !== blockId);
    });
  };

  useEffect(() => {
    if (!selectedDraftPackageId && draftPackages[0]) {
      onSelectDraftPackage(draftPackages[0].id);
    }
  }, [draftPackages, onSelectDraftPackage, selectedDraftPackageId]);

  useEffect(() => {
    setSelectedUpdateBlockIds(draftPackageReimportPreview?.default_update_block_ids ?? []);
    setSelectedRemoveBlockIds(draftPackageReimportPreview?.default_remove_block_ids ?? []);
    setConfirmSelectiveReimport(false);
  }, [
    draftPackageReimportPreview?.current_payload_hash,
    draftPackageReimportPreview?.previous_payload_hash,
    draftPackageReimportPreview?.registry_status,
    selectedDraftPackage?.id,
  ]);

  return (
    <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4.5 w-4.5 text-slate-500" />
              Managed import surface hardening
            </CardTitle>
            <CardDescription>
              Tämä vaihe rajaa Tarjousälyn hallitsemat editorilohkot eksplisiittisesti, näyttää niiden block-level diffit ja päivittää re-importissa vain adapterin varmasti omistaman notes-, internalNotes- ja section-pinnan.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              type="button"
              disabled={creatingDraftPackage || !readiness.canGenerate}
              onClick={() => {
                void onCreateDraftPackage(selectedPackage.package.id);
              }}
            >
              <Sparkle className="mr-2 h-4 w-4" />
              {creatingDraftPackage ? 'Muodostetaan...' : 'Muodosta draft package'}
            </Button>
            {selectedDraftPackage && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={reviewingDraftPackageId === selectedDraftPackage.id || selectedDraftPackage.status === 'reviewed' || selectedDraftPackage.status === 'exported'}
                  onClick={() => {
                    void onMarkDraftPackageReviewed(selectedDraftPackage.id);
                  }}
                >
                  {reviewingDraftPackageId === selectedDraftPackage.id ? 'Tallennetaan...' : 'Merkitse tarkistetuksi'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={exportingDraftPackageId === selectedDraftPackage.id || selectedDraftPackage.status === 'exported'}
                  onClick={() => {
                    void onMarkDraftPackageExported(selectedDraftPackage.id);
                  }}
                >
                  {exportingDraftPackageId === selectedDraftPackage.id ? 'Tallennetaan...' : 'Merkitse viedyksi'}
                </Button>
                <Button
                  type="button"
                  disabled={
                    previewingEditorImportDraftPackageId === selectedDraftPackage.id
                    || importingDraftPackageId === selectedDraftPackage.id
                    || !importValidation?.can_import
                    || (
                      draftPackageImportState?.suggested_import_mode === 'update_existing_quote'
                      && !canExecuteSelectiveReimport
                    )
                  }
                  onClick={() => {
                    if (draftPackageImportState?.suggested_import_mode === 'update_existing_quote') {
                      void onReimportDraftPackageToEditor(selectedDraftPackage.id, selectiveReimportSelection);
                      return;
                    }

                    void onImportDraftPackageToEditor(selectedDraftPackage.id);
                  }}
                >
                  {previewingEditorImportDraftPackageId === selectedDraftPackage.id
                    ? 'Validoidaan...'
                    : importingDraftPackageId === selectedDraftPackage.id
                      ? 'Importoidaan...'
                      : resolvePrimaryImportActionLabel(draftPackageImportState)}
                </Button>
                {canOpenImportedQuote && selectedDraftPackage.importedQuoteId && selectedPackage.package.linkedProjectId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenImportedQuote(selectedPackage.package.linkedProjectId!, selectedDraftPackage.importedQuoteId!)}
                  >
                    <ArrowSquareOut className="mr-2 h-4 w-4" />
                    Avaa importoitu quote
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ReadinessCard
            title="Hyväksytyt vaatimukset"
            value={String(readiness.acceptedRequirementCount)}
            description="Ydinsisältö, joka voidaan viedä editoriin rakenteisena requirement-listana."
          />
          <ReadinessCard
            title="Hyväksytyt referenssit"
            value={String(readiness.acceptedReferenceCount)}
            description="Reviewssa hyväksytyt referenssiehdotukset, jotka voidaan liittää luonnospakettiin."
          />
          <ReadinessCard
            title="Unresolved itemit"
            value={String(readiness.unresolvedItemCount)}
            description="Kuinka monta workflow-riviä on vielä tarkistamatta tai vaatii yhä ratkaisun."
          />
          <ReadinessCard
            title="Voidaanko muodostaa"
            value={readiness.canGenerate ? 'Kyllä' : 'Ei vielä'}
            description={readiness.blockedReason ?? 'Reviewed dataa on riittävästi mielekkään draft package -stagingin muodostamiseen.'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{draftPackages.length} draft packagea</Badge>
          <Badge variant="outline">{readiness.includedItemCount} oletuksena mukana</Badge>
          <Badge variant="outline">{readiness.excludedItemCount} oletuksena ulkona</Badge>
        </div>

        {draftPackages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {draftPackages.map((draftPackage) => {
              const statusMeta = TENDER_DRAFT_PACKAGE_STATUS_META[draftPackage.status];
              const active = selectedDraftPackage?.id === draftPackage.id;

              return (
                <Button
                  key={draftPackage.id}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSelectDraftPackage(draftPackage.id)}
                >
                  {draftPackage.title}
                  <span className="ml-2 text-xs opacity-80">{statusMeta.label}</span>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
            Draft packageja ei ole vielä muodostettu tälle tarjouspyyntöpaketille. Muodostus aktivoituu vasta, kun reviewed löydöksissä on mukana vähintään yksi mielekäs ydinsisältö editorivientiä varten.
          </div>
        )}

        {selectedDraftPackage && payload && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={TENDER_DRAFT_PACKAGE_STATUS_META[selectedDraftPackage.status].variant}>{TENDER_DRAFT_PACKAGE_STATUS_META[selectedDraftPackage.status].label}</Badge>
                    <Badge variant={TENDER_DRAFT_PACKAGE_IMPORT_STATUS_META[selectedDraftPackage.importStatus].variant}>{TENDER_DRAFT_PACKAGE_IMPORT_STATUS_META[selectedDraftPackage.importStatus].label}</Badge>
                    {draftPackageImportState && (
                      <Badge variant={TENDER_DRAFT_PACKAGE_REIMPORT_STATUS_META[draftPackageImportState.reimport_status].variant}>{TENDER_DRAFT_PACKAGE_REIMPORT_STATUS_META[draftPackageImportState.reimport_status].label}</Badge>
                    )}
                    <Badge variant="outline">Päivitetty {formatTenderTimestamp(selectedDraftPackage.updatedAt)}</Badge>
                    <Badge variant="outline">Revision {draftPackageImportState?.import_revision ?? selectedDraftPackage.importRevision}</Badge>
                    {selectedDraftPackage.importedQuoteId && <Badge variant="outline">Quote {selectedDraftPackage.importedQuoteId}</Badge>}
                  </div>
                  <p className="text-sm font-medium text-slate-950">{selectedDraftPackage.title}</p>
                </div>
                <div className="text-xs leading-5 text-muted-foreground">
                  <p>Skeema {payload.schema_version}</p>
                  <p>Generoitu {formatTenderTimestamp(payload.generated_at)}</p>
                  {selectedDraftPackage.importedAt && <p>Importoitu {formatTenderTimestamp(selectedDraftPackage.importedAt)}</p>}
                  {draftPackageImportState?.last_import_payload_hash && <p>Viimeisin payload hash {shortenHash(draftPackageImportState.last_import_payload_hash)}</p>}
                  {latestImportRun && <p>Viimeisin ajo {formatTenderTimestamp(latestImportRun.created_at)}</p>}
                </div>
              </div>
              {selectedDraftPackage.summary && <p className="mt-3 text-sm leading-6 text-slate-700">{selectedDraftPackage.summary}</p>}
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {draftPackageImportState && <Badge variant={TENDER_EDITOR_IMPORT_MODE_META[draftPackageImportState.suggested_import_mode].variant}>{TENDER_EDITOR_IMPORT_MODE_META[draftPackageImportState.suggested_import_mode].label}</Badge>}
                    {latestImportRun && <Badge variant={TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[latestImportRun.result_status].variant}>{TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[latestImportRun.result_status].label}</Badge>}
                    {draftPackageImportState && (
                      <Badge variant={TENDER_IMPORT_OWNERSHIP_REGISTRY_STATUS_META[draftPackageImportState.ownership_registry_status].variant}>
                        {TENDER_IMPORT_OWNERSHIP_REGISTRY_STATUS_META[draftPackageImportState.ownership_registry_status].label}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>Kohdequote: {draftPackageImportState?.target_quote_title ?? editorImportPreview?.payload.metadata.target_quote_title ?? 'Luodaan importissa'}</p>
                    <p>Kohdeproject: {draftPackageImportState?.target_project_id ?? selectedPackage.package.linkedProjectId ?? 'Luodaan tai ratkaistaan importissa'}</p>
                    <p>Kohdeasiakas: {draftPackageImportState?.target_customer_id ?? selectedPackage.package.linkedCustomerId ?? 'Luodaan tai ratkaistaan importissa'}</p>
                    <p>Nykyinen payload hash: {editorImportPreview ? shortenHash(editorImportPreview.payload_hash) : 'Ladataan...'}</p>
                    <p>Hallittuja lohkoja: {managedBlocks.length}</p>
                    {draftPackageImportState && <p>Aktiivisia owned blockeja: {draftPackageImportState.owned_block_count}</p>}
                    {draftPackageImportState?.owned_block_last_synced_at && <p>Registry syncattu viimeksi: {formatTenderTimestamp(draftPackageImportState.owned_block_last_synced_at)}</p>}
                    {draftPackageImportState && <p>Selective re-import mahdollinen: {draftPackageImportState.selective_reimport_available ? 'Kyllä' : 'Ei vielä'}</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                    <ClockCounterClockwise className="h-4 w-4 text-slate-500" />
                    Viimeisin import-ajotieto
                  </div>
                  {latestImportRun ? (
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p>Aika: {formatTenderTimestamp(latestImportRun.created_at)}</p>
                      <p>Mode: {TENDER_EDITOR_IMPORT_MODE_META[latestImportRun.import_mode].label}</p>
                      <p>Status: {TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[latestImportRun.result_status].label}</p>
                      <p>Summary: {latestImportRun.summary ?? 'Ei erillistä yhteenvetoa.'}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-700">Tälle luonnospaketille ei ole vielä import-ajohistoriaa.</p>
                  )}
                </div>
              </div>
            </div>

            <Tabs defaultValue="included" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="included">Mukana ({includedItems.length})</TabsTrigger>
                <TabsTrigger value="excluded">Ulkona ({excludedItems.length})</TabsTrigger>
                <TabsTrigger value="payload">Export preview</TabsTrigger>
                <TabsTrigger value="import">Editor import</TabsTrigger>
              </TabsList>

              <TabsContent value="included" className="space-y-3" forceMount>
                {includedItems.length > 0 ? includedItems.map((item) => (
                  <DraftItemCard
                    key={item.id}
                    item={item}
                    selectedPackage={selectedPackage}
                    pending={updatingDraftPackageItemIds.includes(item.id)}
                    onToggle={(nextIncluded) => onUpdateDraftPackageItem(item.id, { isIncluded: nextIncluded })}
                  />
                )) : (
                  <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
                    Tässä luonnospaketissa ei ole tällä hetkellä mukana rivejä export payloadiin.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="excluded" className="space-y-3" forceMount>
                {excludedItems.length > 0 ? excludedItems.map((item) => (
                  <DraftItemCard
                    key={item.id}
                    item={item}
                    selectedPackage={selectedPackage}
                    pending={updatingDraftPackageItemIds.includes(item.id)}
                    onToggle={(nextIncluded) => onUpdateDraftPackageItem(item.id, { isIncluded: nextIncluded })}
                  />
                )) : (
                  <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
                    Kaikki tämän luonnospaketin rivit ovat mukana payloadissa.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payload" className="space-y-4" forceMount>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm font-medium text-slate-950">Metadata</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p>Otsikko: {payload.metadata.title}</p>
                      <p>Lähdepaketti: {payload.source_tender_package_id}</p>
                      <p>Lähdeanalyysi: {payload.source_analysis_job_id ?? 'Ei sidottu jobiin'}</p>
                      <p>Status: {payload.metadata.draft_package_status}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm font-medium text-slate-950">Payload-sektiot</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <p className="font-medium">accepted_requirements</p>
                        <p className="mt-1">{payload.accepted_requirements.length}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <p className="font-medium">selected_references</p>
                        <p className="mt-1">{payload.selected_references.length}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <p className="font-medium">resolved_missing_items</p>
                        <p className="mt-1">{payload.resolved_missing_items.length}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <p className="font-medium">notes_for_editor</p>
                        <p className="mt-1">{payload.notes_for_editor.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-950">
                      <ListChecks className="h-4 w-4 text-slate-500" />
                      accepted_requirements
                    </p>
                    <div className="mt-3 space-y-2">
                      {payload.accepted_requirements.length > 0 ? payload.accepted_requirements.map((item) => (
                        <div key={item.source_requirement_id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-950">{item.title}</p>
                          {item.content_md && <p className="mt-2 whitespace-pre-line">{getTenderTextPreview(item.content_md, 240)}</p>}
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Ei mukana olevia vaatimuksia.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-950">
                      <FileText className="h-4 w-4 text-slate-500" />
                      selected_references
                    </p>
                    <div className="mt-3 space-y-2">
                      {payload.selected_references.length > 0 ? payload.selected_references.map((item) => (
                        <div key={item.source_reference_suggestion_id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-950">{item.title}</p>
                          {item.content_md && <p className="mt-2 whitespace-pre-line">{getTenderTextPreview(item.content_md, 240)}</p>}
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Ei mukana olevia referenssejä.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-950">
                      <WarningCircle className="h-4 w-4 text-slate-500" />
                      resolved_missing_items
                    </p>
                    <div className="mt-3 space-y-2">
                      {payload.resolved_missing_items.length > 0 ? payload.resolved_missing_items.map((item) => (
                        <div key={item.source_missing_item_id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-950">{item.title}</p>
                          {item.content_md && <p className="mt-2 whitespace-pre-line">{getTenderTextPreview(item.content_md, 240)}</p>}
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Ei mukaan otettuja ratkaistuja puutteita.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-950">
                      <Note className="h-4 w-4 text-slate-500" />
                      notes_for_editor
                    </p>
                    <div className="mt-3 space-y-2">
                      {payload.notes_for_editor.length > 0 ? payload.notes_for_editor.map((item) => (
                        <div key={`${item.source_entity_type}:${item.source_entity_id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-950">{item.title}</p>
                          {item.content_md && <p className="mt-2 whitespace-pre-line">{getTenderTextPreview(item.content_md, 240)}</p>}
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Ei editor-noteseja.</p>}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="import" className="space-y-4" forceMount>
                {editorImportPreview ? (
                  <>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                          <ListChecks className="h-4 w-4 text-slate-500" />
                          Import handoff
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <p>Draft package rivejä: {editorImportPreview.draft_item_count}</p>
                          <p>Importoitavia rivejä: {editorImportPreview.importable_item_count}</p>
                          <p>Kohdetarjous: {editorImportPreview.payload.metadata.target_quote_title}</p>
                          <p>Kohdequote ID: {draftPackageImportState?.target_quote_id ?? editorImportPreview.payload.metadata.target_quote_id ?? 'Luodaan importissa'}</p>
                          <p>Kohdeprojekti: {editorImportPreview.payload.metadata.target_project_id ?? 'Luodaan importin yhteydessä'}</p>
                          <p>Kohdeasiakas: {editorImportPreview.payload.metadata.target_customer_id ?? 'Luodaan importin yhteydessä'}</p>
                          {draftPackageImportState && <p>Mode: {TENDER_EDITOR_IMPORT_MODE_META[draftPackageImportState.suggested_import_mode].label}</p>}
                          <p>Placeholder-kohde: {editorImportPreview.payload.metadata.will_create_placeholder_target ? 'Kyllä' : 'Ei'}</p>
                          <p>Payload hash: {shortenHash(editorImportPreview.payload_hash)}</p>
                          {managedSurface && <p>Managed contract: {managedSurface.contract_version}</p>}
                          {managedSurface && <p>{managedSurface.ownership_notice}</p>}
                          {draftPackageImportState && <p>Owned blockeja registryssä: {draftPackageImportState.owned_block_count}</p>}
                          {draftPackageImportState && <p>Registry-status: {TENDER_IMPORT_OWNERSHIP_REGISTRY_STATUS_META[draftPackageImportState.ownership_registry_status].label}</p>}
                          {draftPackageImportState?.owned_block_last_synced_at && <p>Viimeisin registry-sync: {formatTenderTimestamp(draftPackageImportState.owned_block_last_synced_at)}</p>}
                          {draftPackageImportState && <p>Selective re-import: {draftPackageImportState.selective_reimport_available ? 'Mahdollinen' : 'Ei käytettävissä'}</p>}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                          <WarningCircle className="h-4 w-4 text-slate-500" />
                          Validointihuomiot
                        </div>
                        {importValidation && importValidation.issues.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {importValidation.issues.map((issue, index) => (
                              <div key={`${issue.code}-${issue.draft_package_item_id ?? 'package'}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant={resolveIssueVariant(issue.severity)}>{issue.severity}</Badge>
                                  <p className="text-sm font-medium text-slate-950">{issue.code}</p>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{issue.message}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-slate-700">Ei blokkaavia validointihuomioita. Import voidaan käynnistää eksplisiittisesti tästä näkymästä.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                        <FileText className="h-4 w-4 text-slate-500" />
                        Adapterin hallitsema pinta
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        Tarjousäly hallitsee vain alla näkyviä lohkoja. Kaikki muu quoten sisältö jää re-importissa rauhaan.
                      </p>
                      <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        {managedBlocks.length > 0 ? managedBlocks.map((block) => (
                          <div key={block.marker_key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{block.title}</Badge>
                              <Badge variant="outline">{block.target_label}</Badge>
                              <Badge variant="outline">{block.item_count} riviä</Badge>
                            </div>
                            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">Marker</p>
                            <p className="mt-1 text-sm text-slate-700">{block.marker_key}</p>
                            <p className="mt-3 text-sm leading-6 text-slate-700 whitespace-pre-line">
                              {getTenderTextPreview(block.content_md, 320)}
                            </p>
                          </div>
                        )) : (
                          <p className="text-sm leading-6 text-slate-700">Tassa import-previewssa ei ole hallittuja lohkoja.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                          <ArrowsClockwise className="h-4 w-4 text-slate-500" />
                          Re-import reconciliation
                        </div>
                        {draftPackageReimportPreview ? (
                          <div className="mt-3 space-y-4 text-sm text-slate-700">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={TENDER_DRAFT_PACKAGE_REIMPORT_STATUS_META[draftPackageReimportPreview.reimport_status].variant}>{TENDER_DRAFT_PACKAGE_REIMPORT_STATUS_META[draftPackageReimportPreview.reimport_status].label}</Badge>
                              <Badge variant={TENDER_EDITOR_IMPORT_MODE_META[draftPackageReimportPreview.import_mode].variant}>{TENDER_EDITOR_IMPORT_MODE_META[draftPackageReimportPreview.import_mode].label}</Badge>
                              <Badge variant={TENDER_IMPORT_OWNERSHIP_REGISTRY_STATUS_META[draftPackageReimportPreview.registry_status].variant}>{TENDER_IMPORT_OWNERSHIP_REGISTRY_STATUS_META[draftPackageReimportPreview.registry_status].label}</Badge>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Lisätyt lohkot</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.added_blocks}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Muuttuvat lohkot</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.changed_blocks}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Poistuvat lohkot</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.removed_blocks}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ennallaan</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.unchanged_blocks}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Aktiivinen registry</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.registry_active_block_count}</p>
                              </div>
                            </div>

                            {draftPackageReimportPreview.warnings.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-950">Warnings</p>
                                {draftPackageReimportPreview.warnings.map((warning, index) => (
                                  <div key={`${warning}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700">
                                    {warning}
                                  </div>
                                ))}
                              </div>
                            )}

                            {draftPackageReimportPreview.selective_reimport_available && (
                              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-slate-950">Selective block re-import</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-700">
                                      Valitse vain ne Tarjousälyn omistamat lohkot, jotka päivitetään tai poistetaan. Valitsemattomat lohkot jätetään nykyiseen tilaansa.
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedUpdateBlockIds(draftPackageReimportPreview.default_update_block_ids);
                                        setSelectedRemoveBlockIds(draftPackageReimportPreview.default_remove_block_ids);
                                        setConfirmSelectiveReimport(false);
                                      }}
                                    >
                                      Valitse oletusmuutokset
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedUpdateBlockIds([]);
                                        setSelectedRemoveBlockIds([]);
                                        setConfirmSelectiveReimport(false);
                                      }}
                                    >
                                      Tyhjennä valinnat
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Valitut päivitykset</p>
                                    <p className="mt-1 text-xl font-semibold text-slate-950">{selectedUpdateBlockIds.length}</p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Valitut poistot</p>
                                    <p className="mt-1 text-xl font-semibold text-slate-950">{selectedRemoveBlockIds.length}</p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Registry warnings</p>
                                    <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageImportState?.registry_warning_count ?? draftPackageReimportPreview.warnings.length}</p>
                                  </div>
                                </div>

                                <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                  <Checkbox
                                    checked={confirmSelectiveReimport}
                                    onCheckedChange={(checked) => setConfirmSelectiveReimport(checked === true)}
                                  />
                                  <span className="text-sm leading-6 text-slate-700">
                                    Hyväksyn, että selective re-import päivittää tai poistaa vain valitsemani Tarjousälyn omistamat blockit ja jättää muun editorisisällön rauhaan.
                                  </span>
                                </label>

                                {draftPackageReimportPreview.registry_last_synced_at && (
                                  <p className="mt-3 text-sm leading-6 text-slate-700">
                                    Registryssä viimeisin tunnettu block-sync: {formatTenderTimestamp(draftPackageReimportPreview.registry_last_synced_at)}
                                  </p>
                                )}

                                <Button
                                  type="button"
                                  className="mt-4"
                                  disabled={!canExecuteSelectiveReimport || importingDraftPackageId === selectedDraftPackage?.id}
                                  onClick={() => {
                                    if (!selectedDraftPackage) {
                                      return;
                                    }

                                    void onReimportDraftPackageToEditor(selectedDraftPackage.id, selectiveReimportSelection);
                                  }}
                                >
                                  {importingDraftPackageId === selectedDraftPackage?.id ? 'Synkronoidaan...' : 'Suorita selective re-import'}
                                </Button>
                              </div>
                            )}

                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-950">Lohkokohtaiset muutokset</p>
                              {draftPackageReimportPreview.blocks.map((block) => (
                                <div key={block.marker_key} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={resolveReconciliationChangeVariant(block.change_type)}>{resolveReconciliationChangeLabel(block.change_type)}</Badge>
                                        <Badge variant="outline">{block.target_label}</Badge>
                                        <Badge variant="outline">{resolveOwnershipSourceLabel(block.ownership_source)}</Badge>
                                        {block.registry_revision != null && <Badge variant="outline">Rev {block.registry_revision}</Badge>}
                                      </div>
                                      <p className="mt-2 text-sm font-medium text-slate-950">{block.title}</p>
                                      <p className="mt-2 text-sm leading-6 text-slate-700">Marker {block.marker_key}</p>
                                      {block.registry_last_synced_at && <p className="mt-1 text-xs leading-5 text-slate-500">Viimeksi synkattu {formatTenderTimestamp(block.registry_last_synced_at)}</p>}
                                    </div>

                                    {(block.can_select_for_update || block.can_select_for_removal) ? (
                                      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                        <Checkbox
                                          checked={block.can_select_for_removal ? selectedRemoveBlockIdSet.has(block.block_id) : selectedUpdateBlockIdSet.has(block.block_id)}
                                          onCheckedChange={(checked) => {
                                            updateSelectedBlockIds(
                                              block.can_select_for_removal ? setSelectedRemoveBlockIds : setSelectedUpdateBlockIds,
                                              block.block_id,
                                              checked === true,
                                            );
                                            setConfirmSelectiveReimport(false);
                                          }}
                                        />
                                        <span className="text-sm leading-6 text-slate-700">
                                          {block.can_select_for_removal ? 'Valitse poistettavaksi' : 'Valitse päivitettäväksi'}
                                        </span>
                                      </label>
                                    ) : (
                                      <Badge variant="secondary">Ei valittavaa muutosta</Badge>
                                    )}
                                  </div>

                                  <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
                                    <p className="text-sm leading-6 text-slate-700 whitespace-pre-line">
                                      {getTenderTextPreview(block.current_content_md ?? block.previous_content_md ?? '', 240)}
                                    </p>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                                      <p>Text marker: {block.text_marker_present ? 'Löytyy' : 'Puuttuu'}</p>
                                      <p className="mt-1">Section row: {block.section_row_present ? 'Löytyy' : 'Puuttuu'}</p>
                                    </div>
                                  </div>

                                  {block.warnings.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {block.warnings.map((warning, index) => (
                                        <div key={`${block.block_id}-warning-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
                                          {warning}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {draftPackageReimportPreview.blocks.length === 0 && (
                                <p className="text-sm leading-6 text-slate-700">Reconciliation ei löytänyt block-tason eroja. Tila voi silti olla ajan tasalla tai muuttunut vain payloadin koostetasolla.</p>
                              )}
                            </div>

                            {draftPackageReimportPreview.entries.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-950">Item-tason detaljit</p>
                                {draftPackageReimportPreview.entries.slice(0, 4).map((entry) => (
                                  <div key={entry.key} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">{entry.import_group}</Badge>
                                      <Badge variant="outline">{entry.change_type}</Badge>
                                    </div>
                                    <p className="mt-2 font-medium text-slate-950">{entry.title}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-slate-700">Re-import previewta ei ole saatavilla tälle luonnospaketille.</p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                          <ClockCounterClockwise className="h-4 w-4 text-slate-500" />
                          Import-ajohistoria
                        </div>
                        {draftPackageImportRuns.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {draftPackageImportRuns.slice(0, 4).map((run) => (
                              <div key={run.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant={TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[run.result_status].variant}>{TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[run.result_status].label}</Badge>
                                  <Badge variant={TENDER_EDITOR_IMPORT_MODE_META[run.import_mode].variant}>{TENDER_EDITOR_IMPORT_MODE_META[run.import_mode].label}</Badge>
                                </div>
                                <p className="mt-2 text-sm font-medium text-slate-950">{formatTenderTimestamp(run.created_at)}</p>
                                <p className="mt-1 text-sm leading-6 text-slate-700">{run.summary ?? 'Ei erillistä yhteenvetoa.'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-slate-700">Tälle draft packagelle ei ole vielä import-run-historiaa.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      {editorImportPreview.sections.map((section) => (
                        <div key={section.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{section.target_label}</Badge>
                            <Badge variant="outline">{section.item_count} riviä</Badge>
                          </div>
                          <p className="mt-3 text-sm font-medium text-slate-950">{section.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-line">
                            {section.preview_md ? getTenderTextPreview(section.preview_md, 480) : 'Tähän osioon ei tuoda tässä importissa rivejä.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">
                    Editori-importin previewta ei ole vielä saatavilla tälle luonnospaketille.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}