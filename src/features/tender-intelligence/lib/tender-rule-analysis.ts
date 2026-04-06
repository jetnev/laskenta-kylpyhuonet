export type TenderRuleAnalysisTargetEntityType = 'requirement' | 'missing_item' | 'review_task' | 'risk_flag';
export type TenderRuleAnalysisCategory = 'deadline' | 'mandatory_attachment' | 'reference_requirement' | 'review' | 'fallback';
export type TenderRequirementType = 'administrative' | 'commercial' | 'technical' | 'schedule' | 'legal' | 'other';
export type TenderRequirementStatus = 'unreviewed' | 'covered' | 'missing' | 'at-risk';
export type TenderMissingItemType = 'clarification' | 'document' | 'pricing' | 'resourcing' | 'decision' | 'other';
export type TenderMissingItemStatus = 'open' | 'resolved';
export type TenderSeverity = 'high' | 'medium' | 'low';
export type TenderRiskType = 'commercial' | 'delivery' | 'technical' | 'legal' | 'resourcing' | 'other';
export type TenderRiskFlagStatus = 'open' | 'accepted' | 'mitigated';
export type TenderReviewTaskType = 'documents' | 'requirements' | 'risk' | 'decision' | 'draft';
export type TenderReviewTaskStatus = 'todo' | 'in-review' | 'done';
export type TenderGoNoGoRecommendation = 'pending' | 'go' | 'conditional-go' | 'no-go';
export type TenderReferenceSuggestionSourceType = 'quote' | 'project' | 'document-template' | 'manual';
export type TenderDraftArtifactType = 'quote-outline' | 'response-summary' | 'clarification-list';
export type TenderDraftArtifactStatus = 'placeholder' | 'ready-for-review' | 'accepted';

export interface TenderRuleAnalysisDocumentInput {
  documentId: string;
  fileName: string;
}

export interface TenderRuleAnalysisChunkInput {
  chunkId: string;
  documentId: string;
  extractionId: string;
  chunkIndex: number;
  textContent: string;
}

export type TenderRuleAnalysisProviderDeliveryScope = 'local' | 'regional' | 'national' | 'international';
export type TenderRuleAnalysisProviderCredentialType = 'certificate' | 'qualification' | 'insurance' | 'license' | 'other';
export type TenderRuleAnalysisProviderConstraintSeverity = 'hard' | 'soft' | 'info';
export type TenderRuleAnalysisProviderDocumentType = 'case-study' | 'certificate' | 'insurance' | 'cv' | 'policy' | 'other';
export type TenderRuleAnalysisProviderResponseTemplateType =
  | 'company-overview'
  | 'technical-approach'
  | 'delivery-plan'
  | 'pricing-note'
  | 'quality'
  | 'other';

export interface TenderRuleAnalysisProviderProfileInput {
  companyName: string;
  summary: string | null;
  serviceArea: string | null;
  maxTravelKm: number | null;
  deliveryScope: TenderRuleAnalysisProviderDeliveryScope;
}

export interface TenderRuleAnalysisProviderCredentialInput {
  title: string;
  issuer: string | null;
  credentialType: TenderRuleAnalysisProviderCredentialType;
  validUntil: string | null;
  documentReference: string | null;
  notes: string | null;
}

export interface TenderRuleAnalysisProviderConstraintInput {
  title: string;
  severity: TenderRuleAnalysisProviderConstraintSeverity;
  ruleText: string;
  mitigationNote: string | null;
}

export interface TenderRuleAnalysisProviderDocumentInput {
  title: string;
  documentType: TenderRuleAnalysisProviderDocumentType;
  sourceReference: string | null;
  notes: string | null;
}

export interface TenderRuleAnalysisProviderResponseTemplateInput {
  title: string;
  templateType: TenderRuleAnalysisProviderResponseTemplateType;
}

export interface TenderRuleAnalysisProviderProfileDetailsInput {
  profile: TenderRuleAnalysisProviderProfileInput;
  credentials: TenderRuleAnalysisProviderCredentialInput[];
  constraints: TenderRuleAnalysisProviderConstraintInput[];
  documents: TenderRuleAnalysisProviderDocumentInput[];
  responseTemplates: TenderRuleAnalysisProviderResponseTemplateInput[];
}

export interface TenderResultEvidenceLinkSeed {
  sourceIndex: number;
  confidence: number | null;
  matchedRule: string;
}

export interface TenderEvidenceSourceSeed {
  documentId: string;
  extractionId: string;
  chunkId: string;
  documentFileName: string;
  chunkIndex: number;
  excerptText: string;
  locatorText: string;
}

interface TenderSeedWithEvidence {
  evidenceLinks: TenderResultEvidenceLinkSeed[];
}

export interface TenderRequirementSeed extends TenderSeedWithEvidence {
  sourceDocumentId: string | null;
  requirementType: TenderRequirementType;
  title: string;
  description: string | null;
  status: TenderRequirementStatus;
  confidence: number | null;
  sourceExcerpt: string | null;
}

export interface TenderMissingItemSeed extends TenderSeedWithEvidence {
  relatedRequirementIndex: number | null;
  itemType: TenderMissingItemType;
  title: string;
  description: string | null;
  severity: TenderSeverity;
  status: TenderMissingItemStatus;
}

export interface TenderRiskFlagSeed extends TenderSeedWithEvidence {
  riskType: TenderRiskType;
  title: string;
  description: string | null;
  severity: TenderSeverity;
  status: TenderRiskFlagStatus;
}

export interface TenderReferenceSuggestionSeed extends TenderSeedWithEvidence {
  sourceType: TenderReferenceSuggestionSourceType;
  sourceReference: string | null;
  title: string;
  rationale: string | null;
  confidence: number | null;
}

export interface TenderDraftArtifactSeed extends TenderSeedWithEvidence {
  artifactType: TenderDraftArtifactType;
  title: string;
  contentMd: string | null;
  status: TenderDraftArtifactStatus;
}

export interface TenderReviewTaskSeed extends TenderSeedWithEvidence {
  taskType: TenderReviewTaskType;
  title: string;
  description: string | null;
  status: TenderReviewTaskStatus;
}

export interface TenderRuleAnalysisMatch {
  id: string;
  matchedRule: string;
  category: TenderRuleAnalysisCategory;
  targetEntityType: TenderRuleAnalysisTargetEntityType;
  title: string;
  description: string | null;
  status: string | null;
  severity: TenderSeverity | null;
  evidenceChunkId: string;
  evidenceExcerpt: string;
  confidence: number | null;
  normalizedValue: string | null;
}

