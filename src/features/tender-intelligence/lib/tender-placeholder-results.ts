import {
  buildTenderDeterministicAnalysisPlan,
  type TenderDeterministicAnalysisPlan,
  type TenderDraftArtifactSeed,
  type TenderEvidenceSourceSeed,
  type TenderMissingItemSeed,
  type TenderReferenceSuggestionSeed,
  type TenderRequirementSeed,
  type TenderResultEvidenceLinkSeed,
  type TenderReviewTaskSeed,
  type TenderRiskFlagSeed,
} from './tender-rule-analysis';
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

export function buildPlaceholderAnalysisSeedPlan(input: {
  packageRow: TenderPackageRow;
  documentRows: TenderDocumentRow[];
  chunkRows: TenderDocumentChunkRow[];
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
  });
}