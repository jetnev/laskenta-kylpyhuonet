import { describe, expect, it } from 'vitest';

import {
  getTenderIntelligenceAnalysisRunnerUnavailableMessage,
  getTenderIntelligenceEnvironmentIssueMessage,
  getTenderIntelligenceEnvironmentIssueTypeFromMessage,
  getTenderIntelligenceExtractionRunnerUnavailableMessage,
  getTenderIntelligenceSchemaUnavailableMessage,
  getTenderIntelligenceStorageUnavailableMessage,
  isTenderIntelligenceSchemaUnavailableError,
  isTenderIntelligenceSchemaUnavailableMessage,
} from './tender-intelligence-errors';

describe('tender-intelligence-errors', () => {
  it('detects missing tarjousaly schema from a PostgREST table lookup error', () => {
    expect(isTenderIntelligenceSchemaUnavailableError({
      code: 'PGRST205',
      message: "Could not find the table 'public.tender_packages' in the schema cache",
    })).toBe(true);
  });

  it('detects the normalized tarjousaly schema message', () => {
    expect(isTenderIntelligenceSchemaUnavailableMessage(getTenderIntelligenceSchemaUnavailableMessage())).toBe(true);
  });

  it('normalizes missing storage bucket to an environment readiness message', () => {
    expect(getTenderIntelligenceEnvironmentIssueMessage(
      { message: 'Bucket not found' },
      { operation: 'storage-upload' },
    )).toBe(getTenderIntelligenceStorageUnavailableMessage());
  });

  it('normalizes analysis runner fetch failures to an environment readiness message', () => {
    expect(getTenderIntelligenceEnvironmentIssueMessage(
      { message: 'Failed to send a request to the Edge Function' },
      { operation: 'analysis-runner' },
    )).toBe(getTenderIntelligenceAnalysisRunnerUnavailableMessage());
  });

  it('resolves normalized extraction runner messages back to an issue type', () => {
    expect(getTenderIntelligenceEnvironmentIssueTypeFromMessage(getTenderIntelligenceExtractionRunnerUnavailableMessage())).toBe('extraction-runner');
  });
});