export interface TenderDeterministicAnalysisPlan {
  goNoGoAssessment: {
    recommendation: TenderGoNoGoRecommendation;
    summary: string;
    confidence: number | null;
  };
  evidenceSources: TenderEvidenceSourceSeed[];
  ruleMatches: TenderRuleAnalysisMatch[];
  requirements: TenderRequirementSeed[];
  missingItems: TenderMissingItemSeed[];
  riskFlags: TenderRiskFlagSeed[];
  referenceSuggestions: TenderReferenceSuggestionSeed[];
  draftArtifacts: TenderDraftArtifactSeed[];
  reviewTasks: TenderReviewTaskSeed[];
}

interface PatternRule {
  ruleId: string;
  pattern: RegExp;
}

interface AttachmentRuleDefinition {
  key: string;
  matchedRule: string;
  patterns: RegExp[];
  documentAliases: string[];
  requirementTitle: string;
  missingItemTitle: string;
  providerProfileLabel: string;
  providerDocumentTypes?: TenderRuleAnalysisProviderDocumentType[];
  providerCredentialTypes?: TenderRuleAnalysisProviderCredentialType[];
}

interface RuleContext {
  evidenceSources: TenderEvidenceSourceSeed[];
  evidenceSourceIndexByChunkId: Map<string, number>;
  packageDocumentNames: string[];
  providerProfile: TenderRuleAnalysisProviderProfileDetailsInput | null;
  providerCoveredRequirementKeys: Set<string>;
  providerMissingRequirementKeys: Set<string>;
  ruleMatches: TenderRuleAnalysisMatch[];
  requirements: RequirementAccumulator[];
  requirementIndexByKey: Map<string, number>;
  missingItems: MissingItemAccumulator[];
  missingItemIndexByKey: Map<string, number>;
  reviewTasks: ReviewTaskAccumulator[];
  reviewTaskIndexByKey: Map<string, number>;
  riskFlags: RiskFlagAccumulator[];
  riskFlagIndexByKey: Map<string, number>;
}

interface RequirementAccumulator extends TenderRequirementSeed {
  dedupeKey: string;
}

interface MissingItemAccumulator extends Omit<TenderMissingItemSeed, 'relatedRequirementIndex'> {
  dedupeKey: string;
  relatedRequirementKey: string | null;
}

interface ReviewTaskAccumulator extends TenderReviewTaskSeed {
  dedupeKey: string;
}

interface RiskFlagAccumulator extends TenderRiskFlagSeed {
  dedupeKey: string;
}

const DEADLINE_RULES: PatternRule[] = [
  { ruleId: 'deadline.maaraaika', pattern: /\bmääräaika\b/i },
  { ruleId: 'deadline.viimeistaan', pattern: /\bviimeistään\b/i },
  { ruleId: 'deadline.tarjouksen_viimeinen_jattopaiva', pattern: /tarjouksen\s+viimeinen\s+jättöpäivä/i },
  { ruleId: 'deadline.tarjoukset_tulee_toimittaa', pattern: /tarjoukset\s+tulee\s+toimittaa/i },
  { ruleId: 'deadline.tarjousten_jattoaika', pattern: /tarjousten\s+jättöaika/i },
  { ruleId: 'deadline.tarjous_on_jatettava', pattern: /tarjous\s+on\s+jätettävä/i },
];

const GENERIC_ATTACHMENT_RULES: PatternRule[] = [
  { ruleId: 'attachment.pakollinen_liite', pattern: /pakollis(?:en|et)\s+liitte?/i },
  { ruleId: 'attachment.tulee_liittaa', pattern: /tulee\s+liittää/i },
  { ruleId: 'attachment.liitteet_tulee_toimittaa', pattern: /liitteet\s+tulee\s+toimittaa/i },
  { ruleId: 'attachment.liitteet_on_toimitettava', pattern: /liitteet\s+on\s+toimitettava/i },
];

const ATTACHMENT_RULES: AttachmentRuleDefinition[] = [
  {
    key: 'tilaajavastuu',
    matchedRule: 'attachment.tilaajavastuu',
    patterns: [/tilaajavastuu/i, /tilaajavastuu\s*selvitys/i],
    documentAliases: ['tilaajavastuu', 'tilaajavastuuselvitys'],
    requirementTitle: 'Toimita tilaajavastuu-asiakirjat',
    missingItemTitle: 'Tilaajavastuu-asiakirjat puuttuvat paketista',
    providerProfileLabel: 'tilaajavastuuta vastaavaa aineistoa',
  },
  {
    key: 'verovelkatodistus',
    matchedRule: 'attachment.verovelkatodistus',
    patterns: [/verovelkatodistus/i, /verovelka(?:todistus|selvitys)/i],
    documentAliases: ['verovelka', 'verovelkatodistus'],
    requirementTitle: 'Toimita verovelkatodistus',
    missingItemTitle: 'Verovelkatodistus puuttuu paketista',
    providerProfileLabel: 'verovelkatodistusta vastaavaa aineistoa',
  },
  {
    key: 'vastuuvakuutus',
    matchedRule: 'attachment.vastuuvakuutus',
    patterns: [/vastuuvakuutus/i, /vastuuvakuutustodistus/i],
    documentAliases: ['vastuuvakuutus', 'vastuuvakuutustodistus', 'vakuutustodistus'],
    requirementTitle: 'Toimita vastuuvakuutustodistus',
    missingItemTitle: 'Vastuuvakuutustodistus puuttuu paketista',
    providerProfileLabel: 'vastuuvakuutusta vastaavaa aineistoa',
    providerDocumentTypes: ['insurance'],
    providerCredentialTypes: ['insurance'],
  },
  {
    key: 'referenssiluettelo',
    matchedRule: 'attachment.referenssiluettelo',
    patterns: [/referenssiluettelo/i],
    documentAliases: ['referenssiluettelo', 'referenssit'],
    requirementTitle: 'Toimita referenssiluettelo',
    missingItemTitle: 'Referenssiluettelo puuttuu paketista',
    providerProfileLabel: 'referenssiaineistoa',
    providerDocumentTypes: ['case-study'],
  },
  {
    key: 'cv',
    matchedRule: 'attachment.cv',
    patterns: [/\bcv\b/i, /ansioluettelo/i],
    documentAliases: ['cv', 'ansioluettelo'],
    requirementTitle: 'Toimita CV:t tai ansioluettelot',
    missingItemTitle: 'CV:t tai ansioluettelot puuttuvat paketista',
    providerProfileLabel: 'cv-aineistoa tai ansioluetteloita',
    providerDocumentTypes: ['cv'],
  },
];

const REFERENCE_RULES: PatternRule[] = [
  { ruleId: 'reference.referenssi', pattern: /\breferenss\w*\b/i },
  { ruleId: 'reference.vastaavat_toimitukset', pattern: /vastaavat\s+toimitukset/i },
  { ruleId: 'reference.viimeisen_x_vuoden_aikana', pattern: /viimeisen\s+\d+\s+vuoden\s+aikana/i },
  { ruleId: 'reference.vastaava_kohde', pattern: /vastaava\s+kohde/i },
  { ruleId: 'reference.aikaisemmat_kohteet', pattern: /aikaisemmat\s+kohteet/i },
];

