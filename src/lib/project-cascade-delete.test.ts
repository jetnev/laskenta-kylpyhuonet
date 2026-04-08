import { describe, expect, it } from 'vitest';

import type { Quote, QuoteRow } from './types';
import {
  buildBulkQuoteCascadeDeleteConfirmMessage,
  buildProjectCascadeDeleteConfirmMessage,
  buildProjectCascadeDeletionPlan,
  buildQuoteCascadeDeleteConfirmMessage,
  buildQuoteCascadeDeletionPlan,
  buildQuotesCascadeDeletionPlan,
} from './project-cascade-delete';

function createQuote(id: string, projectId: string) {
  return { id, projectId } as Quote;
}

function createRow(id: string, quoteId: string) {
  return { id, quoteId } as QuoteRow;
}

describe('project-cascade-delete', () => {
  it('builds a single quote cascade deletion plan from matching rows only', () => {
    const plan = buildQuoteCascadeDeletionPlan('quote-1', [
      createRow('row-1', 'quote-1'),
      createRow('row-2', 'quote-2'),
      createRow('row-3', 'quote-1'),
    ]);

    expect(plan).toEqual({
      quoteIds: ['quote-1'],
      rowIds: ['row-1', 'row-3'],
      quoteCount: 1,
      rowCount: 2,
    });
  });

  it('builds a bulk quote deletion plan with unique quote ids and row ids', () => {
    const plan = buildQuotesCascadeDeletionPlan(['quote-1', 'quote-2', 'quote-1'], [
      createRow('row-1', 'quote-1'),
      createRow('row-2', 'quote-2'),
      createRow('row-3', 'quote-3'),
    ]);

    expect(plan).toEqual({
      quoteIds: ['quote-1', 'quote-2'],
      rowIds: ['row-1', 'row-2'],
      quoteCount: 2,
      rowCount: 2,
    });
  });

  it('builds a project deletion plan covering all project quotes and rows', () => {
    const plan = buildProjectCascadeDeletionPlan(
      'project-1',
      [
        createQuote('quote-1', 'project-1'),
        createQuote('quote-2', 'project-1'),
        createQuote('quote-3', 'project-2'),
      ],
      [
        createRow('row-1', 'quote-1'),
        createRow('row-2', 'quote-2'),
        createRow('row-3', 'quote-3'),
      ],
    );

    expect(plan).toEqual({
      projectId: 'project-1',
      quoteIds: ['quote-1', 'quote-2'],
      rowIds: ['row-1', 'row-2'],
      quoteCount: 2,
      rowCount: 2,
    });
  });

  it('formats quote delete confirmation messages with row impact', () => {
    expect(
      buildQuoteCascadeDeleteConfirmMessage({
        quoteIds: ['quote-1'],
        rowIds: ['row-1'],
        quoteCount: 1,
        rowCount: 1,
      }),
    ).toBe('Haluatko varmasti poistaa tarjouksen? Tämä poistaa myös 1 rivin.');

    expect(
      buildQuoteCascadeDeleteConfirmMessage({
        quoteIds: ['quote-1'],
        rowIds: [],
        quoteCount: 1,
        rowCount: 0,
      }),
    ).toBe('Haluatko varmasti poistaa tarjouksen?');
  });

  it('formats bulk quote delete confirmation messages with quote and row counts', () => {
    expect(
      buildBulkQuoteCascadeDeleteConfirmMessage({
        quoteIds: ['quote-1', 'quote-2'],
        rowIds: ['row-1', 'row-2', 'row-3'],
        quoteCount: 2,
        rowCount: 3,
      }),
    ).toBe('Haluatko varmasti poistaa 2 tarjousta? Tämä poistaa myös 3 riviä.');
  });

  it('formats project delete confirmation messages with cascade impact', () => {
    expect(
      buildProjectCascadeDeleteConfirmMessage({
        projectId: 'project-1',
        quoteIds: ['quote-1'],
        rowIds: ['row-1'],
        quoteCount: 1,
        rowCount: 1,
      }),
    ).toBe('Haluatko varmasti poistaa projektin? Tämä poistaa myös 1 tarjouksen ja 1 rivin.');

    expect(
      buildProjectCascadeDeleteConfirmMessage({
        projectId: 'project-1',
        quoteIds: [],
        rowIds: [],
        quoteCount: 0,
        rowCount: 0,
      }),
    ).toBe('Haluatko varmasti poistaa projektin?');
  });
});