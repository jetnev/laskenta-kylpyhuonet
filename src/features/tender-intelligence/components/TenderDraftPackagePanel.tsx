import { FileText, ListChecks, Note, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { buildTenderDraftPackageReadiness } from '../lib/tender-draft-package';
import {
  formatTenderTimestamp,
  getTenderTextPreview,
  TENDER_DRAFT_PACKAGE_IMPORT_STATUS_META,
  TENDER_DRAFT_PACKAGE_ITEM_TYPE_META,
  TENDER_DRAFT_PACKAGE_STATUS_META,
  TENDER_RESOLUTION_STATUS_META,
  TENDER_REVIEW_STATUS_META,
} from '../lib/tender-intelligence-ui';
import type {
  TenderEditorImportPreview,
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
  previewingEditorImportDraftPackageId?: string | null;
  importingDraftPackageId?: string | null;
  reviewingDraftPackageId?: string | null;
  exportingDraftPackageId?: string | null;
  updatingDraftPackageItemIds?: string[];
  onSelectDraftPackage: (draftPackageId: string) => void;
  onCreateDraftPackage: (packageId: string) => Promise<unknown>;
  onImportDraftPackageToEditor: (draftPackageId: string) => Promise<unknown>;
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
  previewingEditorImportDraftPackageId = null,
  importingDraftPackageId = null,
  reviewingDraftPackageId = null,
  exportingDraftPackageId = null,
  updatingDraftPackageItemIds = [],
  onSelectDraftPackage,
  onCreateDraftPackage,
  onImportDraftPackageToEditor,
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

  useEffect(() => {
    if (!selectedDraftPackageId && draftPackages[0]) {
      onSelectDraftPackage(draftPackages[0].id);
    }
  }, [draftPackages, onSelectDraftPackage, selectedDraftPackageId]);

  return (
    <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4.5 w-4.5 text-slate-500" />
              Editor import boundary
            </CardTitle>
            <CardDescription>
              Tämä vaihe validoi Tarjousälyn draft packagen, näyttää editori-importin previewn ja tuo sisällön turvalliseen tarjousluonnokseen vain käyttäjän eksplisiittisestä toiminnosta. Import kirjoittaa tässä vaiheessa hallittuihin notes- ja section-rakenteisiin.
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
                  }
                  onClick={() => {
                    void onImportDraftPackageToEditor(selectedDraftPackage.id);
                  }}
                >
                  {previewingEditorImportDraftPackageId === selectedDraftPackage.id
                    ? 'Validoidaan...'
                    : importingDraftPackageId === selectedDraftPackage.id
                      ? 'Importoidaan...'
                      : 'Tuo editoriin'}
                </Button>
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
                    <Badge variant="outline">Päivitetty {formatTenderTimestamp(selectedDraftPackage.updatedAt)}</Badge>
                    {selectedDraftPackage.importedQuoteId && <Badge variant="outline">Quote {selectedDraftPackage.importedQuoteId}</Badge>}
                  </div>
                  <p className="text-sm font-medium text-slate-950">{selectedDraftPackage.title}</p>
                </div>
                <div className="text-xs leading-5 text-muted-foreground">
                  <p>Skeema {payload.schema_version}</p>
                  <p>Generoitu {formatTenderTimestamp(payload.generated_at)}</p>
                  {selectedDraftPackage.importedAt && <p>Importoitu {formatTenderTimestamp(selectedDraftPackage.importedAt)}</p>}
                </div>
              </div>
              {selectedDraftPackage.summary && <p className="mt-3 text-sm leading-6 text-slate-700">{selectedDraftPackage.summary}</p>}
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
                          Import preview
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <p>Draft package rivejä: {editorImportPreview.draft_item_count}</p>
                          <p>Importoitavia rivejä: {editorImportPreview.importable_item_count}</p>
                          <p>Kohdetarjous: {editorImportPreview.payload.metadata.target_quote_title}</p>
                          <p>Kohdeprojekti: {editorImportPreview.payload.metadata.target_project_id ?? 'Luodaan importin yhteydessä'}</p>
                          <p>Kohdeasiakas: {editorImportPreview.payload.metadata.target_customer_id ?? 'Luodaan importin yhteydessä'}</p>
                          <p>Placeholder-kohde: {editorImportPreview.payload.metadata.will_create_placeholder_target ? 'Kyllä' : 'Ei'}</p>
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