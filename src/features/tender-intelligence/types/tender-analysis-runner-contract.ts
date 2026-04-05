import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  Request                                                            */
/* ------------------------------------------------------------------ */

export const tenderAnalysisRunnerRequestSchema = z.object({
  tenderPackageId: z.string().trim().min(1, 'tenderPackageId puuttuu tai on virheellinen.'),
});

export type TenderAnalysisRunnerRequest = z.infer<typeof tenderAnalysisRunnerRequestSchema>;

/* ------------------------------------------------------------------ */
/*  Response                                                           */
/* ------------------------------------------------------------------ */

export const tenderAnalysisRunnerResponseSchema = z.object({
  accepted: z.boolean(),
  analysisJobId: z.string().nullable(),
  status: z.string(),
  message: z.string().nullable(),
});

export type TenderAnalysisRunnerResponse = z.infer<typeof tenderAnalysisRunnerResponseSchema>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function parseTenderAnalysisRunnerResponse(data: unknown): TenderAnalysisRunnerResponse {
  return tenderAnalysisRunnerResponseSchema.parse(data);
}

export function isTenderAnalysisRunnerSuccess(response: TenderAnalysisRunnerResponse) {
  return response.accepted && response.status === 'completed';
}

export function isTenderAnalysisRunnerFailure(response: TenderAnalysisRunnerResponse) {
  return !response.accepted || response.status === 'failed' || response.status === 'rejected';
}

export const TENDER_ANALYSIS_RUNNER_FUNCTION_NAME = 'tender-analysis-runner';
