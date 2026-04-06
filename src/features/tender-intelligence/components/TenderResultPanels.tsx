import { FileText, ListChecks, Note, ShieldWarning, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

import {
  buildTenderWorkflowSummary,
  getLatestTenderWorkflowNote,
  matchesTenderWorkflowFilter,
  type TenderWorkflowFilter,
} from '../lib/tender-review-workflow';
import { isTenderReferenceRequirementCandidate } from '../lib/tender-reference-matching';
import {
  formatTenderConfidence,
  formatCountLabel,
  formatTenderTimestamp,
  getTenderTextPreview,
  TENDER_DRAFT_ARTIFACT_STATUS_META,
  TENDER_DRAFT_ARTIFACT_TYPE_META,
  TENDER_MISSING_ITEM_STATUS_META,
  TENDER_MISSING_ITEM_TYPE_META,
  TENDER_REFERENCE_SOURCE_META,
  TENDER_REQUIREMENT_STATUS_META,
  TENDER_REQUIREMENT_TYPE_META,
  TENDER_RESOLUTION_STATUS_META,
  TENDER_REVIEW_STATUS_META,
  TENDER_REVIEW_TASK_STATUS_META,
  TENDER_REVIEW_TASK_TYPE_META,
  TENDER_RISK_FLAG_STATUS_META,
  TENDER_RISK_TYPE_META,
  TENDER_SEVERITY_META,
  type TenderBadgeVariant,
} from '../lib/tender-intelligence-ui';
import type { TenderPackageDetails, UpdateTenderWorkflowInput } from '../types/tender-intelligence';

interface TenderResultPanelsProps {
  selectedPackage: TenderPackageDetails;
  currentUserId?: string | null;
  actorNameById?: Record<string, string>;
  referenceProfileTitleById?: Record<string, string>;
  updatingTargetIds?: string[];
  recomputingReferenceSuggestions?: boolean;
  onUpdateRequirement?: (requirementId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
  onUpdateMissingItem?: (missingItemId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
  onUpdateRiskFlag?: (riskFlagId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
  onUpdateReferenceSuggestion?: (referenceSuggestionId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
  onUpdateReviewTask?: (reviewTaskId: string, input: UpdateTenderWorkflowInput) => Promise<unknown>;
  onRecomputeReferenceSuggestions?: () => Promise<unknown>;
}

interface ResultCardProps {
  icon: typeof Note;
  title: string;
  description: string;
  countLabel: string;
  emptyMessage: string;
  hasItems: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

interface ResultEvidencePreviewProps {
  evidence: TenderPackageDetails['resultEvidence'];
  documentNameById: Map<string, string>;
}

interface WorkflowActionConfig {
  id: string;
  label: string;
  variant?: TenderBadgeVariant;
  onClick: (note: string) => Promise<unknown>;
}

interface ResultWorkflowControlsProps {
  workflowKey: string;
  reviewStatus: TenderPackageDetails['results']['requirements'][number]['reviewStatus'];
  reviewNote?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  resolutionStatus: TenderPackageDetails['results']['requirements'][number]['resolutionStatus'];
  resolutionNote?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  assignedToUserId?: string | null;
  currentUserId?: string | null;
  actorNameById: Record<string, string>;
  updatingTargetIds: string[];
  actions?: WorkflowActionConfig[];
  onAssignToMe?: () => Promise<unknown>;
}

const FILTER_BUTTONS: Array<{ key: TenderWorkflowFilter; label: string }> = [
  { key: 'all', label: 'Kaikki' },
  { key: 'unreviewed', label: 'Tarkistamatta' },
  { key: 'needs_attention', label: 'Vaatii huomiota' },
  { key: 'open', label: 'Avoin' },
  { key: 'in_progress', label: 'Työn alla' },
  { key: 'resolved', label: 'Ratkaistu' },
  { key: 'dismissed', label: 'Hylätty' },
];

function ResultCard({
  icon: Icon,
  title,
  description,
  countLabel,
  emptyMessage,
  hasItems,
  headerAction,
  children,
}: ResultCardProps) {
  return (
    <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4.5 w-4.5 text-slate-500" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {headerAction}
            <Badge variant="outline">{countLabel}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {hasItems ? children : <div className="rounded-2xl border border-dashed px-4 py-8 text-sm leading-6 text-muted-foreground">{emptyMessage}</div>}
      </CardContent>
    </Card>
  );
}

function ResultEvidencePreview({ evidence, documentNameById }: ResultEvidencePreviewProps) {
  if (evidence.length < 1) {
    return null;
  }

  const previewItems = evidence.slice(0, 2);
  const remainingCount = evidence.length - previewItems.length;

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Evidence</p>
        <Badge variant="outline">{formatCountLabel(evidence.length, 'lähde', 'lähdettä')}</Badge>
      </div>
      <div className="mt-3 space-y-2">
        {previewItems.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{documentNameById.get(item.sourceDocumentId) ?? 'Dokumentti'}</Badge>
              {item.locatorText && <span className="text-xs text-muted-foreground">{item.locatorText}</span>}
              <span className="text-xs text-muted-foreground">Luottamus {formatTenderConfidence(item.confidence)}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-700">{item.excerptText}</p>
          </div>
        ))}
      </div>
      {remainingCount > 0 && <p className="mt-3 text-xs leading-5 text-muted-foreground">+ {remainingCount} muuta evidence-riviä</p>}
    </div>
  );
}

function resolveActorName(userId: string | null | undefined, actorNameById: Record<string, string>) {
  if (!userId) {
    return null;
  }

  return actorNameById[userId] ?? `Käyttäjä ${userId.slice(0, 8)}`;
}

function formatWorkflowCountLabel(totalCount: number, filteredCount: number, singular: string, plural?: string) {
  if (totalCount === filteredCount) {
    return formatCountLabel(totalCount, singular, plural);
  }

  return `${filteredCount} / ${totalCount}`;
}

function ResultWorkflowControls({
  workflowKey,
  reviewStatus,
  reviewNote,
  reviewedByUserId,
  reviewedAt,
  resolutionStatus,
  resolutionNote,
  resolvedByUserId,
  resolvedAt,
  assignedToUserId,
  currentUserId,
  actorNameById,
  updatingTargetIds,
  actions = [],
  onAssignToMe,
}: ResultWorkflowControlsProps) {
  const [note, setNote] = useState(getLatestTenderWorkflowNote({ reviewStatus, reviewNote, reviewedAt, resolutionStatus, resolutionNote, resolvedAt }) ?? '');
  const reviewStatusMeta = TENDER_REVIEW_STATUS_META[reviewStatus];
  const resolutionStatusMeta = TENDER_RESOLUTION_STATUS_META[resolutionStatus];
  const latestNote = getLatestTenderWorkflowNote({ reviewStatus, reviewNote, reviewedAt, resolutionStatus, resolutionNote, resolvedAt });
  const pending = updatingTargetIds.includes(workflowKey);
  const assignedActor = resolveActorName(assignedToUserId, actorNameById);
  const reviewedActor = resolveActorName(reviewedByUserId, actorNameById);
  const resolvedActor = resolveActorName(resolvedByUserId, actorNameById);
  const showAssignButton = Boolean(onAssignToMe && currentUserId && assignedToUserId !== currentUserId);

  useEffect(() => {
    setNote(getLatestTenderWorkflowNote({ reviewStatus, reviewNote, reviewedAt, resolutionStatus, resolutionNote, resolvedAt }) ?? '');
  }, [reviewStatus, reviewNote, reviewedAt, resolutionStatus, resolutionNote, resolvedAt, workflowKey]);

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={reviewStatusMeta.variant}>Tarkistus: {reviewStatusMeta.label}</Badge>
        <Badge variant={resolutionStatusMeta.variant}>Ratkaisu: {resolutionStatusMeta.label}</Badge>
        {assignedActor && <Badge variant="outline">Vastuuhenkilö: {assignedActor}</Badge>}
      </div>

      <div className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
        {reviewedAt && <p>Tarkistanut {reviewedActor ?? 'Käyttäjä'} • {formatTenderTimestamp(reviewedAt)}</p>}
        {resolvedAt && <p>Ratkaissut {resolvedActor ?? 'Käyttäjä'} • {formatTenderTimestamp(resolvedAt)}</p>}
        {latestNote && <p>Viimeisin note: {latestNote}</p>}
      </div>

      {(actions.length > 0 || showAssignButton) && (
        <div className="mt-4 space-y-3">
          <Textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Lisää lyhyt katselmointi- tai ratkaisunote"
            disabled={pending}
          />
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant={action.variant ?? 'outline'}
                size="sm"
                disabled={pending}
                onClick={() => {
                  void action.onClick(note);
                }}
              >
                {pending ? 'Tallennetaan...' : action.label}
              </Button>
            ))}
            {showAssignButton && onAssignToMe && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => {
                  void onAssignToMe();
                }}
              >
                {pending ? 'Tallennetaan...' : 'Ota omalle vastuulle'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TenderResultPanels({
  selectedPackage,
  currentUserId = null,
  actorNameById = {},
  referenceProfileTitleById = {},
  updatingTargetIds = [],
  recomputingReferenceSuggestions = false,
  onUpdateRequirement,
  onUpdateMissingItem,
  onUpdateRiskFlag,
  onUpdateReferenceSuggestion,
  onUpdateReviewTask,
  onRecomputeReferenceSuggestions,
}: TenderResultPanelsProps) {
  const [bulkWorkflowUpdateKey, setBulkWorkflowUpdateKey] = useState<string | null>(null);
  const documentNameById = new Map(selectedPackage.documents.map((document) => [document.id, document.fileName]));
  const requirementById = new Map(selectedPackage.results.requirements.map((requirement) => [requirement.id, requirement]));
  const evidenceByTarget = new Map<string, TenderPackageDetails['resultEvidence']>();
  const workflowSummary = buildTenderWorkflowSummary(selectedPackage.results);
  const [filter, setFilter] = useState<TenderWorkflowFilter>('all');
  const referenceRequirements = selectedPackage.results.requirements.filter((requirement) =>
    isTenderReferenceRequirementCandidate({
      title: requirement.title,
      description: requirement.description ?? null,
      sourceExcerpt: requirement.sourceExcerpt ?? null,
    })
  );

  selectedPackage.resultEvidence.forEach((item) => {
    const key = `${item.targetEntityType}:${item.targetEntityId}`;
    const current = evidenceByTarget.get(key) ?? [];
    current.push(item);
    evidenceByTarget.set(key, current);
  });

  const getTargetEvidence = (targetEntityType: string, targetEntityId: string) =>
    evidenceByTarget.get(`${targetEntityType}:${targetEntityId}`) ?? [];
  const filterItems = <T extends Parameters<typeof matchesTenderWorkflowFilter>[0]>(items: T[]) =>
    items.filter((item) => matchesTenderWorkflowFilter(item, filter));

  const filteredRequirements = filterItems(selectedPackage.results.requirements);
  const filteredMissingItems = filterItems(selectedPackage.results.missingItems);
  const filteredRiskFlags = filterItems(selectedPackage.results.riskFlags);
  const filteredReferenceSuggestions = filterItems(selectedPackage.results.referenceSuggestions);
  const filteredDraftArtifacts = filterItems(selectedPackage.results.draftArtifacts);
  const filteredReviewTasks = filterItems(selectedPackage.results.reviewTasks);
  const filteredEmptyMessage = 'Valitulla workflow-suodatuksella ei löytynyt rivejä tästä osiosta.';

  const executeBulkWorkflowUpdate = async (
    key: string,
    targetIds: string[],
    update: (targetId: string) => Promise<unknown>,
  ) => {
    if (targetIds.length < 1 || bulkWorkflowUpdateKey) {
      return;
    }

    setBulkWorkflowUpdateKey(key);

    try {
      await Promise.allSettled(targetIds.map((targetId) => update(targetId)));
    } finally {
      setBulkWorkflowUpdateKey(null);
    }
  };

  const filteredMissingItemWorkflowKeys = filteredMissingItems.map((item) => `missing_item:${item.id}`);
  const filteredRiskFlagWorkflowKeys = filteredRiskFlags.map((riskFlag) => `risk_flag:${riskFlag.id}`);
  const missingBulkPending = Boolean(bulkWorkflowUpdateKey) || filteredMissingItemWorkflowKeys.some((key) => updatingTargetIds.includes(key));
  const riskBulkPending = Boolean(bulkWorkflowUpdateKey) || filteredRiskFlagWorkflowKeys.some((key) => updatingTargetIds.includes(key));

  return (
    <div className="space-y-4">
      <Card className="border-slate-200/80 shadow-[0_20px_50px_-44px_rgba(15,23,42,0.35)]">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-base">Review workflow</CardTitle>
              <CardDescription>
                Baseline-analyysi tuottaa löydökset, mutta tämän vaiheen tarkoitus on tehdä niistä käsiteltäviä työobjekteja. Hyväksynnät, hylkäykset, ratkaisut, vastuuhenkilöt ja note-kentät tallentuvat nyt result-domainiin audit-tyyppisenä metadatana.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTER_BUTTONS.map((button) => {
                const active = filter === button.key;

                return (
                  <Button
                    key={button.key}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(button.key)}
                  >
                    {button.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tarkistamatta</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{workflowSummary.unreviewed}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vaatii huomiota</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{workflowSummary.needsAttention}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avoin</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{workflowSummary.open}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Työn alla</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{workflowSummary.inProgress}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ratkaistu</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{workflowSummary.resolved}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hylätty</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{workflowSummary.dismissed}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ResultCard
          icon={ListChecks}
          title="Vaatimukset"
          description="Pysyvä vaatimusdomain näyttää nyt sekä baseline-löydöksen että sen jälkeisen käyttäjäkäsittelyn. Hyväksy, hylkää tai nosta vaatimus huomiota vaativaksi ilman muutoksia nykyiseen tarjouseditoriin."
          countLabel={formatWorkflowCountLabel(selectedPackage.results.requirements.length, filteredRequirements.length, 'vaatimus')}
          emptyMessage={filter === 'all' ? 'Ensimmäinen completed-analyysi kirjoittaa tähän sääntöpohjaiset vaatimuslöydökset omiin result-tauluihinsa.' : filteredEmptyMessage}
          hasItems={filteredRequirements.length > 0}
        >
          {filteredRequirements.map((requirement) => {
            const typeMeta = TENDER_REQUIREMENT_TYPE_META[requirement.requirementType];
            const statusMeta = TENDER_REQUIREMENT_STATUS_META[requirement.status];

            return (
              <div key={requirement.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                  <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  <Badge variant={TENDER_REVIEW_STATUS_META[requirement.reviewStatus].variant}>{TENDER_REVIEW_STATUS_META[requirement.reviewStatus].label}</Badge>
                  <Badge variant={TENDER_RESOLUTION_STATUS_META[requirement.resolutionStatus].variant}>{TENDER_RESOLUTION_STATUS_META[requirement.resolutionStatus].label}</Badge>
                  <Badge variant="outline">Luottamus {formatTenderConfidence(requirement.confidence)}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-950">{requirement.title}</p>
                {requirement.description && <p className="mt-2 text-sm leading-6 text-slate-700">{requirement.description}</p>}
                {requirement.sourceExcerpt && <p className="mt-2 text-xs leading-5 text-muted-foreground">{requirement.sourceExcerpt}</p>}
                <ResultWorkflowControls
                  workflowKey={`requirement:${requirement.id}`}
                  reviewStatus={requirement.reviewStatus}
                  reviewNote={requirement.reviewNote}
                  reviewedByUserId={requirement.reviewedByUserId}
                  reviewedAt={requirement.reviewedAt}
                  resolutionStatus={requirement.resolutionStatus}
                  resolutionNote={requirement.resolutionNote}
                  resolvedByUserId={requirement.resolvedByUserId}
                  resolvedAt={requirement.resolvedAt}
                  assignedToUserId={requirement.assignedToUserId}
                  currentUserId={currentUserId}
                  actorNameById={actorNameById}
                  updatingTargetIds={updatingTargetIds}
                  actions={onUpdateRequirement ? [
                    {
                      id: 'accept',
                      label: 'Hyväksy',
                      variant: 'default',
                      onClick: (note) => onUpdateRequirement(requirement.id, {
                        reviewStatus: 'accepted',
                        reviewNote: note || null,
                        resolutionStatus: 'resolved',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'dismiss',
                      label: 'Hylkää',
                      variant: 'outline',
                      onClick: (note) => onUpdateRequirement(requirement.id, {
                        reviewStatus: 'dismissed',
                        reviewNote: note || null,
                        resolutionStatus: 'wont_fix',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'needs-attention',
                      label: 'Vaatii huomiota',
                      variant: 'destructive',
                      onClick: (note) => onUpdateRequirement(requirement.id, {
                        reviewStatus: 'needs_attention',
                        reviewNote: note || null,
                        resolutionStatus: 'open',
                        resolutionNote: note || null,
                      }),
                    },
                  ] : []}
                />
                <ResultEvidencePreview evidence={getTargetEvidence('requirement', requirement.id)} documentNameById={documentNameById} />
              </div>
            );
          })}
        </ResultCard>

        <ResultCard
          icon={WarningCircle}
          title="Puutteet"
          description="Puutelista näyttää edelleen varovaiset baseline-puutteet, mutta niitä ei enää tarvitse käsitellä vain lukulistana. Merkitse puute avoimeksi tai ratkaistuksi ja jätä tarvittaessa lyhyt päätösnote."
          countLabel={formatWorkflowCountLabel(selectedPackage.results.missingItems.length, filteredMissingItems.length, 'puute')}
          emptyMessage={filter === 'all' ? 'Puutteet syntyvät baseline-ajon mukana vasta kun analyysi on viety completed-tilaan.' : filteredEmptyMessage}
          hasItems={filteredMissingItems.length > 0}
          headerAction={onUpdateMissingItem ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={missingBulkPending || filteredMissingItems.length < 1}
                onClick={() => {
                  void executeBulkWorkflowUpdate(
                    'missing-open',
                    filteredMissingItems.map((item) => item.id),
                    (missingItemId) => onUpdateMissingItem(missingItemId, {
                      reviewStatus: 'needs_attention',
                      reviewNote: null,
                      resolutionStatus: 'open',
                      resolutionNote: null,
                    }),
                  );
                }}
              >
                {missingBulkPending ? 'Käsitellään...' : 'Pidä suodatetut avoimina'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="default"
                disabled={missingBulkPending || filteredMissingItems.length < 1}
                onClick={() => {
                  void executeBulkWorkflowUpdate(
                    'missing-resolved',
                    filteredMissingItems.map((item) => item.id),
                    (missingItemId) => onUpdateMissingItem(missingItemId, {
                      reviewStatus: 'accepted',
                      reviewNote: null,
                      resolutionStatus: 'resolved',
                      resolutionNote: null,
                    }),
                  );
                }}
              >
                {missingBulkPending ? 'Käsitellään...' : 'Ratkaise suodatetut'}
              </Button>
            </div>
          ) : undefined}
        >
          {filteredMissingItems.map((item) => {
            const typeMeta = TENDER_MISSING_ITEM_TYPE_META[item.itemType];
            const statusMeta = TENDER_MISSING_ITEM_STATUS_META[item.status];
            const severityMeta = TENDER_SEVERITY_META[item.severity];

            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                  <Badge variant={severityMeta.variant}>{severityMeta.label}</Badge>
                  <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  <Badge variant={TENDER_REVIEW_STATUS_META[item.reviewStatus].variant}>{TENDER_REVIEW_STATUS_META[item.reviewStatus].label}</Badge>
                  <Badge variant={TENDER_RESOLUTION_STATUS_META[item.resolutionStatus].variant}>{TENDER_RESOLUTION_STATUS_META[item.resolutionStatus].label}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-950">{item.title}</p>
                {item.description && <p className="mt-2 text-sm leading-6 text-slate-700">{item.description}</p>}
                <ResultWorkflowControls
                  workflowKey={`missing_item:${item.id}`}
                  reviewStatus={item.reviewStatus}
                  reviewNote={item.reviewNote}
                  reviewedByUserId={item.reviewedByUserId}
                  reviewedAt={item.reviewedAt}
                  resolutionStatus={item.resolutionStatus}
                  resolutionNote={item.resolutionNote}
                  resolvedByUserId={item.resolvedByUserId}
                  resolvedAt={item.resolvedAt}
                  assignedToUserId={item.assignedToUserId}
                  currentUserId={currentUserId}
                  actorNameById={actorNameById}
                  updatingTargetIds={updatingTargetIds}
                  actions={onUpdateMissingItem ? [
                    {
                      id: 'open',
                      label: 'Pidä avoimena',
                      variant: 'outline',
                      onClick: (note) => onUpdateMissingItem(item.id, {
                        reviewStatus: 'needs_attention',
                        reviewNote: note || null,
                        resolutionStatus: 'open',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'resolved',
                      label: 'Merkitse ratkaistuksi',
                      variant: 'default',
                      onClick: (note) => onUpdateMissingItem(item.id, {
                        reviewStatus: 'accepted',
                        reviewNote: note || null,
                        resolutionStatus: 'resolved',
                        resolutionNote: note || null,
                      }),
                    },
                  ] : []}
                />
                <ResultEvidencePreview evidence={getTargetEvidence('missing_item', item.id)} documentNameById={documentNameById} />
              </div>
            );
          })}
        </ResultCard>

        <ResultCard
          icon={ShieldWarning}
          title="Riskit"
          description="Riskihavainnot syntyvät edelleen vain selkeistä sääntöosumista, mutta niitä voi nyt käsitellä workflow-riveinä: nosta huomiota vaativaksi, kuittaa ratkaistuksi tai hylkää tarpeettomana."
          countLabel={formatWorkflowCountLabel(selectedPackage.results.riskFlags.length, filteredRiskFlags.length, 'riski')}
          emptyMessage={filter === 'all' ? 'Riskit näkyvät tässä, jos baseline-analyysi löytää oikeasti selkeän riskiehdon extracted tekstistä.' : filteredEmptyMessage}
          hasItems={filteredRiskFlags.length > 0}
          headerAction={onUpdateRiskFlag ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={riskBulkPending || filteredRiskFlags.length < 1}
                onClick={() => {
                  void executeBulkWorkflowUpdate(
                    'risk-needs-attention',
                    filteredRiskFlags.map((riskFlag) => riskFlag.id),
                    (riskFlagId) => onUpdateRiskFlag(riskFlagId, {
                      reviewStatus: 'needs_attention',
                      reviewNote: null,
                      resolutionStatus: 'open',
                      resolutionNote: null,
                    }),
                  );
                }}
              >
                {riskBulkPending ? 'Käsitellään...' : 'Nosta suodatetut käsittelyyn'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="default"
                disabled={riskBulkPending || filteredRiskFlags.length < 1}
                onClick={() => {
                  void executeBulkWorkflowUpdate(
                    'risk-resolved',
                    filteredRiskFlags.map((riskFlag) => riskFlag.id),
                    (riskFlagId) => onUpdateRiskFlag(riskFlagId, {
                      reviewStatus: 'accepted',
                      reviewNote: null,
                      resolutionStatus: 'resolved',
                      resolutionNote: null,
                    }),
                  );
                }}
              >
                {riskBulkPending ? 'Käsitellään...' : 'Kuittaa suodatetut ratkaistuksi'}
              </Button>
            </div>
          ) : undefined}
        >
          {filteredRiskFlags.map((riskFlag) => {
            const typeMeta = TENDER_RISK_TYPE_META[riskFlag.riskType];
            const severityMeta = TENDER_SEVERITY_META[riskFlag.severity];
            const statusMeta = TENDER_RISK_FLAG_STATUS_META[riskFlag.status];

            return (
              <div key={riskFlag.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                  <Badge variant={severityMeta.variant}>{severityMeta.label}</Badge>
                  <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  <Badge variant={TENDER_REVIEW_STATUS_META[riskFlag.reviewStatus].variant}>{TENDER_REVIEW_STATUS_META[riskFlag.reviewStatus].label}</Badge>
                  <Badge variant={TENDER_RESOLUTION_STATUS_META[riskFlag.resolutionStatus].variant}>{TENDER_RESOLUTION_STATUS_META[riskFlag.resolutionStatus].label}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-950">{riskFlag.title}</p>
                {riskFlag.description && <p className="mt-2 text-sm leading-6 text-slate-700">{riskFlag.description}</p>}
                <ResultWorkflowControls
                  workflowKey={`risk_flag:${riskFlag.id}`}
                  reviewStatus={riskFlag.reviewStatus}
                  reviewNote={riskFlag.reviewNote}
                  reviewedByUserId={riskFlag.reviewedByUserId}
                  reviewedAt={riskFlag.reviewedAt}
                  resolutionStatus={riskFlag.resolutionStatus}
                  resolutionNote={riskFlag.resolutionNote}
                  resolvedByUserId={riskFlag.resolvedByUserId}
                  resolvedAt={riskFlag.resolvedAt}
                  assignedToUserId={riskFlag.assignedToUserId}
                  currentUserId={currentUserId}
                  actorNameById={actorNameById}
                  updatingTargetIds={updatingTargetIds}
                  actions={onUpdateRiskFlag ? [
                    {
                      id: 'needs-attention',
                      label: 'Vaatii huomiota',
                      variant: 'destructive',
                      onClick: (note) => onUpdateRiskFlag(riskFlag.id, {
                        reviewStatus: 'needs_attention',
                        reviewNote: note || null,
                        resolutionStatus: 'open',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'resolved',
                      label: 'Ratkaistu',
                      variant: 'default',
                      onClick: (note) => onUpdateRiskFlag(riskFlag.id, {
                        reviewStatus: 'accepted',
                        reviewNote: note || null,
                        resolutionStatus: 'resolved',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'dismissed',
                      label: 'Hylkää',
                      variant: 'outline',
                      onClick: (note) => onUpdateRiskFlag(riskFlag.id, {
                        reviewStatus: 'dismissed',
                        reviewNote: note || null,
                        resolutionStatus: 'wont_fix',
                        resolutionNote: note || null,
                      }),
                    },
                  ] : []}
                />
                <ResultEvidencePreview evidence={getTargetEvidence('risk_flag', riskFlag.id)} documentNameById={documentNameById} />
              </div>
            );
          })}
        </ResultCard>

        <ResultCard
          icon={Sparkle}
          title="Referenssiehdotukset"
          description="Deterministinen reference matching lukee baseline-analyysin referenssivaatimukset ja vertaa niitä organisaation omaan referenssikorpukseen ilman AI:ta. Jokainen ehdotus sidotaan vaatimukseen, perustellaan läpinäkyvästi ja käsitellään review workflow’n kautta."
          countLabel={formatWorkflowCountLabel(selectedPackage.results.referenceSuggestions.length, filteredReferenceSuggestions.length, 'ehdotus')}
          emptyMessage={filter === 'all'
            ? referenceRequirements.length > 0
              ? 'Paketti sisältää referenssivaatimuksia, mutta nykyisestä org-korpuksesta ei löytynyt vielä riittävän vahvaa determinististä osumaa. Lisää referenssiprofiileja tai päivitä ehdotukset uudelleen.'
              : 'Tähän pakettiin ei ole vielä tunnistettu sellaista referenssivaatimusta, jolle deterministinen org-korpusmatchaus voisi tuottaa ehdotuksia.'
            : filteredEmptyMessage}
          hasItems={filteredReferenceSuggestions.length > 0}
          headerAction={onRecomputeReferenceSuggestions ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={recomputingReferenceSuggestions}
              onClick={() => {
                void onRecomputeReferenceSuggestions();
              }}
            >
              {recomputingReferenceSuggestions ? 'Päivitetään...' : 'Päivitä corpuksesta'}
            </Button>
          ) : undefined}
        >
          {filteredReferenceSuggestions.map((suggestion) => {
            const sourceMeta = TENDER_REFERENCE_SOURCE_META[suggestion.sourceType];
            const relatedRequirement = suggestion.relatedRequirementId ? requirementById.get(suggestion.relatedRequirementId) : null;
            const sourceProfileLabel = suggestion.sourceType === 'organization_reference_profile'
              ? referenceProfileTitleById[suggestion.sourceReference ?? ''] ?? suggestion.title
              : suggestion.sourceReference;

            return (
              <div key={suggestion.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={sourceMeta.variant}>{sourceMeta.label}</Badge>
                  <Badge variant={TENDER_REVIEW_STATUS_META[suggestion.reviewStatus].variant}>{TENDER_REVIEW_STATUS_META[suggestion.reviewStatus].label}</Badge>
                  <Badge variant={TENDER_RESOLUTION_STATUS_META[suggestion.resolutionStatus].variant}>{TENDER_RESOLUTION_STATUS_META[suggestion.resolutionStatus].label}</Badge>
                  <Badge variant="outline">Luottamus {formatTenderConfidence(suggestion.confidence)}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-950">{suggestion.title}</p>
                {relatedRequirement && <p className="mt-2 text-xs leading-5 text-muted-foreground">Liittyy vaatimukseen: {relatedRequirement.title}</p>}
                {sourceProfileLabel && <p className="mt-2 text-xs leading-5 text-muted-foreground">Corpus-lähde: {sourceProfileLabel}</p>}
                {suggestion.rationale && <p className="mt-2 text-sm leading-6 text-slate-700">{suggestion.rationale}</p>}
                <ResultWorkflowControls
                  workflowKey={`reference_suggestion:${suggestion.id}`}
                  reviewStatus={suggestion.reviewStatus}
                  reviewNote={suggestion.reviewNote}
                  reviewedByUserId={suggestion.reviewedByUserId}
                  reviewedAt={suggestion.reviewedAt}
                  resolutionStatus={suggestion.resolutionStatus}
                  resolutionNote={suggestion.resolutionNote}
                  resolvedByUserId={suggestion.resolvedByUserId}
                  resolvedAt={suggestion.resolvedAt}
                  currentUserId={currentUserId}
                  actorNameById={actorNameById}
                  updatingTargetIds={updatingTargetIds}
                  actions={onUpdateReferenceSuggestion ? [
                    {
                      id: 'accept',
                      label: 'Hyväksy ehdotus',
                      variant: 'default',
                      onClick: (note) => onUpdateReferenceSuggestion(suggestion.id, {
                        reviewStatus: 'accepted',
                        reviewNote: note || null,
                        resolutionStatus: 'resolved',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'dismiss',
                      label: 'Hylkää ehdotus',
                      variant: 'outline',
                      onClick: (note) => onUpdateReferenceSuggestion(suggestion.id, {
                        reviewStatus: 'dismissed',
                        reviewNote: note || null,
                        resolutionStatus: 'wont_fix',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'needs-attention',
                      label: 'Vaatii huomiota',
                      variant: 'destructive',
                      onClick: (note) => onUpdateReferenceSuggestion(suggestion.id, {
                        reviewStatus: 'needs_attention',
                        reviewNote: note || null,
                        resolutionStatus: 'open',
                        resolutionNote: note || null,
                      }),
                    },
                  ] : []}
                />
                <ResultEvidencePreview evidence={getTargetEvidence('reference_suggestion', suggestion.id)} documentNameById={documentNameById} />
              </div>
            );
          })}
        </ResultCard>

        <ResultCard
          icon={FileText}
          title="Luonnosartefaktit"
          description="Luonnosartefaktit säilyvät omassa result-domainissaan, mutta Phase 9 lisää niille workflow-metadatan eikä vielä siirry generointiin tai tarjouseditori-integraatioon."
          countLabel={formatWorkflowCountLabel(selectedPackage.results.draftArtifacts.length, filteredDraftArtifacts.length, 'artefakti')}
          emptyMessage={filter === 'all' ? 'Luonnosartefaktit jätetään tarkoituksella myöhempään vaiheeseen, jotta baseline pysyy deterministisenä analyysina eikä siirry vielä generointiin.' : filteredEmptyMessage}
          hasItems={filteredDraftArtifacts.length > 0}
        >
          {filteredDraftArtifacts.map((artifact) => {
            const typeMeta = TENDER_DRAFT_ARTIFACT_TYPE_META[artifact.artifactType];
            const statusMeta = TENDER_DRAFT_ARTIFACT_STATUS_META[artifact.status];

            return (
              <div key={artifact.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                  <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  <Badge variant={TENDER_REVIEW_STATUS_META[artifact.reviewStatus].variant}>{TENDER_REVIEW_STATUS_META[artifact.reviewStatus].label}</Badge>
                  <Badge variant={TENDER_RESOLUTION_STATUS_META[artifact.resolutionStatus].variant}>{TENDER_RESOLUTION_STATUS_META[artifact.resolutionStatus].label}</Badge>
                  <Badge variant="outline">Päivitetty {formatTenderTimestamp(artifact.updatedAt)}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-950">{artifact.title}</p>
                {artifact.contentMd && <p className="mt-2 text-sm leading-6 text-slate-700">{getTenderTextPreview(artifact.contentMd, 220)}</p>}
                <ResultWorkflowControls
                  workflowKey={`draft_artifact:${artifact.id}`}
                  reviewStatus={artifact.reviewStatus}
                  reviewNote={artifact.reviewNote}
                  reviewedByUserId={artifact.reviewedByUserId}
                  reviewedAt={artifact.reviewedAt}
                  resolutionStatus={artifact.resolutionStatus}
                  resolutionNote={artifact.resolutionNote}
                  resolvedByUserId={artifact.resolvedByUserId}
                  resolvedAt={artifact.resolvedAt}
                  currentUserId={currentUserId}
                  actorNameById={actorNameById}
                  updatingTargetIds={updatingTargetIds}
                />
                <ResultEvidencePreview evidence={getTargetEvidence('draft_artifact', artifact.id)} documentNameById={documentNameById} />
              </div>
            );
          })}
        </ResultCard>

        <ResultCard
          icon={Note}
          title="Tarkistustehtävät"
          description="Review task -domain on nyt oikea workflow-kerros: baseline nostaa epäselvät kohdat tehtäviksi, ja käyttäjä voi ottaa ne omalle vastuulleen, siirtää työn alle ja merkitä ratkaistuiksi ilman raskasta erillistä workflow-engineä."
          countLabel={formatWorkflowCountLabel(selectedPackage.results.reviewTasks.length, filteredReviewTasks.length, 'tehtävä')}
          emptyMessage={filter === 'all' ? 'Tarkistustehtävät luodaan tähän ensimmäisen completed-ajon yhteydessä aina kun sääntö löytää tärkeän mutta epäselvän osuman tai tarvitsee ihmisen varmistuksen.' : filteredEmptyMessage}
          hasItems={filteredReviewTasks.length > 0}
        >
          {filteredReviewTasks.map((task) => {
            const typeMeta = TENDER_REVIEW_TASK_TYPE_META[task.taskType];
            const legacyStatusMeta = TENDER_REVIEW_TASK_STATUS_META[task.status];

            return (
              <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                  <Badge variant={legacyStatusMeta.variant}>{legacyStatusMeta.label}</Badge>
                  <Badge variant={TENDER_REVIEW_STATUS_META[task.reviewStatus].variant}>{TENDER_REVIEW_STATUS_META[task.reviewStatus].label}</Badge>
                  <Badge variant={TENDER_RESOLUTION_STATUS_META[task.resolutionStatus].variant}>{TENDER_RESOLUTION_STATUS_META[task.resolutionStatus].label}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-950">{task.title}</p>
                {task.description && <p className="mt-2 text-sm leading-6 text-slate-700">{task.description}</p>}
                <ResultWorkflowControls
                  workflowKey={`review_task:${task.id}`}
                  reviewStatus={task.reviewStatus}
                  reviewNote={task.reviewNote}
                  reviewedByUserId={task.reviewedByUserId}
                  reviewedAt={task.reviewedAt}
                  resolutionStatus={task.resolutionStatus}
                  resolutionNote={task.resolutionNote}
                  resolvedByUserId={task.resolvedByUserId}
                  resolvedAt={task.resolvedAt}
                  assignedToUserId={task.assignedToUserId}
                  currentUserId={currentUserId}
                  actorNameById={actorNameById}
                  updatingTargetIds={updatingTargetIds}
                  actions={onUpdateReviewTask ? [
                    {
                      id: 'open',
                      label: 'Avaa',
                      variant: 'outline',
                      onClick: (note) => onUpdateReviewTask(task.id, {
                        reviewStatus: 'needs_attention',
                        reviewNote: note || null,
                        resolutionStatus: 'open',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'in-progress',
                      label: 'Työn alla',
                      variant: 'secondary',
                      onClick: (note) => onUpdateReviewTask(task.id, {
                        reviewStatus: 'needs_attention',
                        reviewNote: note || null,
                        resolutionStatus: 'in_progress',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'resolved',
                      label: 'Ratkaistu',
                      variant: 'default',
                      onClick: (note) => onUpdateReviewTask(task.id, {
                        reviewStatus: 'accepted',
                        reviewNote: note || null,
                        resolutionStatus: 'resolved',
                        resolutionNote: note || null,
                      }),
                    },
                    {
                      id: 'wont-fix',
                      label: 'Ei tehdä',
                      variant: 'outline',
                      onClick: (note) => onUpdateReviewTask(task.id, {
                        reviewStatus: 'dismissed',
                        reviewNote: note || null,
                        resolutionStatus: 'wont_fix',
                        resolutionNote: note || null,
                      }),
                    },
                  ] : []}
                  onAssignToMe={
                    onUpdateReviewTask && currentUserId
                      ? () => onUpdateReviewTask(task.id, { assignedToUserId: currentUserId })
                      : undefined
                  }
                />
                <ResultEvidencePreview evidence={getTargetEvidence('review_task', task.id)} documentNameById={documentNameById} />
              </div>
            );
          })}
        </ResultCard>
      </div>
    </div>
  );
}