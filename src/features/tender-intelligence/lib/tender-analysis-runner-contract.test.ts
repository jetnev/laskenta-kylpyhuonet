import { describe, expect, it } from 'vitest';

import {
  isTenderAnalysisRunnerFailure,
  isTenderAnalysisRunnerSuccess,
  parseTenderAnalysisRunnerResponse,
  tenderAnalysisRunnerRequestSchema,
  tenderAnalysisRunnerResponseSchema,
  TENDER_ANALYSIS_RUNNER_FUNCTION_NAME,
} from '../types/tender-analysis-runner-contract';

describe('tender-analysis-runner-contract', () => {
  describe('TENDER_ANALYSIS_RUNNER_FUNCTION_NAME', () => {
    it('is the Edge Function name', () => {
      expect(TENDER_ANALYSIS_RUNNER_FUNCTION_NAME).toBe('tender-analysis-runner');
    });
  });

  describe('tenderAnalysisRunnerRequestSchema', () => {
    it('accepts a valid request', () => {
      const result = tenderAnalysisRunnerRequestSchema.safeParse({
        tenderPackageId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
    });

    it('rejects an empty tenderPackageId', () => {
      const result = tenderAnalysisRunnerRequestSchema.safeParse({
        tenderPackageId: '',
      });

      expect(result.success).toBe(false);
    });

    it('rejects a missing tenderPackageId', () => {
      const result = tenderAnalysisRunnerRequestSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('trims whitespace from tenderPackageId', () => {
      const result = tenderAnalysisRunnerRequestSchema.parse({
        tenderPackageId: '  abc-123  ',
      });

      expect(result.tenderPackageId).toBe('abc-123');
    });
  });

  describe('tenderAnalysisRunnerResponseSchema', () => {
    it('parses a successful response', () => {
      const result = tenderAnalysisRunnerResponseSchema.parse({
        accepted: true,
        analysisJobId: 'job-1',
        status: 'completed',
        message: null,
      });

      expect(result.accepted).toBe(true);
      expect(result.analysisJobId).toBe('job-1');
      expect(result.status).toBe('completed');
      expect(result.message).toBeNull();
    });

    it('parses a rejected response', () => {
      const result = tenderAnalysisRunnerResponseSchema.parse({
        accepted: false,
        analysisJobId: null,
        status: 'rejected',
        message: 'Pakettia ei löydy.',
      });

      expect(result.accepted).toBe(false);
      expect(result.analysisJobId).toBeNull();
      expect(result.message).toBe('Pakettia ei löydy.');
    });

    it('parses a failed response with job id', () => {
      const result = tenderAnalysisRunnerResponseSchema.parse({
        accepted: true,
        analysisJobId: 'job-2',
        status: 'failed',
        message: 'Seed virhe.',
      });

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('failed');
    });
  });

  describe('parseTenderAnalysisRunnerResponse', () => {
    it('parses valid data', () => {
      const response = parseTenderAnalysisRunnerResponse({
        accepted: true,
        analysisJobId: 'j-1',
        status: 'completed',
        message: null,
      });

      expect(response.accepted).toBe(true);
    });

    it('throws on invalid data', () => {
      expect(() => parseTenderAnalysisRunnerResponse({ foo: 'bar' })).toThrow();
    });
  });

  describe('isTenderAnalysisRunnerSuccess', () => {
    it('returns true for accepted + completed', () => {
      expect(
        isTenderAnalysisRunnerSuccess({
          accepted: true,
          analysisJobId: 'j-1',
          status: 'completed',
          message: null,
        }),
      ).toBe(true);
    });

    it('returns false for rejected', () => {
      expect(
        isTenderAnalysisRunnerSuccess({
          accepted: false,
          analysisJobId: null,
          status: 'rejected',
          message: 'Virhe.',
        }),
      ).toBe(false);
    });

    it('returns false for accepted but failed', () => {
      expect(
        isTenderAnalysisRunnerSuccess({
          accepted: true,
          analysisJobId: 'j-1',
          status: 'failed',
          message: null,
        }),
      ).toBe(false);
    });
  });

  describe('isTenderAnalysisRunnerFailure', () => {
    it('returns true for rejected', () => {
      expect(
        isTenderAnalysisRunnerFailure({
          accepted: false,
          analysisJobId: null,
          status: 'rejected',
          message: 'Ei dokumentteja.',
        }),
      ).toBe(true);
    });

    it('returns true for accepted but failed', () => {
      expect(
        isTenderAnalysisRunnerFailure({
          accepted: true,
          analysisJobId: 'j-1',
          status: 'failed',
          message: 'Seed-virhe.',
        }),
      ).toBe(true);
    });

    it('returns false for successful completion', () => {
      expect(
        isTenderAnalysisRunnerFailure({
          accepted: true,
          analysisJobId: 'j-1',
          status: 'completed',
          message: null,
        }),
      ).toBe(false);
    });
  });
});
