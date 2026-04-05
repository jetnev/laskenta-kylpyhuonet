import { FileText, ListChecks, Note, ShieldWarning, Sparkle, WarningCircle } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  TENDER_REVIEW_TASK_STATUS_META,
  TENDER_REVIEW_TASK_TYPE_META,
  TENDER_RISK_FLAG_STATUS_META,
  TENDER_RISK_TYPE_META,
  TENDER_SEVERITY_META,
} from '../lib/tender-intelligence-ui';
import type { TenderPackageDetails } from '../types/tender-intelligence';

interface ResultCardProps {
  icon: typeof Note;
  title: string;
  description: string;
  countLabel: string;
  emptyMessage: string;
  hasItems: boolean;
  children: React.ReactNode;
}

interface ResultEvidencePreviewProps {
  evidence: TenderPackageDetails['resultEvidence'];
  documentNameById: Map<string, string>;
}

function ResultCard({
  icon: Icon,
  title,
  description,
  countLabel,
  emptyMessage,
  hasItems,
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
          <Badge variant="outline">{countLabel}</Badge>
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

export default function TenderResultPanels({ selectedPackage }: { selectedPackage: TenderPackageDetails }) {
  const documentNameById = new Map(selectedPackage.documents.map((document) => [document.id, document.fileName]));
  const evidenceByTarget = new Map<string, TenderPackageDetails['resultEvidence']>();

  selectedPackage.resultEvidence.forEach((item) => {
    const key = `${item.targetEntityType}:${item.targetEntityId}`;
    const current = evidenceByTarget.get(key) ?? [];
    current.push(item);
    evidenceByTarget.set(key, current);
  });

  const getTargetEvidence = (targetEntityType: string, targetEntityId: string) =>
    evidenceByTarget.get(`${targetEntityType}:${targetEntityId}`) ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ResultCard
        icon={ListChecks}
        title="Vaatimukset"
        description="Pysyvä vaatimusdomain tallentaa placeholder-rivit nyt omiin result-tauluihinsa ilman yhteyttä nykyiseen tarjouseditoriin."
        countLabel={formatCountLabel(selectedPackage.results.requirements.length, 'vaatimus')}
        emptyMessage="Ensimmäinen completed-analyysi kirjoittaa tähän vaatimusrungon omiin result-tauluihinsa."
        hasItems={selectedPackage.results.requirements.length > 0}
      >
        {selectedPackage.results.requirements.map((requirement) => {
          const typeMeta = TENDER_REQUIREMENT_TYPE_META[requirement.requirementType];
          const statusMeta = TENDER_REQUIREMENT_STATUS_META[requirement.status];

          return (
            <div key={requirement.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                <Badge variant="outline">Luottamus {formatTenderConfidence(requirement.confidence)}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-950">{requirement.title}</p>
              {requirement.description && <p className="mt-2 text-sm leading-6 text-slate-700">{requirement.description}</p>}
              {requirement.sourceExcerpt && <p className="mt-2 text-xs leading-5 text-muted-foreground">{requirement.sourceExcerpt}</p>}
              <ResultEvidencePreview evidence={getTargetEvidence('requirement', requirement.id)} documentNameById={documentNameById} />
            </div>
          );
        })}
      </ResultCard>

      <ResultCard
        icon={WarningCircle}
        title="Puutteet"
        description="Puutelista käyttää nyt omaa persistenttiä result-domainia ja näkyy suoraan paketin työtilassa completed-ajon jälkeen."
        countLabel={formatCountLabel(selectedPackage.results.missingItems.length, 'puute')}
        emptyMessage="Puutteet syntyvät placeholder-ajon mukana vasta kun analyysi on viety completed-tilaan."
        hasItems={selectedPackage.results.missingItems.length > 0}
      >
        {selectedPackage.results.missingItems.map((item) => {
          const typeMeta = TENDER_MISSING_ITEM_TYPE_META[item.itemType];
          const statusMeta = TENDER_MISSING_ITEM_STATUS_META[item.status];
          const severityMeta = TENDER_SEVERITY_META[item.severity];

          return (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                <Badge variant={severityMeta.variant}>{severityMeta.label}</Badge>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-950">{item.title}</p>
              {item.description && <p className="mt-2 text-sm leading-6 text-slate-700">{item.description}</p>}
              <ResultEvidencePreview evidence={getTargetEvidence('missing_item', item.id)} documentNameById={documentNameById} />
            </div>
          );
        })}
      </ResultCard>

      <ResultCard
        icon={ShieldWarning}
        title="Riskit"
        description="Riskihavainnot kirjoitetaan nyt omiin riveihinsä, vaikka sisältö on vielä determinististä placeholder-dataa."
        countLabel={formatCountLabel(selectedPackage.results.riskFlags.length, 'riski')}
        emptyMessage="Riskit näkyvät tässä kun ensimmäinen placeholder-analyysi on tallentanut tulokset pysyviin result-tauluihin."
        hasItems={selectedPackage.results.riskFlags.length > 0}
      >
        {selectedPackage.results.riskFlags.map((riskFlag) => {
          const typeMeta = TENDER_RISK_TYPE_META[riskFlag.riskType];
          const severityMeta = TENDER_SEVERITY_META[riskFlag.severity];
          const statusMeta = TENDER_RISK_FLAG_STATUS_META[riskFlag.status];

          return (
            <div key={riskFlag.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                <Badge variant={severityMeta.variant}>{severityMeta.label}</Badge>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-950">{riskFlag.title}</p>
              {riskFlag.description && <p className="mt-2 text-sm leading-6 text-slate-700">{riskFlag.description}</p>}
              <ResultEvidencePreview evidence={getTargetEvidence('risk_flag', riskFlag.id)} documentNameById={documentNameById} />
            </div>
          );
        })}
      </ResultCard>

      <ResultCard
        icon={Sparkle}
        title="Referenssiehdotukset"
        description="Referenssidomain on nyt oma persistentti osionsa, vaikka ehdotukset tuotetaan vielä hallitusta placeholder-mallista."
        countLabel={formatCountLabel(selectedPackage.results.referenceSuggestions.length, 'ehdotus')}
        emptyMessage="Referenssiehdotukset ilmestyvät tähän vasta ensimmäisen completed-placeholder-ajon jälkeen."
        hasItems={selectedPackage.results.referenceSuggestions.length > 0}
      >
        {selectedPackage.results.referenceSuggestions.map((suggestion) => {
          const sourceMeta = TENDER_REFERENCE_SOURCE_META[suggestion.sourceType];

          return (
            <div key={suggestion.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={sourceMeta.variant}>{sourceMeta.label}</Badge>
                <Badge variant="outline">Luottamus {formatTenderConfidence(suggestion.confidence)}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-950">{suggestion.title}</p>
              {suggestion.sourceReference && <p className="mt-2 text-xs leading-5 text-muted-foreground">Lähde: {suggestion.sourceReference}</p>}
              {suggestion.rationale && <p className="mt-2 text-sm leading-6 text-slate-700">{suggestion.rationale}</p>}
              <ResultEvidencePreview evidence={getTargetEvidence('reference_suggestion', suggestion.id)} documentNameById={documentNameById} />
            </div>
          );
        })}
      </ResultCard>

      <ResultCard
        icon={FileText}
        title="Luonnosartefaktit"
        description="Luonnosartefaktit tulevat nyt oikeasta result-domainista. Sisältö on vielä placeholder-markdownia eikä oikeaa generoitua tarjousta."
        countLabel={formatCountLabel(selectedPackage.results.draftArtifacts.length, 'artefakti')}
        emptyMessage="Ensimmäinen completed-ajon placeholder-runko näkyy tässä markdown-pohjaisena artefaktina."
        hasItems={selectedPackage.results.draftArtifacts.length > 0}
      >
        {selectedPackage.results.draftArtifacts.map((artifact) => {
          const typeMeta = TENDER_DRAFT_ARTIFACT_TYPE_META[artifact.artifactType];
          const statusMeta = TENDER_DRAFT_ARTIFACT_STATUS_META[artifact.status];

          return (
            <div key={artifact.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                <Badge variant="outline">Päivitetty {formatTenderTimestamp(artifact.updatedAt)}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-950">{artifact.title}</p>
              {artifact.contentMd && <p className="mt-2 text-sm leading-6 text-slate-700">{getTenderTextPreview(artifact.contentMd, 220)}</p>}
              <ResultEvidencePreview evidence={getTargetEvidence('draft_artifact', artifact.id)} documentNameById={documentNameById} />
            </div>
          );
        })}
      </ResultCard>

      <ResultCard
        icon={Note}
        title="Tarkistustehtävät"
        description="Review task -domain toimii nyt oikeista riveistä, joita placeholder-analyysi kirjoittaa completion-vaiheessa."
        countLabel={formatCountLabel(selectedPackage.results.reviewTasks.length, 'tehtävä')}
        emptyMessage="Tarkistustehtävät luodaan tähän ensimmäisen completed-ajon yhteydessä."
        hasItems={selectedPackage.results.reviewTasks.length > 0}
      >
        {selectedPackage.results.reviewTasks.map((task) => {
          const typeMeta = TENDER_REVIEW_TASK_TYPE_META[task.taskType];
          const statusMeta = TENDER_REVIEW_TASK_STATUS_META[task.status];

          return (
            <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-950">{task.title}</p>
              {task.description && <p className="mt-2 text-sm leading-6 text-slate-700">{task.description}</p>}
              <ResultEvidencePreview evidence={getTargetEvidence('review_task', task.id)} documentNameById={documentNameById} />
            </div>
          );
        })}
      </ResultCard>
    </div>
  );
}