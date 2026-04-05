import { describe, expect, it } from 'vitest';

import {
  getTenderIntelligenceSchemaUnavailableMessage,
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
});