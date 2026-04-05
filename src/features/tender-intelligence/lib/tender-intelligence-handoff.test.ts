import { describe, expect, it } from 'vitest';

import type { AppLocationState } from '@/lib/app-routing';

import {
  buildTenderIntelligenceQuoteEditorHandoff,
  resolveTenderIntelligenceHandoff,
  resolveTenderIntelligenceLocationHandoff,
} from './tender-intelligence-handoff';

function createRouteState(overrides: Partial<AppLocationState> = {}): AppLocationState {
  return {
    page: 'tender-intelligence',
    tenderContext: {
      source: 'quote-editor',
      tenderPackageId: 'package-1',
      draftPackageId: 'draft-1',
      importedQuoteId: 'quote-1',
      intent: 'repair-managed-import',
      blockIds: ['requirements_and_quote_notes'],
    },
    ...overrides,
  };
}

describe('tender-intelligence-handoff', () => {
  it('builds a contextual handoff url for quote editor sources', () => {
    const handoff = buildTenderIntelligenceQuoteEditorHandoff({
      tenderPackageId: 'package-1',
      draftPackageId: 'draft-1',
      importedQuoteId: 'quote-1',
      intent: 'reimport-managed-import',
      blockIds: ['requirements_and_quote_notes', 'notes_for_editor'],
    });

    expect(handoff.label).toBe('Palaa hallittuun importtiin');
    expect(handoff.url).toBe('/app/tarjousaly?source=quote-editor&tenderPackage=package-1&draftPackage=draft-1&importQuote=quote-1&intent=reimport-managed-import&blocks=requirements_and_quote_notes%2Cnotes_for_editor');
    expect(handoff.location).toEqual({
      page: 'tender-intelligence',
      tenderContext: {
        source: 'quote-editor',
        tenderPackageId: 'package-1',
        draftPackageId: 'draft-1',
        importedQuoteId: 'quote-1',
        intent: 'reimport-managed-import',
        blockIds: ['requirements_and_quote_notes', 'notes_for_editor'],
      },
    });
  });

  it('parses tender intelligence route context from app location', () => {
    expect(resolveTenderIntelligenceLocationHandoff(createRouteState())).toEqual({
      source: 'quote-editor',
      tenderPackageId: 'package-1',
      draftPackageId: 'draft-1',
      importedQuoteId: 'quote-1',
      intent: 'repair-managed-import',
      blockIds: ['requirements_and_quote_notes'],
    });
  });

  it('falls back cleanly when the draft package is missing', () => {
    const resolution = resolveTenderIntelligenceHandoff(createRouteState(), {
      tenderPackage: { id: 'package-1' },
      draftPackage: null,
    });

    expect(resolution.status).toBe('missing_draft_package');
    expect(resolution.resolvedTenderPackageId).toBe('package-1');
    expect(resolution.resolvedDraftPackageId).toBeNull();
    expect(resolution.title).toContain('Lähdeluonnosta ei löytynyt');
  });

  it('falls back cleanly when the tender package is missing', () => {
    const resolution = resolveTenderIntelligenceHandoff(createRouteState(), {
      tenderPackage: null,
      draftPackage: null,
    });

    expect(resolution.status).toBe('missing_tender_package');
    expect(resolution.resolvedTenderPackageId).toBeNull();
    expect(resolution.title).toContain('Lähdepakettia ei löytynyt');
  });

  it('keeps a matched editor handoff focused on the requested draft package', () => {
    const resolution = resolveTenderIntelligenceHandoff(createRouteState(), {
      tenderPackage: { id: 'package-1' },
      draftPackage: {
        id: 'draft-1',
        tenderPackageId: 'package-1',
      },
    });

    expect(resolution.status).toBe('ready');
    expect(resolution.resolvedTenderPackageId).toBe('package-1');
    expect(resolution.resolvedDraftPackageId).toBe('draft-1');
    expect(resolution.ctaLabel).toBe('Korjaa Tarjousälyn hallittu sisältö');
  });
});