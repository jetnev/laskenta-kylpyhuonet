import {
  buildTenderDeterministicAnalysisPlan,
  type TenderDeterministicAnalysisPlan,
  type TenderDraftArtifactSeed,
  type TenderEvidenceSourceSeed,
  type TenderMissingItemSeed,
  type TenderRuleAnalysisProviderProfileDetailsInput,
  type TenderReferenceSuggestionSeed,
  type TenderRequirementSeed,
  type TenderResultEvidenceLinkSeed,
  type TenderReviewTaskSeed,
  type TenderRiskFlagSeed,
} from './tender-rule-analysis';
import type { TenderProviderProfileDetails } from '../types/tender-intelligence';
import type { TenderDocumentChunkRow, TenderDocumentRow, TenderPackageRow } from '../types/tender-intelligence-db';

export type PlaceholderAnalysisSeedPlan = TenderDeterministicAnalysisPlan;
export type PlaceholderDraftArtifactSeed = TenderDraftArtifactSeed;
export type PlaceholderEvidenceSourceSeed = TenderEvidenceSourceSeed;
export type PlaceholderMissingItemSeed = TenderMissingItemSeed;
export type PlaceholderReferenceSuggestionSeed = TenderReferenceSuggestionSeed;
export type PlaceholderRequirementSeed = TenderRequirementSeed;
export type PlaceholderResultEvidenceLinkSeed = TenderResultEvidenceLinkSeed;
export type PlaceholderReviewTaskSeed = TenderReviewTaskSeed;
export type PlaceholderRiskFlagSeed = TenderRiskFlagSeed;

function mapTenderProviderProfileDetailsToAnalysisInput(
  providerProfile: TenderProviderProfileDetails | null | undefined,
): TenderRuleAnalysisProviderProfileDetailsInput | null {
  if (!providerProfile) {
    return null;
  }

  return {
    profile: {
      companyName: providerProfile.profile.companyName,
      summary: providerProfile.profile.summary ?? null,
      serviceArea: providerProfile.profile.serviceArea ?? null,
      maxTravelKm: providerProfile.profile.maxTravelKm ?? null,
      deliveryScope: providerProfile.profile.deliveryScope,
    },
    credentials: providerProfile.credentials.map((credential) => ({
      title: credential.title,
      issuer: credential.issuer ?? null,
      credentialType: credential.credentialType,
      validUntil: credential.validUntil ?? null,
      documentReference: credential.documentReference ?? null,
      notes: credential.notes ?? null,
    })),
    constraints: providerProfile.constraints.map((constraint) => ({
      title: constraint.title,
      severity: constraint.severity,
      ruleText: constraint.ruleText,
      mitigationNote: constraint.mitigationNote ?? null,
    })),
    documents: providerProfile.documents.map((document) => ({
      title: document.title,
      documentType: document.documentType,
      sourceReference: document.sourceReference ?? null,
      notes: document.notes ?? null,
    })),
    responseTemplates: providerProfile.responseTemplates.map((template) => ({
      title: template.title,
      templateType: template.templateType,
    })),
  };
}

export function buildPlaceholderAnalysisSeedPlan(input: {
  packageRow: TenderPackageRow;
  documentRows: TenderDocumentRow[];
  chunkRows: TenderDocumentChunkRow[];
  providerProfile?: TenderProviderProfileDetails | null;
}): PlaceholderAnalysisSeedPlan {
  return buildTenderDeterministicAnalysisPlan({
    packageTitle: input.packageRow.title,
    documentRows: input.documentRows.map((row) => ({
      documentId: row.id,
      fileName: row.file_name,
    })),
    chunkRows: input.chunkRows.map((row) => ({
      chunkId: row.id,
      documentId: row.tender_document_id,
      extractionId: row.extraction_id,
      chunkIndex: row.chunk_index,
      textContent: row.text_content,
    })),
    providerProfile: mapTenderProviderProfileDetailsToAnalysisInput(input.providerProfile),
  });
}
