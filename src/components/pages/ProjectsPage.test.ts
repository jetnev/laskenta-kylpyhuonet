import { describe, expect, it } from 'vitest';

import { shouldKeepPendingQuoteEditorOpen } from '../../lib/project-workspace';

describe('shouldKeepPendingQuoteEditorOpen', () => {
  it('keeps the editor open when the selected quote is already visible', () => {
    expect(
      shouldKeepPendingQuoteEditorOpen({
        pendingCreatedQuoteId: null,
        selectedQuoteId: 'quote-1',
        visibleQuoteIds: ['quote-1', 'quote-2'],
      }),
    ).toBe(true);
  });

  it('keeps the editor open during the handoff render for a newly created quote', () => {
    expect(
      shouldKeepPendingQuoteEditorOpen({
        pendingCreatedQuoteId: 'quote-3',
        selectedQuoteId: 'quote-3',
        visibleQuoteIds: ['quote-1', 'quote-2'],
      }),
    ).toBe(true);
  });

  it('allows the route cleanup when the selected quote is neither visible nor pending', () => {
    expect(
      shouldKeepPendingQuoteEditorOpen({
        pendingCreatedQuoteId: 'quote-3',
        selectedQuoteId: 'quote-4',
        visibleQuoteIds: ['quote-1', 'quote-2'],
      }),
    ).toBe(false);
  });
});