const DEADLINE_VALUE_PATTERN = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\s*(?:klo|kl\.)\s*\d{1,2}(?::|\.)\d{2})?\b/i;
const REFERENCE_WINDOW_PATTERN = /viimeisen\s+(\d+)\s+vuoden\s+aikana/i;

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeComparableText(value: string) {
  return compactWhitespace(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getMatchInfo(text: string, rules: PatternRule[]) {
  for (const rule of rules) {
    const match = rule.pattern.exec(text);

    if (match) {
      return {
        ruleId: rule.ruleId,
        index: match.index,
      };
    }
  }

  return null;
}

function getExcerptAroundMatch(text: string, matchIndex: number | null, maxLength = 220) {
  const normalizedText = compactWhitespace(text);

  if (!normalizedText) {
    return '';
  }

  if (matchIndex == null) {
    if (normalizedText.length <= maxLength) {
      return normalizedText;
    }

    return `${normalizedText.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
  }

  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(text.length, matchIndex + 160);
  const excerpt = compactWhitespace(text.slice(start, end));
  const prefix = start > 0 ? '... ' : '';
  const suffix = end < text.length ? ' ...' : '';
  const combined = `${prefix}${excerpt}${suffix}`.trim();

  if (combined.length <= maxLength) {
    return combined;
  }

  return `${combined.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function buildEvidenceSources(
  documentRows: TenderRuleAnalysisDocumentInput[],
  chunkRows: TenderRuleAnalysisChunkInput[],
) {
  const documentNameById = new Map(documentRows.map((row) => [row.documentId, row.fileName]));

  return [...chunkRows]
    .sort((left, right) => {
      const leftName = documentNameById.get(left.documentId) ?? '';
      const rightName = documentNameById.get(right.documentId) ?? '';

      return (
        leftName.localeCompare(rightName, 'fi-FI') ||
        left.chunkIndex - right.chunkIndex ||
        left.chunkId.localeCompare(right.chunkId, 'fi-FI')
      );
    })
    .map((chunkRow) => {
      const documentFileName = documentNameById.get(chunkRow.documentId) ?? 'Tuntematon dokumentti';

      return {
        documentId: chunkRow.documentId,
        extractionId: chunkRow.extractionId,
        chunkId: chunkRow.chunkId,
        documentFileName,
        chunkIndex: chunkRow.chunkIndex,
        excerptText: getExcerptAroundMatch(chunkRow.textContent, null),
        locatorText: `${documentFileName} / chunk ${chunkRow.chunkIndex + 1}`,
      } satisfies TenderEvidenceSourceSeed;
    });
}

function buildEvidenceLink(sourceIndex: number, confidence: number | null, matchedRule: string): TenderResultEvidenceLinkSeed {
  return {
    sourceIndex,
    confidence,
    matchedRule,
  };
}

function mergeEvidenceLinks(target: TenderResultEvidenceLinkSeed[], nextLink: TenderResultEvidenceLinkSeed) {
  const existing = target.find((item) => item.sourceIndex === nextLink.sourceIndex && item.matchedRule === nextLink.matchedRule);

  if (!existing) {
    target.push(nextLink);
    return;
  }

  if (existing.confidence == null || (nextLink.confidence ?? -1) > existing.confidence) {
    existing.confidence = nextLink.confidence;
  }
}

function recordRuleMatch(
  context: RuleContext,
  input: Omit<TenderRuleAnalysisMatch, 'id'>,
) {
  context.ruleMatches.push({
    id: `rule-match-${context.ruleMatches.length + 1}`,
    ...input,
  });
}

function upsertRequirement(
  context: RuleContext,
  input: {
    dedupeKey: string;
    matchedRule: string;
    sourceIndex: number;
    sourceDocumentId: string;
    evidenceChunkId: string;
    evidenceExcerpt: string;
    requirementType: TenderRequirementType;
    title: string;
    description: string | null;
    status: TenderRequirementStatus;
    confidence: number | null;
    normalizedValue: string | null;
  },
) {
  const nextLink = buildEvidenceLink(input.sourceIndex, input.confidence, input.matchedRule);
  const existingIndex = context.requirementIndexByKey.get(input.dedupeKey);

  if (existingIndex == null) {
    context.requirementIndexByKey.set(
      input.dedupeKey,
      context.requirements.push({
        dedupeKey: input.dedupeKey,
        sourceDocumentId: input.sourceDocumentId,
        requirementType: input.requirementType,
        title: input.title,
        description: input.description,
        status: input.status,
        confidence: input.confidence,
        sourceExcerpt: input.evidenceExcerpt,
        evidenceLinks: [nextLink],
      }) - 1,
    );
  } else {
    mergeEvidenceLinks(context.requirements[existingIndex].evidenceLinks, nextLink);
  }

  recordRuleMatch(context, {
    matchedRule: input.matchedRule,
    category:
      input.matchedRule.startsWith('deadline.')
        ? 'deadline'
        : input.matchedRule.startsWith('attachment.')
          ? 'mandatory_attachment'
          : 'reference_requirement',
    targetEntityType: 'requirement',
    title: input.title,
    description: input.description,
    status: input.status,
    severity: null,
    evidenceChunkId: input.evidenceChunkId,
    evidenceExcerpt: input.evidenceExcerpt,
    confidence: input.confidence,
    normalizedValue: input.normalizedValue,
  });
}

function upsertMissingItem(
  context: RuleContext,
  input: {
    dedupeKey: string;
    relatedRequirementKey: string | null;
    matchedRule: string;
    sourceIndex: number;
    evidenceChunkId: string;
    evidenceExcerpt: string;
    itemType: TenderMissingItemType;
    title: string;
    description: string | null;
    severity: TenderSeverity;
    status: TenderMissingItemStatus;
    confidence: number | null;
    normalizedValue: string | null;
  },
) {
  const nextLink = buildEvidenceLink(input.sourceIndex, input.confidence, input.matchedRule);
  const existingIndex = context.missingItemIndexByKey.get(input.dedupeKey);

  if (existingIndex == null) {
    context.missingItemIndexByKey.set(
      input.dedupeKey,
      context.missingItems.push({
        dedupeKey: input.dedupeKey,
        relatedRequirementKey: input.relatedRequirementKey,
        itemType: input.itemType,
        title: input.title,
        description: input.description,
        severity: input.severity,
        status: input.status,
        evidenceLinks: [nextLink],
      }) - 1,
    );
  } else {
    mergeEvidenceLinks(context.missingItems[existingIndex].evidenceLinks, nextLink);
  }

  recordRuleMatch(context, {
    matchedRule: input.matchedRule,
    category: 'mandatory_attachment',
    targetEntityType: 'missing_item',
    title: input.title,
    description: input.description,
    status: input.status,
    severity: input.severity,
    evidenceChunkId: input.evidenceChunkId,
    evidenceExcerpt: input.evidenceExcerpt,
    confidence: input.confidence,
    normalizedValue: input.normalizedValue,
  });
}

function upsertReviewTask(
  context: RuleContext,
  input: {
    dedupeKey: string;
    matchedRule: string;
    sourceIndex: number;
    evidenceChunkId: string;
    evidenceExcerpt: string;
    taskType: TenderReviewTaskType;
    title: string;
    description: string | null;
    status: TenderReviewTaskStatus;
    confidence: number | null;
    normalizedValue: string | null;
    category: TenderRuleAnalysisCategory;
  },
) {
  const nextLink = buildEvidenceLink(input.sourceIndex, input.confidence, input.matchedRule);
  const existingIndex = context.reviewTaskIndexByKey.get(input.dedupeKey);

  if (existingIndex == null) {
    context.reviewTaskIndexByKey.set(
      input.dedupeKey,
      context.reviewTasks.push({
        dedupeKey: input.dedupeKey,
        taskType: input.taskType,
        title: input.title,
        description: input.description,
        status: input.status,
        evidenceLinks: [nextLink],
      }) - 1,
    );
  } else {
    mergeEvidenceLinks(context.reviewTasks[existingIndex].evidenceLinks, nextLink);
  }

  recordRuleMatch(context, {
    matchedRule: input.matchedRule,
    category: input.category,
    targetEntityType: 'review_task',
    title: input.title,
    description: input.description,
    status: input.status,
    severity: null,
    evidenceChunkId: input.evidenceChunkId,
    evidenceExcerpt: input.evidenceExcerpt,
    confidence: input.confidence,
    normalizedValue: input.normalizedValue,
  });
}

function upsertRiskFlag(
  context: RuleContext,
  input: {
    dedupeKey: string;
    matchedRule: string;
    sourceIndex: number;
    evidenceChunkId: string;
    evidenceExcerpt: string;
    riskType: TenderRiskType;
    title: string;
    description: string | null;
    severity: TenderSeverity;
    status: TenderRiskFlagStatus;
    confidence: number | null;
    normalizedValue: string | null;
  },
) {
  const nextLink = buildEvidenceLink(input.sourceIndex, input.confidence, input.matchedRule);
  const existingIndex = context.riskFlagIndexByKey.get(input.dedupeKey);

  if (existingIndex == null) {
    context.riskFlagIndexByKey.set(
      input.dedupeKey,
      context.riskFlags.push({
        dedupeKey: input.dedupeKey,
        riskType: input.riskType,
        title: input.title,
        description: input.description,
        severity: input.severity,
        status: input.status,
        evidenceLinks: [nextLink],
      }) - 1,
    );
  } else {
    mergeEvidenceLinks(context.riskFlags[existingIndex].evidenceLinks, nextLink);
  }

  recordRuleMatch(context, {
    matchedRule: input.matchedRule,
    category: 'review',
    targetEntityType: 'risk_flag',
    title: input.title,
    description: input.description,
    status: input.status,
    severity: input.severity,
    evidenceChunkId: input.evidenceChunkId,
    evidenceExcerpt: input.evidenceExcerpt,
    confidence: input.confidence,
    normalizedValue: input.normalizedValue,
  });
}

function extractDeadlineValue(text: string) {
  const match = DEADLINE_VALUE_PATTERN.exec(text);
  return match ? compactWhitespace(match[0]) : null;
}

function extractReferenceWindow(text: string) {
  const match = REFERENCE_WINDOW_PATTERN.exec(text);

  if (!match?.[1]) {
    return null;
  }

  return `${match[1]} vuotta`;
}

function hasMatchingDocumentAlias(packageDocumentNames: string[], aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => normalizeComparableText(alias));

  return packageDocumentNames.some((fileName) =>
    normalizedAliases.some((alias) => Boolean(alias) && fileName.includes(alias)),
  );
}

function matchesNormalizedAliases(candidateText: string, aliases: string[]) {
  const normalizedCandidate = normalizeComparableText(candidateText);

  if (!normalizedCandidate) {
    return false;
  }

  return aliases.some((alias) => {
    const normalizedAlias = normalizeComparableText(alias);
    return Boolean(normalizedAlias) && normalizedCandidate.includes(normalizedAlias);
  });
}

function isProviderCredentialActive(
  credential: TenderRuleAnalysisProviderCredentialInput,
  now: Date,
) {
  if (!credential.validUntil) {
    return true;
  }

  const validUntil = new Date(credential.validUntil);

  if (Number.isNaN(validUntil.getTime())) {
    return true;
  }

  return validUntil.getTime() >= now.getTime();
}

function resolveProviderAttachmentSupport(
  definition: AttachmentRuleDefinition,
  providerProfile: TenderRuleAnalysisProviderProfileDetailsInput | null,
  now: Date,
) {
  if (!providerProfile) {
    return null;
  }

  const matchingCredential = providerProfile.credentials
    .filter((credential) => isProviderCredentialActive(credential, now))
    .find((credential) =>
      matchesNormalizedAliases(
        [credential.title, credential.issuer, credential.documentReference, credential.notes]
          .filter(Boolean)
          .join(' '),
        definition.documentAliases,
      )
      || Boolean(definition.providerCredentialTypes?.includes(credential.credentialType)),
    );

  const matchingDocument = providerProfile.documents.find((document) =>
    matchesNormalizedAliases(
      [document.title, document.sourceReference, document.notes]
        .filter(Boolean)
        .join(' '),
      definition.documentAliases,
    )
    || Boolean(definition.providerDocumentTypes?.includes(document.documentType)),
  );

  if (matchingCredential || matchingDocument) {
    const matchedSources = [
      matchingCredential ? `pätevyys "${matchingCredential.title}"` : null,
      matchingDocument ? `dokumenttiviite "${matchingDocument.title}"` : null,
    ].filter((value): value is string => Boolean(value));

    return {
      status: 'covered' as const,
      detail: `Tarjoajaprofiilista löytyi ${matchedSources.join(' ja ')}, joka tukee vaaditun liitteen toimittamista.`,
    };
  }

  return {
    status: 'missing' as const,
    detail: `Tarjoajaprofiilista ei löytynyt ${definition.providerProfileLabel} vastaavaa pätevyyttä tai dokumenttiviitettä.`,
  };
}

function analyzeDeadlineChunk(context: RuleContext, chunkRow: TenderRuleAnalysisChunkInput, matchIndex: number, matchedRule: string) {
  const sourceIndex = context.evidenceSourceIndexByChunkId.get(chunkRow.chunkId);

  if (sourceIndex == null) {
    return;
  }

  const evidenceExcerpt = getExcerptAroundMatch(chunkRow.textContent, matchIndex);
  const normalizedValue = extractDeadlineValue(chunkRow.textContent);
  const dedupeKey = `deadline:${normalizedValue ?? 'general'}`;
  const title = normalizedValue ? `Tarjouksen määräaika: ${normalizedValue}` : 'Tarkista tarjouksen määräaika';
  const description = normalizedValue
    ? 'Extracted chunkissa havaittiin tarjousajan määräpäivä. Vahvista, että määräaika kirjataan sisäiseen tarjousaikatauluun.'
    : 'Extracted chunkissa havaittiin tarjousajan määräaikaan viittaava kohta, mutta tarkkaa päivämäärää ei saatu poimittua luotettavasti.';
  const confidence = normalizedValue ? 0.88 : 0.71;

  upsertRequirement(context, {
    dedupeKey,
    matchedRule,
    sourceIndex,
    sourceDocumentId: chunkRow.documentId,
    evidenceChunkId: chunkRow.chunkId,
    evidenceExcerpt,
    requirementType: 'schedule',
    title,
    description,
    status: normalizedValue ? 'unreviewed' : 'at-risk',
    confidence,
    normalizedValue,
  });

  if (!normalizedValue) {
    upsertReviewTask(context, {
      dedupeKey: 'deadline:manual-review',
      matchedRule: 'deadline.manual_review',
      sourceIndex,
      evidenceChunkId: chunkRow.chunkId,
      evidenceExcerpt,
      taskType: 'requirements',
      title: 'Vahvista tarjouksen jättöaika manuaalisesti',
      description: 'Sääntöpohjainen baseline löysi määräaikaan viittaavan kohdan, mutta tarkka päivämäärä tai kellonaika jäi epäselväksi.',
      status: 'todo',
      confidence: 0.56,
      normalizedValue: null,
      category: 'review',
    });
  }
}

function analyzeAttachmentChunk(
  context: RuleContext,
  chunkRow: TenderRuleAnalysisChunkInput,
  genericMatch: { ruleId: string; index: number } | null,
  now: Date,
) {
  const sourceIndex = context.evidenceSourceIndexByChunkId.get(chunkRow.chunkId);

  if (sourceIndex == null) {
    return;
  }

  const matchingDefinitions = ATTACHMENT_RULES.flatMap((definition) => {
    const matched = definition.patterns
      .map((pattern) => pattern.exec(chunkRow.textContent))
      .find(Boolean);

    return matched
      ? [{ definition, matchIndex: matched.index }]
      : [];
  });

  if (matchingDefinitions.length === 0) {
    if (!genericMatch) {
      return;
    }

    const evidenceExcerpt = getExcerptAroundMatch(chunkRow.textContent, genericMatch.index);

    upsertRequirement(context, {
      dedupeKey: 'attachment:generic',
      matchedRule: genericMatch.ruleId,
      sourceIndex,
      sourceDocumentId: chunkRow.documentId,
      evidenceChunkId: chunkRow.chunkId,
      evidenceExcerpt,
      requirementType: 'administrative',
      title: 'Tarkista pakolliset liitteet',
      description: 'Extracted chunkissa havaittiin pakollisiin liitteisiin viittaava kohta. Varmista, että tarjousvastauksen liitteet kattavat kaikki pyydetyt dokumentit.',
      status: 'unreviewed',
      confidence: 0.66,
      normalizedValue: 'pakolliset-liitteet',
    });

    upsertReviewTask(context, {
      dedupeKey: 'attachment:generic-review',
      matchedRule: 'attachment.generic_review',
      sourceIndex,
      evidenceChunkId: chunkRow.chunkId,
      evidenceExcerpt,
      taskType: 'documents',
      title: 'Varmista pakollisten liitteiden täydellisyys',
      description: 'Sääntöpohjainen baseline nosti esiin liitevaatimuksen, mutta tarkka dokumenttilista vaatii ihmisen tarkistuksen.',
      status: 'todo',
      confidence: 0.54,
      normalizedValue: 'pakolliset-liitteet',
      category: 'review',
    });

    return;
  }

  matchingDefinitions.forEach(({ definition, matchIndex }) => {
    const evidenceExcerpt = getExcerptAroundMatch(chunkRow.textContent, matchIndex);
    const hasDocumentMatch = hasMatchingDocumentAlias(context.packageDocumentNames, definition.documentAliases);
    const providerSupport = resolveProviderAttachmentSupport(definition, context.providerProfile, now);
    const requirementKey = `attachment:${definition.key}`;
    const requirementStatus = providerSupport?.status === 'covered'
      ? 'covered'
      : hasDocumentMatch
        ? 'unreviewed'
        : 'missing';

    if (providerSupport?.status === 'covered') {
      context.providerCoveredRequirementKeys.add(requirementKey);
    } else if (context.providerProfile && !hasDocumentMatch) {
      context.providerMissingRequirementKeys.add(requirementKey);
    }

    upsertRequirement(context, {
      dedupeKey: requirementKey,
      matchedRule: definition.matchedRule,
      sourceIndex,
      sourceDocumentId: chunkRow.documentId,
      evidenceChunkId: chunkRow.chunkId,
      evidenceExcerpt,
      requirementType: 'administrative',
      title: definition.requirementTitle,
      description: providerSupport?.status === 'covered'
        ? `${providerSupport.detail} Varmista silti, että aineisto liitetään tarjoukseen pyydetyssä muodossa.`
        : hasDocumentMatch
          ? 'Pakettiin on jo liitetty nimellisesti vastaava dokumentti, mutta vaatimus tulee vielä tarkistaa manuaalisesti tarjouspyynnön sanamuotoa vasten.'
          : providerSupport
            ? `${providerSupport.detail} Extracted chunk mainitsee pakolliseksi tulkittavan liitteen, joten puute kannattaa käsitellä ennen editorivientiä.`
            : 'Extracted chunk mainitsee pakolliseksi tulkittavan liitteen. Paketin nykyisistä dokumenteista ei löytynyt nimellistä osumaa tälle liitteelle.',
      status: requirementStatus,
      confidence: providerSupport?.status === 'covered' ? 0.84 : hasDocumentMatch ? 0.76 : 0.82,
      normalizedValue: definition.key,
    });

    if (requirementStatus === 'missing') {
      upsertMissingItem(context, {
        dedupeKey: `missing-item:${definition.key}`,
        relatedRequirementKey: requirementKey,
        matchedRule: `${definition.matchedRule}.missing_item`,
        sourceIndex,
        evidenceChunkId: chunkRow.chunkId,
        evidenceExcerpt,
        itemType: 'document',
        title: definition.missingItemTitle,
        description: providerSupport
          ? `${providerSupport.detail} Sääntöpohjainen baseline löysi vaaditun liitteen extracted tekstistä, mutta tarjoajaprofiilista tai paketin dokumenttinimistä ei löytynyt selkeää vastinetta.`
          : 'Sääntöpohjainen baseline löysi vaaditun liitteen extracted tekstistä, mutta pakettiin liitetyistä dokumenteista ei löytynyt edes nimellistä vastinetta. Tarkista tarve manuaalisesti.',
        severity: 'medium',
        status: 'open',
        confidence: 0.74,
        normalizedValue: definition.key,
      });
    }
  });
}

function analyzeReferenceChunk(context: RuleContext, chunkRow: TenderRuleAnalysisChunkInput, matchIndex: number, matchedRule: string) {
  const sourceIndex = context.evidenceSourceIndexByChunkId.get(chunkRow.chunkId);

  if (sourceIndex == null) {
    return;
  }

  const evidenceExcerpt = getExcerptAroundMatch(chunkRow.textContent, matchIndex);
  const normalizedValue = extractReferenceWindow(chunkRow.textContent);
  const dedupeKey = `reference:${normalizedValue ?? 'general'}`;
  const title = normalizedValue
    ? `Esitä referenssit viimeisen ${normalizedValue.replace(' vuotta', '')} vuoden ajalta`
    : 'Esitä tarjouspyynnön mukaiset referenssit';
  const description = normalizedValue
    ? 'Extracted chunkissa havaittiin referenssivaatimus, jossa vaaditaan näyttöä tietyn aikajakson sisällä toteutetuista vastaavista toimituksista.'
    : 'Extracted chunkissa havaittiin referensseihin tai vastaaviin toimituksiin liittyvä vaatimus, jonka tarkka täyttymislogiikka vaatii ihmisen arvioinnin.';

  upsertRequirement(context, {
    dedupeKey,
    matchedRule,
    sourceIndex,
    sourceDocumentId: chunkRow.documentId,
    evidenceChunkId: chunkRow.chunkId,
    evidenceExcerpt,
    requirementType: 'technical',
    title,
    description,
    status: 'unreviewed',
    confidence: normalizedValue ? 0.79 : 0.69,
    normalizedValue,
  });

  upsertReviewTask(context, {
    dedupeKey: `reference-review:${normalizedValue ?? 'general'}`,
    matchedRule: 'reference.manual_review',
    sourceIndex,
    evidenceChunkId: chunkRow.chunkId,
    evidenceExcerpt,
    taskType: 'requirements',
    title: 'Arvioi referenssivaatimuksen täyttyminen',
    description: normalizedValue
      ? `Referenssivaatimus näyttää kohdistuvan aikajaksoon ${normalizedValue}. Tarkista, että organisaatiolla on tähän sopivat referenssit.`
      : 'Referenssivaatimus löytyi extracted chunkista, mutta sen täyttyminen pitää arvioida manuaalisesti ennen jatkotyötä.',
    status: 'todo',
    confidence: 0.63,
    normalizedValue,
    category: 'review',
  });
}

function maybeAddClearRiskFlag(context: RuleContext, chunkRow: TenderRuleAnalysisChunkInput) {
  const exclusionMatch = /poissuljetaan|hylätään/i.exec(chunkRow.textContent);
  const deadlineMatch = getMatchInfo(chunkRow.textContent, DEADLINE_RULES);
  const sourceIndex = context.evidenceSourceIndexByChunkId.get(chunkRow.chunkId);

  if (!exclusionMatch || !deadlineMatch || sourceIndex == null) {
    return;
  }

  const evidenceExcerpt = getExcerptAroundMatch(chunkRow.textContent, exclusionMatch.index);

  upsertRiskFlag(context, {
    dedupeKey: 'risk:deadline-exclusion',
    matchedRule: 'risk.deadline_exclusion',
    sourceIndex,
    evidenceChunkId: chunkRow.chunkId,
    evidenceExcerpt,
    riskType: 'delivery',
    title: 'Määräajan ylitys voi johtaa tarjouksen hylkäämiseen',
    description: 'Extracted chunkissa määräaikaan liittyvä ehto yhdistyy suoraan poissulku- tai hylkäysuhkaan. Tämä kannattaa nostaa näkyväksi riskiksi.',
    severity: 'high',
    status: 'open',
    confidence: 0.77,
    normalizedValue: extractDeadlineValue(chunkRow.textContent),
  });
}

function hasSubstantiveFindings(context: RuleContext) {
  return context.requirements.length > 0 || context.missingItems.length > 0 || context.riskFlags.length > 0;
}

function addProviderProfileReviewTaskIfNeeded(context: RuleContext) {
  if (!hasSubstantiveFindings(context)) {
    return;
  }

  const primarySource = context.evidenceSources[0];

  if (!primarySource) {
    return;
  }

  const sourceIndex = context.evidenceSourceIndexByChunkId.get(primarySource.chunkId);

  if (sourceIndex == null) {
    return;
  }

  if (!context.providerProfile) {
    upsertReviewTask(context, {
      dedupeKey: 'provider:profile-missing-review',
      matchedRule: 'provider.profile_missing',
      sourceIndex,
      evidenceChunkId: primarySource.chunkId,
      evidenceExcerpt: primarySource.excerptText,
      taskType: 'decision',
      title: 'Täydennä tarjoajaprofiili ennen lopullista go / no-go -päätöstä',
      description: 'Tarjouspyynnöstä tunnistettiin baseline-löydöksiä, mutta organisaatiolta puuttuu tarjoajaprofiili. Lisää vähintään yrityksen ydintiedot, yhteyshenkilö ja käytettävissä oleva todentava aineisto ennen sitovaa päätöstä.',
      status: 'todo',
      confidence: 0.58,
      normalizedValue: null,
      category: 'review',
    });

    return;
  }

  const hardConstraints = context.providerProfile.constraints.filter((constraint) => constraint.severity === 'hard');

  if (hardConstraints.length < 1) {
    return;
  }

  const constraintPreview = hardConstraints.slice(0, 3).map((constraint) => `"${constraint.title}"`).join(', ');
  const remainingCount = hardConstraints.length - Math.min(hardConstraints.length, 3);
  const remainingSuffix = remainingCount > 0 ? ` ja ${remainingCount} muuta` : '';

  upsertReviewTask(context, {
    dedupeKey: 'provider:hard-constraints-review',
    matchedRule: 'provider.hard_constraints',
    sourceIndex,
    evidenceChunkId: primarySource.chunkId,
    evidenceExcerpt: primarySource.excerptText,
    taskType: 'decision',
    title: 'Vertaile tarjoajaprofiilin kovat rajaukset tarjouspyyntöön',
    description: `Tarjoajaprofiilissa on ${hardConstraints.length} kovaa rajausta (${constraintPreview}${remainingSuffix}). Vertaile ne tarjouspyynnön ehtoihin ennen sitovaa go / no-go -päätöstä.`,
    status: 'todo',
    confidence: 0.61,
    normalizedValue: null,
    category: 'review',
  });
}

function addSummaryReviewTaskIfNeeded(context: RuleContext) {
  if (context.reviewTasks.length > 0 || context.requirements.length === 0 && context.missingItems.length === 0 && context.riskFlags.length === 0) {
    return;
  }

  const primarySource = context.evidenceSources[0];

  if (!primarySource) {
    return;
  }

  const sourceIndex = context.evidenceSourceIndexByChunkId.get(primarySource.chunkId);

  if (sourceIndex == null) {
    return;
  }

  upsertReviewTask(context, {
    dedupeKey: 'review:summary-follow-up',
    matchedRule: 'review.summary_follow_up',
    sourceIndex,
    evidenceChunkId: primarySource.chunkId,
    evidenceExcerpt: primarySource.excerptText,
    taskType: 'requirements',
    title: 'Käy sääntöpohjaiset löydökset läpi',
    description: `Deterministinen baseline tuotti ${formatCountLabel(context.requirements.length, 'vaatimuksen', 'vaatimusta')} ja ${formatCountLabel(context.missingItems.length, 'puutteen', 'puutetta')}. Tarkista löydökset ennen seuraavaa työvaihetta.`,
    status: 'todo',
    confidence: 0.52,
    normalizedValue: null,
    category: 'review',
  });
}

function addFallbackReviewTaskIfNeeded(context: RuleContext) {
  if (context.requirements.length > 0 || context.missingItems.length > 0 || context.riskFlags.length > 0 || context.reviewTasks.length > 0) {
    return;
  }

  const primarySource = context.evidenceSources[0];

  if (!primarySource) {
    return;
  }

  const sourceIndex = context.evidenceSourceIndexByChunkId.get(primarySource.chunkId);

  if (sourceIndex == null) {
    return;
  }

  upsertReviewTask(context, {
    dedupeKey: 'fallback:manual-review',
    matchedRule: 'fallback.manual_review',
    sourceIndex,
    evidenceChunkId: primarySource.chunkId,
    evidenceExcerpt: primarySource.excerptText,
    taskType: 'documents',
    title: 'Tarkista tarjouspyynnön ydinkohdat manuaalisesti',
    description: 'Deterministinen baseline ei tunnistanut määräaika-, liite- tai referenssiosumia extracted chunkeista. Tarkista dokumentit manuaalisesti ennen jatkotyötä.',
    status: 'todo',
    confidence: 0.22,
    normalizedValue: null,
    category: 'fallback',
  });
}

function buildGoNoGoSummary(context: RuleContext) {
  const providerProfileMissing = !context.providerProfile;
  const providerMissingRequirementCount = context.providerMissingRequirementKeys.size;
  const providerCoveredRequirementCount = context.providerCoveredRequirementKeys.size;
  const providerHardConstraintCount = context.providerProfile?.constraints.filter((constraint) => constraint.severity === 'hard').length ?? 0;
  const substantiveFindings = hasSubstantiveFindings(context);

  if (!substantiveFindings) {
    return {
      recommendation: 'pending' as const,
      summary:
        'Deterministinen sääntöpohjainen baseline ei löytänyt deadline-, liite- tai referenssiosumia extracted chunkeista. Pakettiin lisättiin kevyt review task manuaalista tarkistusta varten.',
      confidence: 0.22,
    };
  }

  const parts = [
    formatCountLabel(context.requirements.length, 'vaatimus', 'vaatimusta'),
    formatCountLabel(context.missingItems.length, 'puute', 'puutetta'),
    formatCountLabel(context.reviewTasks.length, 'review task', 'review taskia'),
  ];

  if (providerCoveredRequirementCount > 0) {
    parts.push(
      formatCountLabel(
        providerCoveredRequirementCount,
        'provider-profiilin tukema liitevaatimus',
        'provider-profiilin tukemaa liitevaatimusta',
      ),
    );
  }

  if (context.riskFlags.length > 0) {
    parts.push(formatCountLabel(context.riskFlags.length, 'riski', 'riskiä'));
  }

  if (providerProfileMissing) {
    return {
      recommendation: 'conditional-go' as const,
      summary: `Deterministinen sääntöpohjainen baseline tunnisti ${parts.join(', ')}, mutta tarjoajaprofiili puuttuu. Provider-fit, pätevyydet ja toimitusvalmius pitää varmistaa ennen sitovaa päätöstä.`,
      confidence: 0.58,
    };
  }

  if (providerMissingRequirementCount > 0 || providerHardConstraintCount > 0) {
    const providerParts: string[] = [];

    if (providerMissingRequirementCount > 0) {
      providerParts.push(`${providerMissingRequirementCount} liitevaatimukselle ei löytynyt vastaavaa tarjoajaprofiilin todistetta`);
    }

    if (providerHardConstraintCount > 0) {
      providerParts.push(`profiilissa on ${providerHardConstraintCount} kovaa rajausta`);
    }

    return {
      recommendation: 'conditional-go' as const,
      summary: `Deterministinen sääntöpohjainen baseline tunnisti ${parts.join(', ')}. Lisäksi ${providerParts.join(' ja ')}, joten go / no-go jää ehdolliseksi ennen sitovaa päätöstä.`,
      confidence: 0.66,
    };
  }

  return {
    recommendation: 'pending' as const,
    summary: `Deterministinen sääntöpohjainen baseline tunnisti ${parts.join(', ')} extracted chunk -osumista. Evidence-rivit osoittavat suoraan lähdechunkkeihin, ja review taskit ovat tarkoituksellinen osa katselmointityönkulkua.`,
    confidence: 0.61,
  };
}

function buildArtifactEvidenceLinks(
  items: Array<{ evidenceLinks: TenderResultEvidenceLinkSeed[] }>,
  limit = 8,
) {
  const links: TenderResultEvidenceLinkSeed[] = [];

  items.forEach((item) => {
    item.evidenceLinks.forEach((link) => {
      mergeEvidenceLinks(links, link);
    });
  });

  return links.slice(0, limit);
}

function buildMarkdownBulletSection(title: string, items: string[]) {
  if (items.length < 1) {
    return null;
  }

  return [`## ${title}`, ...items.map((item) => `- ${item}`)].join('\n');
}

function buildDraftArtifacts(input: {
  packageTitle: string;
  context: RuleContext;
}): TenderDraftArtifactSeed[] {
  const requirementLines = input.context.requirements.map((requirement) => {
    const detail = requirement.description ? `: ${requirement.description}` : '';
    return `${requirement.title}${detail}`;
  });
  const missingItemLines = input.context.missingItems.map((item) => {
    const detail = item.description ? `: ${item.description}` : '';
    return `${item.title}${detail}`;
  });
  const riskLines = input.context.riskFlags.map((risk) => {
    const detail = risk.description ? `: ${risk.description}` : '';
    return `${risk.title}${detail}`;
  });
  const reviewTaskLines = input.context.reviewTasks.map((task) => {
    const detail = task.description ? `: ${task.description}` : '';
    return `${task.title}${detail}`;
  });

  const outlineSections = [
    `# Tarjousrunko\nPaketti: ${input.packageTitle}`,
    buildMarkdownBulletSection('Tunnistetut vaatimukset', requirementLines),
    buildMarkdownBulletSection('Tarkistettavat liitteet ja puutteet', missingItemLines),
    buildMarkdownBulletSection('Riskit ja varmistukset', [...riskLines, ...reviewTaskLines]),
  ].filter((section): section is string => Boolean(section));

  const summarySections = [
    `# Vastausyhteenveto\nDeterministinen analyysi tunnisti ${formatCountLabel(input.context.requirements.length, 'vaatimuksen', 'vaatimusta')}, ${formatCountLabel(input.context.missingItems.length, 'puutteen', 'puutetta')} ja ${formatCountLabel(input.context.riskFlags.length, 'riskin', 'riskiä')}.`,
    buildMarkdownBulletSection('Keskeiset löydökset', [...requirementLines.slice(0, 5), ...riskLines.slice(0, 3)]),
  ].filter((section): section is string => Boolean(section));

  const clarificationSections = [
    '# Tarkennuslista\nKohdat, jotka vaativat vielä ihmisen päätöksen ennen editorivientiä.',
    buildMarkdownBulletSection('Avoimet puutteet', missingItemLines),
    buildMarkdownBulletSection('Avoimet riskit', riskLines),
    buildMarkdownBulletSection('Käsiteltävät tarkistustehtävät', reviewTaskLines),
  ].filter((section): section is string => Boolean(section));

  const artifacts: TenderDraftArtifactSeed[] = [];

  if (outlineSections.length > 1) {
    artifacts.push({
      artifactType: 'quote-outline',
      title: 'Deterministinen tarjousrunko',
      contentMd: outlineSections.join('\n\n'),
      status: 'ready-for-review',
      evidenceLinks: buildArtifactEvidenceLinks([
        ...input.context.requirements,
        ...input.context.missingItems,
        ...input.context.riskFlags,
        ...input.context.reviewTasks,
      ]),
    });
  }

  if (summarySections.length > 1) {
    artifacts.push({
      artifactType: 'response-summary',
      title: 'Deterministinen vastausyhteenveto',
      contentMd: summarySections.join('\n\n'),
      status: 'ready-for-review',
      evidenceLinks: buildArtifactEvidenceLinks([
        ...input.context.requirements,
        ...input.context.riskFlags,
      ]),
    });
  }

  if (clarificationSections.length > 1) {
    artifacts.push({
      artifactType: 'clarification-list',
      title: 'Avoimet tarkennukset ja riskit',
      contentMd: clarificationSections.join('\n\n'),
      status: 'ready-for-review',
      evidenceLinks: buildArtifactEvidenceLinks([
        ...input.context.missingItems,
        ...input.context.riskFlags,
        ...input.context.reviewTasks,
      ]),
    });
  }

  return artifacts;
}

export function buildTenderDeterministicAnalysisPlan(input: {
  packageTitle: string;
  documentRows: TenderRuleAnalysisDocumentInput[];
  chunkRows: TenderRuleAnalysisChunkInput[];
  providerProfile?: TenderRuleAnalysisProviderProfileDetailsInput | null;
  now?: Date;
}): TenderDeterministicAnalysisPlan {
  const evidenceSources = buildEvidenceSources(input.documentRows, input.chunkRows);
  const analysisNow = input.now ?? new Date();

  if (evidenceSources.length < 1) {
    throw new Error('Deterministinen baseline-analyysi vaatii vähintään yhden extracted chunkin evidence-datan muodostamiseen.');
  }

  const evidenceSourceIndexByChunkId = new Map(evidenceSources.map((source, index) => [source.chunkId, index]));
  const context: RuleContext = {
    evidenceSources,
    evidenceSourceIndexByChunkId,
    packageDocumentNames: input.documentRows.map((row) => normalizeComparableText(row.fileName)),
    providerProfile: input.providerProfile ?? null,
    providerCoveredRequirementKeys: new Set(),
    providerMissingRequirementKeys: new Set(),
    ruleMatches: [],
    requirements: [],
    requirementIndexByKey: new Map(),
    missingItems: [],
    missingItemIndexByKey: new Map(),
    reviewTasks: [],
    reviewTaskIndexByKey: new Map(),
    riskFlags: [],
    riskFlagIndexByKey: new Map(),
  };

  input.chunkRows.forEach((chunkRow) => {
    const deadlineMatch = getMatchInfo(chunkRow.textContent, DEADLINE_RULES);
    const genericAttachmentMatch = getMatchInfo(chunkRow.textContent, GENERIC_ATTACHMENT_RULES);
    const referenceMatch = getMatchInfo(chunkRow.textContent, REFERENCE_RULES);

    if (deadlineMatch) {
      analyzeDeadlineChunk(context, chunkRow, deadlineMatch.index, deadlineMatch.ruleId);
    }

    if (genericAttachmentMatch || ATTACHMENT_RULES.some((definition) => definition.patterns.some((pattern) => pattern.test(chunkRow.textContent)))) {
      analyzeAttachmentChunk(context, chunkRow, genericAttachmentMatch, analysisNow);
    }

    if (referenceMatch) {
      analyzeReferenceChunk(context, chunkRow, referenceMatch.index, referenceMatch.ruleId);
    }

    maybeAddClearRiskFlag(context, chunkRow);
  });

  addProviderProfileReviewTaskIfNeeded(context);
  addSummaryReviewTaskIfNeeded(context);
  addFallbackReviewTaskIfNeeded(context);
  const draftArtifacts = buildDraftArtifacts({
    packageTitle: input.packageTitle,
    context,
  });

  const requirementOrder = context.requirements.map((item) => item.dedupeKey);
  const requirementIndexByKey = new Map(requirementOrder.map((key, index) => [key, index]));

  return {
    goNoGoAssessment: buildGoNoGoSummary(context),
    evidenceSources,
    ruleMatches: context.ruleMatches,
    requirements: context.requirements.map(({ dedupeKey, ...requirement }) => {
      void dedupeKey;
      return requirement;
    }),
    missingItems: context.missingItems.map(({ dedupeKey, relatedRequirementKey, ...missingItem }) => {
      void dedupeKey;
      return {
        ...missingItem,
        relatedRequirementIndex: relatedRequirementKey ? requirementIndexByKey.get(relatedRequirementKey) ?? null : null,
      };
    }),
    riskFlags: context.riskFlags.map(({ dedupeKey, ...riskFlag }) => {
      void dedupeKey;
      return riskFlag;
    }),
    referenceSuggestions: [],
    draftArtifacts,
    reviewTasks: context.reviewTasks.map(({ dedupeKey, ...reviewTask }) => {
      void dedupeKey;
      return reviewTask;
    }),
  };
}