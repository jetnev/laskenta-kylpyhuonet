/**
 * Deterministic baseline analysis plan builder for the server-side runner.
 *
 * The Edge Function imports the same pure rule-analysis module as the feature
 * boundary so the local fallback and the server-side execution produce the
 * same deterministic findings and evidence links.
 */

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
} from '../../../src/features/tender-intelligence/lib/tender-rule-analysis.ts';

export interface PackageRowSlice {
  id: string;
  title: string;
  organization_id: string;
}

export interface DocumentRowSlice {
  id: string;
  file_name: string;
  tender_package_id: string;
}

export interface ChunkRowSlice {
  id: string;
  tender_document_id: string;
  extraction_id: string;
  chunk_index: number;
  text_content: string;
}

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
  packageRow: PackageRowSlice;
  documentRows: DocumentRowSlice[];
  chunkRows: ChunkRowSlice[];
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
