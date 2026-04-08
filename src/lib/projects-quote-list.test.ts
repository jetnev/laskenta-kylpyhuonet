import { describe, it, expect } from 'vitest';
import { isShortcutInputTarget, sortQuotesForList } from './projects-quote-list';
import type { Quote } from './types';

function makeQuote(overrides: Partial<Quote> & { id: string }): Quote {
  return {
    quoteNumber: 'Q-001',
    title: 'Tarjous',
    projectId: 'p1',
    status: 'draft',
    revisionNumber: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    vatPercent: 25.5,
    discountType: 'none',
    discountValue: 0,
    ...overrides,
  } as Quote;
}

const quoteA = makeQuote({ id: 'a', title: 'Alfa', status: 'draft', updatedAt: '2026-01-01T00:00:00Z' });
const quoteB = makeQuote({ id: 'b', title: 'Beta', status: 'sent', updatedAt: '2026-02-01T00:00:00Z' });
const quoteC = makeQuote({ id: 'c', title: 'Charlie', status: 'accepted', updatedAt: '2026-03-01T00:00:00Z' });
const quoteD = makeQuote({ id: 'd', title: 'Delta', status: 'rejected', updatedAt: '2026-04-01T00:00:00Z' });

describe('sortQuotesForList', () => {
  const quotes = [quoteD, quoteB, quoteA, quoteC];

  it('järjestää updatedAt asc -mukaan oikein', () => {
    const sorted = sortQuotesForList(quotes, 'updatedAt', 'asc');
    expect(sorted.map((q) => q.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('järjestää updatedAt desc -mukaan oikein', () => {
    const sorted = sortQuotesForList(quotes, 'updatedAt', 'desc');
    expect(sorted.map((q) => q.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('järjestää title asc -mukaan aakkosjärjestykseen', () => {
    const sorted = sortQuotesForList(quotes, 'title', 'asc');
    expect(sorted.map((q) => q.title)).toEqual(['Alfa', 'Beta', 'Charlie', 'Delta']);
  });

  it('järjestää title desc -mukaan käänteiseen aakkosjärjestykseen', () => {
    const sorted = sortQuotesForList(quotes, 'title', 'desc');
    expect(sorted.map((q) => q.title)).toEqual(['Delta', 'Charlie', 'Beta', 'Alfa']);
  });

  it('järjestää status asc: draft → sent → accepted → rejected', () => {
    const sorted = sortQuotesForList(quotes, 'status', 'asc');
    expect(sorted.map((q) => q.status)).toEqual(['draft', 'sent', 'accepted', 'rejected']);
  });

  it('järjestää status desc: rejected → accepted → sent → draft', () => {
    const sorted = sortQuotesForList(quotes, 'status', 'desc');
    expect(sorted.map((q) => q.status)).toEqual(['rejected', 'accepted', 'sent', 'draft']);
  });

  it('ei muuta alkuperäistä taulukkoa', () => {
    const original = [...quotes];
    sortQuotesForList(quotes, 'updatedAt', 'asc');
    expect(quotes.map((q) => q.id)).toEqual(original.map((q) => q.id));
  });

  it('saman statuksen sisällä järjestää updatedAt desc:n mukaan', () => {
    const twoSent = [
      makeQuote({ id: 's1', status: 'sent', updatedAt: '2026-01-01T00:00:00Z' }),
      makeQuote({ id: 's2', status: 'sent', updatedAt: '2026-06-01T00:00:00Z' }),
    ];
    const sorted = sortQuotesForList(twoSent, 'status', 'asc');
    expect(sorted.map((q) => q.id)).toEqual(['s2', 's1']);
  });
});

describe('isShortcutInputTarget', () => {
  it('palauttaa false null:lle', () => {
    expect(isShortcutInputTarget(null)).toBe(false);
  });

  it('palauttaa false ei-elementille', () => {
    expect(isShortcutInputTarget(42 as never)).toBe(false);
  });

  it('tunnistaa input-elementin tagNamen perusteella', () => {
    expect(isShortcutInputTarget({ tagName: 'INPUT' } as never)).toBe(true);
  });

  it('tunnistaa textarea-elementin', () => {
    expect(isShortcutInputTarget({ tagName: 'TEXTAREA' } as never)).toBe(true);
  });

  it('tunnistaa select-elementin', () => {
    expect(isShortcutInputTarget({ tagName: 'SELECT' } as never)).toBe(true);
  });

  it('tunnistaa contenteditable-elementin', () => {
    expect(isShortcutInputTarget({ isContentEditable: true, tagName: 'DIV' } as never)).toBe(true);
  });

  it('palauttaa false tavalliselle div:lle', () => {
    expect(isShortcutInputTarget({ tagName: 'DIV' } as never)).toBe(false);
  });
});
