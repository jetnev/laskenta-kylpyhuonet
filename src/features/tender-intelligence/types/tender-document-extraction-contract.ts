import { z } from 'zod';

import { TENDER_DOCUMENT_EXTRACTION_STATUSES } from '../lib/tender-document-extraction';

export const tenderDocumentExtractionRunnerRequestSchema = z.object({
  tenderPackageId: z.string().trim().min(1, 'tenderPackageId puuttuu tai on virheellinen.'),
  tenderDocumentId: z.string().trim().min(1, 'tenderDocumentId puuttuu tai on virheellinen.'),
});

const tenderDocumentExtractionRunnerResponseStatuses = ['rejected', ...TENDER_DOCUMENT_EXTRACTION_STATUSES] as const;

export const tenderDocumentExtractionRunnerResponseSchema = z.object({
  accepted: z.boolean(),
  extractionId: z.string().nullable(),
  tenderDocumentId: z.string().nullable(),
  status: z.enum(tenderDocumentExtractionRunnerResponseStatuses),
  message: z.string().nullable(),
  chunkCount: z.number().int().nonnegative().nullable().optional(),
  characterCount: z.number().int().nonnegative().nullable().optional(),
});

export type TenderDocumentExtractionRunnerRequest = z.infer<typeof tenderDocumentExtractionRunnerRequestSchema>;
export type TenderDocumentExtractionRunnerResponse = z.infer<typeof tenderDocumentExtractionRunnerResponseSchema>;

export function parseTenderDocumentExtractionRunnerResponse(data: unknown) {
  return tenderDocumentExtractionRunnerResponseSchema.parse(data);
}

export function isTenderDocumentExtractionRunnerRejected(response: TenderDocumentExtractionRunnerResponse) {
  return !response.accepted || response.status === 'rejected';
}

export const TENDER_DOCUMENT_EXTRACTION_RUNNER_FUNCTION_NAME = 'tender-document-extractor';