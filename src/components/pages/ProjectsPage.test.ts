import { describe, expect, it } from 'vitest';

import { shouldKeepPendingQuoteEditorOpen } from '../../lib/project-workspace';
import { isShortcutInputTarget, sortQuotesForList } from '../../lib/projects-quote-list';
import type { Quote } from '../../lib/types';

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

describe('sortQuotesForList', () => {
  const buildQuote = (partial: Pick<Quote, 'id' | 'title' | 'status' | 'updatedAt'>) =>
    ({ ...partial } as Quote);

  const quotes = [
    buildQuote({ id: 'q-1', title: 'Beta', status: 'sent', updatedAt: '2026-01-02T00:00:00.000Z' }),
    buildQuote({ id: 'q-2', title: 'Alpha', status: 'draft', updatedAt: '2026-01-03T00:00:00.000Z' }),
    buildQuote({ id: 'q-3', title: 'Gamma', status: 'accepted', updatedAt: '2026-01-01T00:00:00.000Z' }),
  ];

  it('sorts by updated time descending', () => {
    const result = sortQuotesForList(quotes, 'updatedAt', 'desc');
    expect(result.map((quote) => quote.id)).toEqual(['q-2', 'q-1', 'q-3']);
  });

  it('sorts by title ascending', () => {
    const result = sortQuotesForList(quotes, 'title', 'asc');
    expect(result.map((quote) => quote.id)).toEqual(['q-2', 'q-1', 'q-3']);
  });

  it('sorts by status using configured status order', () => {
    const result = sortQuotesForList(quotes, 'status', 'asc');
    expect(result.map((quote) => quote.id)).toEqual(['q-2', 'q-1', 'q-3']);
  });
});

describe('isShortcutInputTarget', () => {
  it('returns false for non-editable targets', () => {
    expect(isShortcutInputTarget(null)).toBe(false);
  });

  it('returns true for input-like elements', () => {
    expect(isShortcutInputTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
  });
});