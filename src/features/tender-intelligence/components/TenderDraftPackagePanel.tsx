import { ArrowSquareOut, ArrowsClockwise, ClockCounterClockwise, FileText, ListChecks, Note, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { buildTenderDraftPackageReadiness } from '../lib/tender-draft-package';
import { buildTenderDraftQualityGate } from '../lib/tender-draft-quality-gate';
import { buildTenderEditorManagedSurfaceFromPayload } from '../lib/tender-editor-managed-surface';
import {
  buildTenderImportResumeSupport,
  type TenderImportResumeActionKind,
  type TenderImportResumeSupportStatus,
} from '../lib/tender-import-resume';
import { listTenderProviderContextLabels } from '../lib/tender-provider-context';
import {
  formatTenderTimestamp,
  getTenderTextPreview,
  TENDER_DRAFT_PACKAGE_IMPORT_STATUS_META,
  TENDER_IMPORT_REGISTRY_DIAGNOSTIC_STATUS_META,
  TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META,
  TENDER_IMPORT_RUN_TYPE_META,
  TENDER_DRAFT_PACKAGE_REIMPORT_STATUS_META,
  TENDER_EDITOR_MANAGED_BLOCK_DRIFT_STATUS_META,
  TENDER_EDITOR_IMPORT_MODE_META,
  TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META,
  TENDER_IMPORT_OWNERSHIP_REGISTRY_STATUS_META,
  TENDER_DRAFT_PACKAGE_ITEM_TYPE_META,
  TENDER_DRAFT_PACKAGE_STATUS_META,
  TENDER_RESOLUTION_STATUS_META,
  TENDER_REVIEW_STATUS_META,
} from '../lib/tender-intelligence-ui';
import type {
  TenderDraftPackageImportDiagnostics,
  TenderDraftPackageImportRun,
  TenderDraftPackageImportState,
  TenderEditorImportPreview,
  TenderEditorImportRunMode,
  TenderEditorManagedBlockId,
  TenderImportRegistryRepairAction,
  TenderImportRegistryRepairPreview,
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
import type { TenderIntelligenceResolvedHandoff } from '../lib/tender-intelligence-handoff';

interface TenderDraftPackagePanelProps {
  selectedPackage: TenderPackageDetails;
  draftPackages: TenderDraftPackage[];
  selectedDraftPackageId?: string | null;
  creatingDraftPackage?: boolean;
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
  reviewingDraftPackageId?: string | null;
  exportingDraftPackageId?: string | null;
  updatingDraftPackageItemIds?: string[];
  editorHandoff?: TenderIntelligenceResolvedHandoff | null;
  actorNameById?: Record<string, string>;
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

const TENDER_EDITOR_MANAGED_BLOCK_META: Record<TenderEditorManagedBlockId, { title: string; targetLabel: string }> = {
  requirements_and_quote_notes: {
    title: 'Tarjoushuomiot',
    targetLabel: 'Tarjouksen notes-kenttä',
  },
  selected_references: {
    title: 'Referenssiyhteenveto',
    targetLabel: 'Tarjouksen notes-kenttä',
  },
  resolved_missing_items_and_attachment_notes: {
    title: 'Liitehuomiot ja ratkaistut puutteet',
    targetLabel: 'Tarjouksen internalNotes-kenttä',
  },
  provider_profile_context: {
    title: 'Tarjoajaprofiilin konteksti',
    targetLabel: 'Tarjouksen internalNotes-kenttä',
  },
  notes_for_editor: {
    title: 'Sisäiset editorihuomiot',
    targetLabel: 'Tarjouksen internalNotes-kenttä',
  },
};

function resolveImportRunExecutionModeLabel(runMode?: TenderEditorImportRunMode | null) {
  switch (runMode) {
    case 'create_new_quote':
      return 'Uuden quoten luonti';
    case 'protected_reimport':
      return 'Suojattu re-import';
    case 'protected_reimport_with_override':
      return 'Suojattu re-import overrideilla';
    default:
      return 'Tavanomainen import';
  }
}

function resolveImportRunConflictPolicyLabel(policy?: TenderEditorSelectiveReimportSelection['conflict_policy'] | null) {
  switch (policy) {
    case 'override_selected_conflicts':
      return 'Override vain valituille konflikteille';
    case 'protect_conflicts':
      return 'Suojaa konfliktiblokit';
    default:
      return 'Ei konfliktipolitiikkaa';
  }
}

function resolveImportRunActorLabel(run: TenderDraftPackageImportRun, actorNameById: Record<string, string>) {
  if (!run.created_by_user_id) {
    return 'Järjestelmä';
  }

  return actorNameById[run.created_by_user_id] ?? `Käyttäjä ${shortenHash(run.created_by_user_id)}`;
}

function resolveImportRunBlockMeta(run: TenderDraftPackageImportRun, blockId: TenderEditorManagedBlockId) {
  const managedBlock = run.payload_snapshot.managed_surface?.blocks.find((candidate) => candidate.block_id === blockId);

  if (managedBlock) {
    return {
      title: managedBlock.title,
      targetLabel: managedBlock.target_label,
    };
  }

  return TENDER_EDITOR_MANAGED_BLOCK_META[blockId] ?? { title: blockId, targetLabel: blockId };
}

function buildImportRunMetricItems(run: TenderDraftPackageImportRun) {
  const summaryCounts = run.execution_metadata?.summary_counts;

  if (!summaryCounts) {
    return [];
  }

  if (run.run_type === 'diagnostics_refresh') {
    return [
      { label: 'Healthy', value: summaryCounts.healthy_blocks },
      { label: 'Stale', value: summaryCounts.stale_blocks },
      { label: 'Conflicts', value: summaryCounts.conflict_blocks },
      { label: 'Total registry', value: summaryCounts.total_registry_blocks },
    ];
  }

  if (run.run_type === 'registry_repair') {
    return [
      { label: 'Hashit resynkattu', value: summaryCounts.refreshed_hash_blocks },
      { label: 'Orphaned', value: summaryCounts.orphaned_blocks },
      { label: 'Siivotut', value: summaryCounts.pruned_registry_blocks },
      { label: 'Skipatut', value: summaryCounts.skipped_blocks },
    ];
  }

  return [
    { label: run.import_mode === 'create_new_quote' ? 'Luodut' : 'Päivitetyt', value: summaryCounts.updated_blocks },
    { label: 'Poistetut', value: summaryCounts.removed_blocks },
    { label: 'Skipatut konfliktit', value: summaryCounts.skipped_conflicts },
    { label: 'Vaikutetut', value: summaryCounts.affected_blocks },
  ];
}

function buildImportRunReasonLines(run: TenderDraftPackageImportRun) {
  const executionMetadata = run.execution_metadata;
  const summaryCounts = executionMetadata?.summary_counts;
  const reasonLines: string[] = [];

  if (run.run_type === 'diagnostics_refresh') {
    reasonLines.push('Ajo päivitti live quote- ja registry-diagnostiikan kirjoittamatta quote-sisältöä.');
  }

  if (run.run_type === 'registry_repair') {
    if (executionMetadata?.repair_action) {
      reasonLines.push(`Ajo korjasi import-registryn toiminnolla "${TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META[executionMetadata.repair_action].label}" ilman quote-kirjoitusta.`);
    } else {
      reasonLines.push('Ajo korjasi import-registryä ilman quote-kirjoitusta.');
    }
  }

  if ((executionMetadata?.skipped_conflict_block_ids.length ?? 0) > 0) {
    reasonLines.push(
      executionMetadata?.conflict_policy === 'override_selected_conflicts'
        ? `${executionMetadata.skipped_conflict_block_ids.length} konfliktiblokkia skipattiin, koska niitä ei valittu override-ajoon.`
        : `${executionMetadata!.skipped_conflict_block_ids.length} konfliktiblokkia jätettiin suojaan konfliktipolitiikan vuoksi.`,
    );
  }

  if ((executionMetadata?.override_conflict_block_ids.length ?? 0) > 0) {
    reasonLines.push(`${executionMetadata!.override_conflict_block_ids.length} konfliktiblokkia yliajettiin eksplisiittisellä override-valinnalla.`);
  }

  if ((executionMetadata?.missing_in_quote_block_ids.length ?? 0) > 0) {
    reasonLines.push(`${executionMetadata!.missing_in_quote_block_ids.length} valittua blokkia puuttui quote-puolelta, joten ajo ei voinut kohdistaa niitä.`);
  }

  if ((executionMetadata?.untouched_block_ids.length ?? 0) > 0 && (summaryCounts?.affected_blocks ?? 0) === 0) {
    reasonLines.push(`${executionMetadata!.untouched_block_ids.length} valittua blokkia jäi ennalleen, koska sisältö oli jo synkassa.`);
  }

  if (run.result_status === 'failed') {
    reasonLines.push('Ajo epäonnistui. Tarkista runin yhteenveto ja diagnostiikka ennen uutta yritystä.');
  }

  if (reasonLines.length === 0 && run.import_mode === 'create_new_quote') {
    reasonLines.push('Ajo loi uuden tarjouksen ja kirjoitti valitut hallitut lohkot siihen.');
  }

  return reasonLines;
}

function ImportRunBlockList({
  title,
  blockIds,
  run,
}: {
  title: string;
  blockIds: TenderEditorManagedBlockId[];
  run: TenderDraftPackageImportRun;
}) {
  const uniqueBlockIds = [...new Set(blockIds)];

  if (uniqueBlockIds.length < 1) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {uniqueBlockIds.map((blockId) => {
          const blockMeta = resolveImportRunBlockMeta(run, blockId);

          return (
            <Badge key={`${run.id}-${title}-${blockId}`} variant="outline">
              {blockMeta.title}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function ImportRunAuditCard({
  run,
  actorNameById,
}: {
  run: TenderDraftPackageImportRun;
  actorNameById: Record<string, string>;
}) {
  const metricItems = buildImportRunMetricItems(run);
  const reasonLines = buildImportRunReasonLines(run);
  const executionMetadata = run.execution_metadata;
  const blockListItems = [
    {
      title: run.import_mode === 'create_new_quote' ? 'Luodut lohkot' : 'Päivitetyt lohkot',
      blockIds: executionMetadata?.updated_block_ids ?? [],
    },
    {
      title: 'Poistetut lohkot',
      blockIds: executionMetadata?.removed_block_ids ?? [],
    },
    {
      title: 'Skipatut konfliktit',
      blockIds: executionMetadata?.skipped_conflict_block_ids ?? [],
    },
    {
      title: 'Override-konfliktit',
      blockIds: executionMetadata?.override_conflict_block_ids ?? [],
    },
    {
      title: 'Puuttuvat quote-puolelta',
      blockIds: executionMetadata?.missing_in_quote_block_ids ?? [],
    },
    {
      title: 'Ennallaan jätetyt',
      blockIds: executionMetadata?.untouched_block_ids ?? [],
    },
    {
      title: 'Hashit resynkattu',
      blockIds: executionMetadata?.refreshed_hash_block_ids ?? [],
    },
    {
      title: 'Merkitty orphanediksi',
      blockIds: executionMetadata?.orphaned_block_ids ?? [],
    },
    {
      title: 'Registrystä siivotut',
      blockIds: executionMetadata?.pruned_registry_block_ids ?? [],
    },
  ].filter((item) => item.blockIds.length > 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[run.result_status].variant}>{TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[run.result_status].label}</Badge>
            <Badge variant={TENDER_IMPORT_RUN_TYPE_META[run.run_type].variant}>{TENDER_IMPORT_RUN_TYPE_META[run.run_type].label}</Badge>
            <Badge variant={TENDER_EDITOR_IMPORT_MODE_META[run.import_mode].variant}>{TENDER_EDITOR_IMPORT_MODE_META[run.import_mode].label}</Badge>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-950">{formatTenderTimestamp(run.created_at)}</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{run.summary ?? 'Ei erillistä yhteenvetoa.'}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
          <p>Toimija: {resolveImportRunActorLabel(run, actorNameById)}</p>
          <p className="mt-1">Ajotapa: {resolveImportRunExecutionModeLabel(executionMetadata?.run_mode)}</p>
          {executionMetadata?.conflict_policy && <p className="mt-1">Konfliktipolitiikka: {resolveImportRunConflictPolicyLabel(executionMetadata.conflict_policy)}</p>}
          <p className="mt-1">Payload hash: {shortenHash(run.payload_hash)}</p>
          {executionMetadata?.repair_action && <p className="mt-1">Repair: {TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META[executionMetadata.repair_action].label}</p>}
          {run.target_quote_id && <p className="mt-1">Kohdequote: {run.target_quote_id}</p>}
        </div>
      </div>

      {metricItems.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {metricItems.map((item) => (
            <div key={`${run.id}-${item.label}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {reasonLines.length > 0 && (
        <div className="mt-3 space-y-2">
          {reasonLines.map((reason, index) => (
            <div key={`${run.id}-reason-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
              {reason}
            </div>
          ))}
        </div>
      )}

      {blockListItems.length > 0 && (
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {blockListItems.map((item) => (
            <ImportRunBlockList key={`${run.id}-${item.title}`} title={item.title} blockIds={item.blockIds} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}

function formatOptionalTimestamp(value?: string | null) {
  return value ? formatTenderTimestamp(value) : 'Ei vielä';
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

function resolveGateVariant(state: 'ready' | 'warning' | 'blocked') {
  if (state === 'blocked') {
    return 'destructive' as const;
  }

  if (state === 'warning') {
    return 'outline' as const;
  }

  return 'default' as const;
}

function resolveGateLabel(state: 'ready' | 'warning' | 'blocked') {
  if (state === 'blocked') {
    return 'Estää viennin';
  }

  if (state === 'warning') {
    return 'Tarkista ennen vientiä';
  }

  return 'Valmis editorivientiin';
}

function resolveResumeSupportVariant(status: TenderImportResumeSupportStatus) {
  switch (status) {
    case 'resume_available':
      return 'default' as const;
    case 'already_applied':
      return 'secondary' as const;
    case 'blocked':
      return 'destructive' as const;
    case 'stale_context':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
}

function resolveResumeSupportLabel(status: TenderImportResumeSupportStatus) {
  switch (status) {
    case 'resume_available':
      return 'Jatko valmis';
    case 'already_applied':
      return 'Jo synkassa';
    case 'blocked':
      return 'Vaatii uutta arviointia';
    case 'stale_context':
      return 'Vanha konteksti';
    default:
      return 'Ei jatkoa';
  }
}

function resolveResumePendingLabel(actionKind: TenderImportResumeActionKind) {
  switch (actionKind) {
    case 'reimport':
      return 'Jatketaan re-importia...';
    case 'registry_repair':
      return 'Jatketaan repairia...';
    case 'diagnostics_refresh':
      return 'Paivitetaan live-tilaa...';
    default:
      return 'Suoritetaan...';
  }
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
function resolveProviderContextLabels(contentMd?: string | null) {
  return listTenderProviderContextLabels(contentMd);
}

function ProviderContextBadges({
  contentMd,
  className = 'mt-3',
}: {
  contentMd?: string | null;
  className?: string;
}) {
  const labels = resolveProviderContextLabels(contentMd);

  if (labels.length < 1) {
    return null;
  }

  return (
    <div className={`${className} flex flex-wrap items-center gap-2`}>
      <Badge variant="secondary">Provider-konteksti mukana</Badge>
      {labels.map((label) => (
        <Badge key={label} variant="outline">{label}</Badge>
      ))}
    </div>
  );
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
      <ProviderContextBadges contentMd={item.contentMd} />
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
  draftPackageImportDiagnostics = null,
  draftPackageImportRepairPreview = null,
  draftPackageImportRuns = [],
  previewingEditorImportDraftPackageId = null,
  importingDraftPackageId = null,
  refreshingDraftPackageImportDiagnosticsId = null,
  repairingDraftPackageId = null,
  repairingDraftPackageRegistryAction = null,
  reviewingDraftPackageId = null,
  exportingDraftPackageId = null,
  updatingDraftPackageItemIds = [],
  editorHandoff = null,
  actorNameById = {},
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
  const qualityGate = useMemo(
    () => buildTenderDraftQualityGate({
      packageDetails: selectedPackage,
      selectedDraftPackage,
      importValidation,
      draftPackageImportState,
    }),
    [draftPackageImportState, importValidation, selectedDraftPackage, selectedPackage],
  );
  const managedSurface = useMemo(
    () => (editorImportPreview ? buildTenderEditorManagedSurfaceFromPayload(editorImportPreview.payload) : null),
    [editorImportPreview],
  );
  const managedBlocks = managedSurface?.blocks ?? [];
  const sortedImportRuns = useMemo(
    () => [...draftPackageImportRuns].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at)),
    [draftPackageImportRuns],
  );
  const latestImportRun = draftPackageImportDiagnostics?.latest_import_run
    ?? sortedImportRuns.find((run) => run.run_type === 'import' || run.run_type === 'reimport')
    ?? draftPackageImportState?.latest_run
    ?? null;
  const latestDiagnosticsRefreshRun = draftPackageImportDiagnostics?.latest_diagnostics_refresh_run
    ?? sortedImportRuns.find((run) => run.run_type === 'diagnostics_refresh')
    ?? null;
  const latestRegistryRepairRun = draftPackageImportDiagnostics?.latest_registry_repair_run
    ?? sortedImportRuns.find((run) => run.run_type === 'registry_repair')
    ?? null;
  const canOpenImportedQuote = Boolean(selectedDraftPackage?.importedQuoteId && selectedPackage.package.linkedProjectId);
  const repairPreviewActions = draftPackageImportRepairPreview?.actions ?? [];
  const repairPreviewBlocks = draftPackageImportRepairPreview?.blocks ?? [];
  const repairActionKeys: TenderImportRegistryRepairAction[] = [
    'refresh_registry_metadata',
    'mark_orphaned_registry_entries',
    'prune_inactive_registry_entries',
    'resync_registry_hashes_from_live_quote_markers',
  ];
  const isRefreshingDiagnostics = Boolean(selectedDraftPackage && refreshingDraftPackageImportDiagnosticsId === selectedDraftPackage.id);
  const isRefreshingRepairPreview = Boolean(selectedDraftPackage && previewingEditorImportDraftPackageId === selectedDraftPackage.id);
  const isRepairRunning = Boolean(selectedDraftPackage && repairingDraftPackageId === selectedDraftPackage.id);
  const [selectedUpdateBlockIds, setSelectedUpdateBlockIds] = useState<TenderEditorManagedBlockId[]>([]);
  const [selectedRemoveBlockIds, setSelectedRemoveBlockIds] = useState<TenderEditorManagedBlockId[]>([]);
  const [selectedOverrideConflictBlockIds, setSelectedOverrideConflictBlockIds] = useState<TenderEditorManagedBlockId[]>([]);
  const [confirmSelectiveReimport, setConfirmSelectiveReimport] = useState(false);
  const [activeTab, setActiveTab] = useState<'included' | 'excluded' | 'payload' | 'import'>(editorHandoff?.isActive ? 'import' : 'included');
  const [showAllImportRuns, setShowAllImportRuns] = useState(false);
  const selectedUpdateBlockIdSet = useMemo(() => new Set(selectedUpdateBlockIds), [selectedUpdateBlockIds]);
  const selectedRemoveBlockIdSet = useMemo(() => new Set(selectedRemoveBlockIds), [selectedRemoveBlockIds]);
  const selectedOverrideConflictBlockIdSet = useMemo(() => new Set(selectedOverrideConflictBlockIds), [selectedOverrideConflictBlockIds]);
  const importRunHistorySummary = useMemo(
    () => sortedImportRuns.reduce(
      (summary, run) => ({
        totalRuns: summary.totalRuns + 1,
        successfulRuns: summary.successfulRuns + (run.result_status === 'success' ? 1 : 0),
        failedRuns: summary.failedRuns + (run.result_status === 'failed' ? 1 : 0),
        skippedConflicts: summary.skippedConflicts + (run.execution_metadata?.summary_counts.skipped_conflicts ?? 0),
      }),
      {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        skippedConflicts: 0,
      },
    ),
    [sortedImportRuns],
  );
  const importResumeSupport = useMemo(
    () => buildTenderImportResumeSupport({
      importRuns: sortedImportRuns,
      preview: editorImportPreview,
      importState: draftPackageImportState,
      reimportPreview: draftPackageReimportPreview,
      repairPreview: draftPackageImportRepairPreview,
    }),
    [draftPackageImportRepairPreview, draftPackageImportState, draftPackageReimportPreview, editorImportPreview, sortedImportRuns],
  );
  const visibleImportRuns = showAllImportRuns ? sortedImportRuns : sortedImportRuns.slice(0, 4);
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
      override_conflict_block_ids: selectedOverrideConflictBlockIds,
      conflict_policy: selectedOverrideConflictBlockIds.length > 0 ? 'override_selected_conflicts' : 'protect_conflicts',
    }),
    [selectedOverrideConflictBlockIds, selectedRemoveBlockIds, selectedUpdateBlockIds],
  );
  const isResumeActionPending = Boolean(
    selectedDraftPackage
    && (
      (importResumeSupport.action_kind === 'reimport' && importingDraftPackageId === selectedDraftPackage.id)
      || (importResumeSupport.action_kind === 'registry_repair' && isRepairRunning)
      || (importResumeSupport.action_kind === 'diagnostics_refresh' && isRefreshingDiagnostics)
    ),
  );
  const canResumeFailedRun = Boolean(
    selectedDraftPackage
    && importResumeSupport.can_resume
    && importResumeSupport.action_kind
    && (
      importResumeSupport.action_kind !== 'reimport'
      || (qualityGate.canExportToEditor && importValidation?.can_import)
    )
    && !previewingEditorImportDraftPackageId
    && !importingDraftPackageId
    && !isRefreshingDiagnostics
    && !isRepairRunning,
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
    setSelectedOverrideConflictBlockIds(draftPackageReimportPreview?.default_override_conflict_block_ids ?? []);
    setConfirmSelectiveReimport(false);
  }, [
    draftPackageReimportPreview?.default_update_block_ids,
    draftPackageReimportPreview?.default_remove_block_ids,
    draftPackageReimportPreview?.default_override_conflict_block_ids,
    draftPackageReimportPreview?.current_payload_hash,
    draftPackageReimportPreview?.previous_payload_hash,
    draftPackageReimportPreview?.registry_status,
    selectedDraftPackage?.id,
  ]);

  useEffect(() => {
    setActiveTab(editorHandoff?.isActive ? 'import' : 'included');
  }, [editorHandoff?.isActive, editorHandoff?.resolvedDraftPackageId, selectedDraftPackage?.id]);

  useEffect(() => {
    setShowAllImportRuns(false);
  }, [selectedDraftPackage?.id]);

  return (
    <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4.5 w-4.5 text-slate-500" />
              Managed import surface + run audit
            </CardTitle>
            <CardDescription>
              Tarjousäly rajaa editoriin vain hallitun pinnan, näyttää blokkitason diffit ja tarjoaa nyt myös käyttökelpoisen import-run-auditin siitä mitä päivitettiin, skipattiin tai korjattiin ja miksi.
            </CardDescription>
            {editorHandoff?.isActive && editorHandoff.title && editorHandoff.description && (
              <div className={[
                'rounded-2xl border px-4 py-4 text-sm leading-6',
                editorHandoff.bannerTone === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-950'
                  : 'border-sky-200 bg-sky-50 text-sky-950',
              ].join(' ')}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">QuoteEditor handoff</Badge>
                  {editorHandoff.ctaLabel && <Badge variant="outline">{editorHandoff.ctaLabel}</Badge>}
                  {editorHandoff.focusedBlockIds.length > 0 && <Badge variant="outline">{editorHandoff.focusedBlockIds.length} kohdeblokkia</Badge>}
                </div>
                <div className="mt-2 font-medium">{editorHandoff.title}</div>
                <p className="mt-1">{editorHandoff.description}</p>
                {editorHandoff.focusedBlockIds.length > 0 && (
                  <p className="mt-2 text-xs opacity-80">Kohdistetut blockit: {editorHandoff.focusedBlockIds.join(', ')}</p>
                )}
              </div>
            )}
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
                    || !qualityGate.canExportToEditor
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

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-950">Laatugate ennen editorivientiä</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{qualityGate.summary}</p>
            </div>
            <Badge variant={resolveGateVariant(qualityGate.state)}>{resolveGateLabel(qualityGate.state)}</Badge>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {qualityGate.checks.map((check) => (
              <div key={check.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950">{check.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{check.detail}</p>
                  </div>
                  <Badge variant={resolveGateVariant(check.state)}>{resolveGateLabel(check.state)}</Badge>
                </div>
              </div>
            ))}
          </div>

          {qualityGate.nextActions.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-sm font-medium text-slate-950">Tarkista seuraavaksi</p>
              <div className="mt-3 space-y-2">
                {qualityGate.nextActions.map((action, index) => (
                  <p key={`quality-gate-action-${index}`} className="text-sm leading-6 text-slate-700">{index + 1}. {action}</p>
                ))}
              </div>
            </div>
          )}
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
                    {draftPackageImportState?.last_drift_checked_at && <p>Viimeisin drift-check: {formatTenderTimestamp(draftPackageImportState.last_drift_checked_at)}</p>}
                    {draftPackageImportState && <p>Selective re-import turvallinen nyt: {draftPackageImportState.safe_reimport_now ? 'Kyllä' : 'Ei vielä'}</p>}
                    {draftPackageImportState && <p>Manuaalisia quote-muutoksia havaittu: {draftPackageImportState.manual_quote_edit_detected ? 'Kyllä' : 'Ei'}</p>}
                    {draftPackageImportState && <p>Konfliktiblokkeja: {draftPackageImportState.conflict_block_count}</p>}
                    {draftPackageImportState && <p>Quote-puolelta puuttuvia blokkeja: {draftPackageImportState.missing_in_quote_block_count}</p>}
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
                      <p>Toimija: {resolveImportRunActorLabel(latestImportRun, actorNameById)}</p>
                      <p>Run type: {TENDER_IMPORT_RUN_TYPE_META[latestImportRun.run_type].label}</p>
                      <p>Mode: {TENDER_EDITOR_IMPORT_MODE_META[latestImportRun.import_mode].label}</p>
                      <p>Status: {TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[latestImportRun.result_status].label}</p>
                      <p>Ajotapa: {resolveImportRunExecutionModeLabel(latestImportRun.execution_metadata?.run_mode)}</p>
                      <p>Summary: {latestImportRun.summary ?? 'Ei erillistä yhteenvetoa.'}</p>
                      <p>Payload hash: {shortenHash(latestImportRun.payload_hash)}</p>
                      <p>Päivitetyt blokit: {latestImportRun.execution_metadata?.summary_counts.updated_blocks ?? 0}</p>
                      <p>Override-konfliktit: {latestImportRun.execution_metadata?.override_conflict_block_ids.length ?? 0}</p>
                      <p>Skipatut konfliktit: {latestImportRun.execution_metadata?.summary_counts.skipped_conflicts ?? 0}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-700">Tälle luonnospaketille ei ole vielä import-ajohistoriaa.</p>
                  )}
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4">
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
                          <ProviderContextBadges contentMd={item.content_md} className="mt-2" />
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
                    {importResumeSupport.status !== 'not_available' && importResumeSupport.latest_failed_run && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-950">
                              <ArrowsClockwise className="h-4 w-4 text-slate-500" />
                              Ajon jatkaminen ja idempotenssi
                              <Badge variant={resolveResumeSupportVariant(importResumeSupport.status)}>
                                {resolveResumeSupportLabel(importResumeSupport.status)}
                              </Badge>
                              <Badge variant={TENDER_IMPORT_RUN_TYPE_META[importResumeSupport.latest_failed_run.run_type].variant}>
                                {TENDER_IMPORT_RUN_TYPE_META[importResumeSupport.latest_failed_run.run_type].label}
                              </Badge>
                              <Badge variant={TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[importResumeSupport.latest_failed_run.result_status].variant}>
                                {TENDER_EDITOR_IMPORT_RUN_RESULT_STATUS_META[importResumeSupport.latest_failed_run.result_status].label}
                              </Badge>
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-950">{importResumeSupport.summary}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              Viimeisin epaonnistunut ajo {formatTenderTimestamp(importResumeSupport.latest_failed_run.created_at)}. {importResumeSupport.latest_failed_run.summary ?? 'Ei erillista yhteenvetoa.'}
                            </p>
                          </div>

                          {importResumeSupport.action_label && (
                            <Button
                              type="button"
                              disabled={!canResumeFailedRun}
                              onClick={() => {
                                if (!selectedDraftPackage) {
                                  return;
                                }

                                if (importResumeSupport.action_kind === 'reimport' && importResumeSupport.selection) {
                                  void onReimportDraftPackageToEditor(selectedDraftPackage.id, importResumeSupport.selection);
                                  return;
                                }

                                if (importResumeSupport.action_kind === 'registry_repair' && importResumeSupport.repair_action) {
                                  void onRepairDraftPackageImportRegistry(selectedDraftPackage.id, importResumeSupport.repair_action);
                                  return;
                                }

                                if (importResumeSupport.action_kind === 'diagnostics_refresh') {
                                  void onRefreshDraftPackageImportDiagnosticsFromQuote(selectedDraftPackage.id);
                                }
                              }}
                            >
                              {isResumeActionPending ? resolveResumePendingLabel(importResumeSupport.action_kind) : importResumeSupport.action_label}
                            </Button>
                          )}
                        </div>

                        {importResumeSupport.detail_lines.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {importResumeSupport.detail_lines.map((detailLine, index) => (
                              <div key={`resume-detail-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700">
                                {detailLine}
                              </div>
                            ))}
                          </div>
                        )}

                        {(importResumeSupport.pending_block_ids.length > 0
                          || importResumeSupport.blocked_block_ids.length > 0
                          || importResumeSupport.settled_block_ids.length > 0) && (
                          <div className="mt-4 grid gap-3 xl:grid-cols-3">
                            <ImportRunBlockList
                              title="Jatkettavat blokit"
                              blockIds={importResumeSupport.pending_block_ids}
                              run={importResumeSupport.latest_failed_run}
                            />
                            <ImportRunBlockList
                              title="Edelleen suojassa"
                              blockIds={importResumeSupport.blocked_block_ids}
                              run={importResumeSupport.latest_failed_run}
                            />
                            <ImportRunBlockList
                              title="Ei enaa jatkettavaa"
                              blockIds={importResumeSupport.settled_block_ids}
                              run={importResumeSupport.latest_failed_run}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {editorHandoff?.isActive && editorHandoff.title && (
                      <div className={[
                        'rounded-2xl border px-4 py-4 text-sm leading-6',
                        editorHandoff.bannerTone === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-950'
                          : 'border-sky-200 bg-sky-50 text-sky-950',
                      ].join(' ')}>
                        <div className="font-medium">QuoteEditor avasi tämän import-kontekstin suoraan lähdeluonnoksesta</div>
                        <p className="mt-1">{editorHandoff.description}</p>
                      </div>
                    )}

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
                          {draftPackageImportState?.last_drift_checked_at && <p>Viimeisin drift-check: {formatTenderTimestamp(draftPackageImportState.last_drift_checked_at)}</p>}
                          {draftPackageImportState && <p>Selective re-import turvallinen nyt: {draftPackageImportState.safe_reimport_now ? 'Kyllä' : 'Ei'}</p>}
                          {draftPackageImportState && <p>Manuaaliset quote-muutokset: {draftPackageImportState.manual_quote_edit_detected ? 'Havaittu' : 'Ei havaittu'}</p>}
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

                    {draftPackageImportDiagnostics && (
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-950">
                            <WarningCircle className="h-4 w-4 text-slate-500" />
                            Import ownership diagnostics
                            <Badge variant={TENDER_IMPORT_OWNERSHIP_REGISTRY_STATUS_META[draftPackageImportDiagnostics.registry_status].variant}>
                              {TENDER_IMPORT_OWNERSHIP_REGISTRY_STATUS_META[draftPackageImportDiagnostics.registry_status].label}
                            </Badge>
                            {draftPackageImportDiagnostics.repair_recommended && <Badge variant="outline">Repair suositeltu</Badge>}
                            {draftPackageImportDiagnostics.manual_quote_edit_detected && <Badge variant="destructive">Manuaalisia quote-muutoksia</Badge>}
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Healthy</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageImportDiagnostics.summary.healthy_blocks}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Stale</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageImportDiagnostics.summary.stale_blocks}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Orphaned registry</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageImportDiagnostics.summary.orphaned_registry_blocks}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Missing in quote</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageImportDiagnostics.summary.missing_quote_blocks}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Conflicts</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageImportDiagnostics.summary.conflict_blocks}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Drifted quote</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageImportDiagnostics.summary.drifted_quote_blocks}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Drifted draft</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageImportDiagnostics.summary.drifted_draft_blocks}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total registry</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageImportDiagnostics.summary.total_registry_blocks}</p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p>Viimeisin live drift-check: {formatOptionalTimestamp(draftPackageImportDiagnostics.last_live_drift_checked_at)}</p>
                              <p className="mt-1">Viimeisin registry sync: {formatOptionalTimestamp(draftPackageImportDiagnostics.last_registry_sync_at)}</p>
                              <p className="mt-1">Turvallinen re-import nyt: {draftPackageImportDiagnostics.safe_reimport_now ? 'Kyllä' : 'Ei'}</p>
                              <p className="mt-1">Repair ennen re-importia: {draftPackageImportDiagnostics.repair_recommended ? 'Suositeltu' : 'Ei välttämätön'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p>Viimeisin import/run: {latestImportRun ? formatTenderTimestamp(latestImportRun.created_at) : 'Ei vielä'}</p>
                              <p className="mt-1">Viimeisin diagnostics refresh: {latestDiagnosticsRefreshRun ? formatTenderTimestamp(latestDiagnosticsRefreshRun.created_at) : 'Ei vielä'}</p>
                              <p className="mt-1">Viimeisin registry repair: {latestRegistryRepairRun ? formatTenderTimestamp(latestRegistryRepairRun.created_at) : 'Ei vielä'}</p>
                              <p className="mt-1">Warningeja: {draftPackageImportDiagnostics.warnings.length}</p>
                            </div>
                          </div>

                          {draftPackageImportDiagnostics.warnings.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {draftPackageImportDiagnostics.warnings.map((warning, index) => (
                                <div key={`${warning}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700">
                                  {warning}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                            <ArrowsClockwise className="h-4 w-4 text-slate-500" />
                            Registry repair tools
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-700">
                            Phase 17 repair päivittää vain registry-metadataa, drift-tilaa, hasheja ja inaktiivisten rivien siivousta. Se ei kirjoita quote-sisältöä eikä adoptoi uutta sisältöä live-quotesta.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={!selectedDraftPackage || isRefreshingDiagnostics || isRepairRunning}
                              onClick={() => {
                                if (!selectedDraftPackage) {
                                  return;
                                }

                                void onRefreshDraftPackageImportDiagnosticsFromQuote(selectedDraftPackage.id);
                              }}
                            >
                              {isRefreshingDiagnostics ? 'Päivitetään live-tilaa...' : 'Päivitä tila quotesta'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={!selectedDraftPackage || isRefreshingRepairPreview || isRepairRunning}
                              onClick={() => {
                                if (!selectedDraftPackage) {
                                  return;
                                }

                                void onRefreshDraftPackageImportRegistryRepairPreview(selectedDraftPackage.id);
                              }}
                            >
                              {isRefreshingRepairPreview ? 'Päivitetään previewta...' : 'Päivitä repair-preview'}
                            </Button>
                          </div>

                          <div className="mt-4 grid gap-2">
                            {repairActionKeys.map((action) => {
                              const actionSummary = repairPreviewActions.find((item) => item.action === action);
                              const actionMeta = TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META[action];
                              const eligibleCount = actionSummary?.eligible_block_ids.length ?? 0;
                              const isCurrentAction = repairingDraftPackageRegistryAction === action && isRepairRunning;

                              return (
                                <Button
                                  key={action}
                                  type="button"
                                  variant={actionMeta.variant === 'default' ? 'default' : 'outline'}
                                  disabled={!selectedDraftPackage || isRefreshingDiagnostics || isRefreshingRepairPreview || isRepairRunning || eligibleCount < 1}
                                  onClick={() => {
                                    if (!selectedDraftPackage) {
                                      return;
                                    }

                                    void onRepairDraftPackageImportRegistry(selectedDraftPackage.id, action);
                                  }}
                                >
                                  {isCurrentAction ? 'Suoritetaan...' : actionMeta.label}
                                </Button>
                              );
                            })}
                          </div>

                          <div className="mt-4 space-y-3">
                            {repairPreviewActions.map((action) => (
                              <div key={action.action} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant={TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META[action.action].variant}>
                                    {TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META[action.action].label}
                                  </Badge>
                                  <Badge variant="outline">Eligible {action.eligible_block_ids.length}</Badge>
                                  <Badge variant="outline">Skipped {action.skipped_block_ids.length}</Badge>
                                </div>
                                <p className="mt-2 leading-6">{action.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

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

                    {draftPackageImportDiagnostics && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                          <ListChecks className="h-4 w-4 text-slate-500" />
                          Registry block status
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          Jokainen rivi näyttää registryn, latest payloadin ja live quote -markerien nykyisen suhteen. Tasta näkymästä näkee, vaatiiko blokki vain metadata-refreshin vai aidon re-importin.
                        </p>

                        <div className="mt-4 space-y-3">
                          {repairPreviewBlocks.length > 0 ? repairPreviewBlocks.map((block) => (
                            <div key={block.marker_key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={TENDER_IMPORT_REGISTRY_DIAGNOSTIC_STATUS_META[block.diagnostic_status].variant}>
                                      {TENDER_IMPORT_REGISTRY_DIAGNOSTIC_STATUS_META[block.diagnostic_status].label}
                                    </Badge>
                                    <Badge variant={TENDER_EDITOR_MANAGED_BLOCK_DRIFT_STATUS_META[block.drift_status].variant}>
                                      {TENDER_EDITOR_MANAGED_BLOCK_DRIFT_STATUS_META[block.drift_status].label}
                                    </Badge>
                                    <Badge variant="outline">{block.target_label}</Badge>
                                    {!block.registry_is_active && <Badge variant="secondary">Registry inactive</Badge>}
                                    {block.is_conflict && <Badge variant="destructive">Konflikti</Badge>}
                                    {block.requires_reimport && <Badge variant="destructive">Vaatii re-importin</Badge>}
                                    {block.recommended_repair_action && (
                                      <Badge variant={TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META[block.recommended_repair_action].variant}>
                                        {TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META[block.recommended_repair_action].label}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mt-2 text-sm font-medium text-slate-950">{block.title}</p>
                                  <p className="mt-1 text-sm text-slate-700">Marker {block.marker_key}</p>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                                  <p>Registry rev: {block.registry_revision ?? 'Ei riviä'}</p>
                                  <p className="mt-1">Registry sync: {formatOptionalTimestamp(block.registry_last_synced_at)}</p>
                                  <p className="mt-1">Drift-check: {formatOptionalTimestamp(block.registry_last_drift_checked_at)}</p>
                                  <p className="mt-1">Live marker: {block.live_quote_marker_present ? 'Löytyy' : 'Puuttuu'}</p>
                                  <p className="mt-1">Section row: {block.live_quote_section_row_present ? 'Löytyy' : 'Puuttuu'}</p>
                                </div>
                              </div>

                              <div className="mt-3 grid gap-3 xl:grid-cols-2 text-sm text-slate-700">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                  <p>Latest payload mukana: {block.latest_payload_present ? 'Kyllä' : 'Ei'}</p>
                                  <p className="mt-1">Registry payload hash: {shortenHash(block.registry_payload_hash)}</p>
                                  <p className="mt-1">Latest payload hash: {shortenHash(block.latest_payload_hash)}</p>
                                  <p className="mt-1">Last applied hash: {shortenHash(block.registry_last_applied_content_hash)}</p>
                                  <p className="mt-1">Last seen quote hash: {shortenHash(block.registry_last_seen_quote_content_hash)}</p>
                                  <p className="mt-1">Live quote hash: {shortenHash(block.live_quote_content_hash)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                  <p>Live quote title: {block.live_quote_section_title ?? 'Ei riviä'}</p>
                                  <p className="mt-1">Repair before re-import: {block.repair_recommended_before_reimport ? 'Kyllä' : 'Ei'}</p>
                                  <p className="mt-1">Metadata refresh: {block.can_refresh_registry_metadata ? 'Mahdollinen' : 'Ei'}</p>
                                  <p className="mt-1">Mark orphaned: {block.can_mark_orphaned ? 'Mahdollinen' : 'Ei'}</p>
                                  <p className="mt-1">Prune inactive: {block.can_prune_inactive ? 'Mahdollinen' : 'Ei'}</p>
                                  <p className="mt-1">Resync hashes: {block.can_resync_hashes_from_live_quote_markers ? 'Mahdollinen' : 'Ei'}</p>
                                </div>
                              </div>

                              {block.available_repair_actions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {block.available_repair_actions.map((action) => (
                                    <Badge key={`${block.block_id}-${action}`} variant={TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META[action].variant}>
                                      {TENDER_IMPORT_REGISTRY_REPAIR_ACTION_META[action].label}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {block.skip_reason && (
                                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
                                  {block.skip_reason}
                                </div>
                              )}

                              {block.live_quote_content_md && (
                                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700 whitespace-pre-line">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Live quote -sisalto</p>
                                  {getTenderTextPreview(block.live_quote_content_md, 280)}
                                </div>
                              )}

                              {block.warnings.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {block.warnings.map((warning, index) => (
                                    <div key={`${block.block_id}-diagnostic-warning-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
                                      {warning}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )) : (
                            <p className="text-sm leading-6 text-slate-700">Registry block diagnostics ei löytänyt yhtään hallittua blokkia tälle draft package -versiolle.</p>
                          )}
                        </div>
                      </div>
                    )}

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

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Turvallista päivittää</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.safe_update_block_count}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Konfliktiblokit</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.conflict_block_count}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Poistunut quote-puolelta</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.missing_in_quote_block_count}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Registry epävireessä</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.registry_stale_block_count}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Oletuksena skipataan</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">{draftPackageReimportPreview.skipped_block_count}</p>
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
                                      Valitse vain ne Tarjousälyn omistamat lohkot, jotka päivitetään tai poistetaan. Konfliktiblokit jätetään oletuksena rauhaan, vaikka ne olisivat valittuina, ellei niille aseteta eksplisiittistä overridea.
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
                                        setSelectedOverrideConflictBlockIds(draftPackageReimportPreview.default_override_conflict_block_ids);
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
                                        setSelectedOverrideConflictBlockIds([]);
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

                                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
                                  Konfliktioverrideja valittuna: {selectedOverrideConflictBlockIds.length}. Turvallinen re-import juuri nyt: {draftPackageReimportPreview.safe_reimport_now ? 'kyllä' : 'ei'}.
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
                                        <Badge variant={TENDER_EDITOR_MANAGED_BLOCK_DRIFT_STATUS_META[block.drift_status].variant}>{TENDER_EDITOR_MANAGED_BLOCK_DRIFT_STATUS_META[block.drift_status].label}</Badge>
                                        {block.is_conflict && <Badge variant="destructive">Konflikti</Badge>}
                                        {block.registry_revision != null && <Badge variant="outline">Rev {block.registry_revision}</Badge>}
                                      </div>
                                      <p className="mt-2 text-sm font-medium text-slate-950">{block.title}</p>
                                      <p className="mt-2 text-sm leading-6 text-slate-700">Marker {block.marker_key}</p>
                                      {block.registry_last_synced_at && <p className="mt-1 text-xs leading-5 text-slate-500">Viimeksi synkattu {formatTenderTimestamp(block.registry_last_synced_at)}</p>}
                                    </div>

                                    {(block.can_select_for_update || block.can_select_for_removal) ? (
                                      <div className="flex flex-col gap-2">
                                        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                          <Checkbox
                                            checked={block.can_select_for_removal ? selectedRemoveBlockIdSet.has(block.block_id) : selectedUpdateBlockIdSet.has(block.block_id)}
                                            onCheckedChange={(checked) => {
                                              const isChecked = checked === true;

                                              updateSelectedBlockIds(
                                                block.can_select_for_removal ? setSelectedRemoveBlockIds : setSelectedUpdateBlockIds,
                                                block.block_id,
                                                isChecked,
                                              );

                                              if (!isChecked) {
                                                updateSelectedBlockIds(setSelectedOverrideConflictBlockIds, block.block_id, false);
                                              }

                                              setConfirmSelectiveReimport(false);
                                            }}
                                          />
                                          <span className="text-sm leading-6 text-slate-700">
                                            {block.can_select_for_removal ? 'Valitse poistettavaksi' : 'Valitse päivitettäväksi'}
                                          </span>
                                        </label>

                                        {block.can_override_conflict && (
                                          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                                            <Checkbox
                                              checked={selectedOverrideConflictBlockIdSet.has(block.block_id)}
                                              disabled={block.can_select_for_removal
                                                ? !selectedRemoveBlockIdSet.has(block.block_id)
                                                : !selectedUpdateBlockIdSet.has(block.block_id)}
                                              onCheckedChange={(checked) => {
                                                updateSelectedBlockIds(setSelectedOverrideConflictBlockIds, block.block_id, checked === true);
                                                setConfirmSelectiveReimport(false);
                                              }}
                                            />
                                            <span className="text-sm leading-6 text-slate-700">
                                              Pakota konfliktiblokki mukaan, vaikka quote-puolella on manuaalinen muutos tai registry-epävarmuus.
                                            </span>
                                          </label>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="secondary">Ei valittavaa muutosta</Badge>
                                    )}
                                  </div>

                                  <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
                                    <div className="space-y-3">
                                      <p className="text-sm leading-6 text-slate-700 whitespace-pre-line">
                                        {getTenderTextPreview(block.current_content_md ?? block.previous_content_md ?? '', 240)}
                                      </p>
                                      {block.quote_content_md && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700 whitespace-pre-line">
                                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nykyinen quote-sisältö</p>
                                          {getTenderTextPreview(block.quote_content_md, 240)}
                                        </div>
                                      )}
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                                      <p>Text marker: {block.text_marker_present ? 'Löytyy' : 'Puuttuu'}</p>
                                      <p className="mt-1">Section row: {block.section_row_present ? 'Löytyy' : 'Puuttuu'}</p>
                                      {block.quote_section_title && <p className="mt-1">Quote row title: {block.quote_section_title}</p>}
                                      {block.last_applied_content_hash && <p className="mt-1">Last applied hash: {shortenHash(block.last_applied_content_hash)}</p>}
                                      {block.last_seen_quote_content_hash && <p className="mt-1">Last seen hash: {shortenHash(block.last_seen_quote_content_hash)}</p>}
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
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                            <ClockCounterClockwise className="h-4 w-4 text-slate-500" />
                            Import-ajohistoria
                          </div>
                          {sortedImportRuns.length > 4 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setShowAllImportRuns((current) => !current)}
                            >
                              {showAllImportRuns ? 'Näytä vähemmän' : `Näytä kaikki (${sortedImportRuns.length})`}
                            </Button>
                          )}
                        </div>
                        {sortedImportRuns.length > 0 ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ajot yhteensä</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{importRunHistorySummary.totalRuns}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Onnistuneet</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{importRunHistorySummary.successfulRuns}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Epäonnistuneet</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{importRunHistorySummary.failedRuns}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Skipatut konfliktit</p>
                              <p className="mt-1 text-xl font-semibold text-slate-950">{importRunHistorySummary.skippedConflicts}</p>
                            </div>
                          </div>
                        ) : null}
                        {visibleImportRuns.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {visibleImportRuns.map((run) => (
                              <ImportRunAuditCard key={run.id} run={run} actorNameById={actorNameById} />
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