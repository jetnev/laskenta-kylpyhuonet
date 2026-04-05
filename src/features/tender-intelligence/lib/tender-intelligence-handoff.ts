import { buildAppUrl, type AppLocationState, type TenderIntelligenceLocationState } from '@/lib/app-routing';

import type { TenderDraftPackage, TenderPackage } from '../types/tender-intelligence';
import type { TenderEditorManagedBlockId } from '../types/tender-editor-import';

export type TenderIntelligenceHandoffIntent = NonNullable<TenderIntelligenceLocationState['intent']>;

export interface TenderIntelligenceQuoteEditorHandoffInput {
  tenderPackageId: string;
  draftPackageId: string;
  importedQuoteId: string;
  intent: TenderIntelligenceHandoffIntent;
  blockIds?: TenderEditorManagedBlockId[];
}

export interface TenderIntelligenceQuoteEditorHandoffLink {
  location: AppLocationState;
  url: string;
  label: string;
  intent: TenderIntelligenceHandoffIntent;
  blockIds: TenderEditorManagedBlockId[];
}

export interface TenderIntelligenceResolvedHandoff {
  isActive: boolean;
  status: 'none' | 'ready' | 'missing_context' | 'missing_tender_package' | 'missing_draft_package' | 'package_mismatch';
  context: TenderIntelligenceLocationState | null;
  resolvedTenderPackageId: string | null;
  resolvedDraftPackageId: string | null;
  focusedBlockIds: TenderEditorManagedBlockId[];
  bannerTone: 'default' | 'warning';
  title: string | null;
  description: string | null;
  ctaLabel: string | null;
}

function normalizeBlockIds(blockIds?: string[] | null) {
  if (!blockIds || blockIds.length < 1) {
    return [];
  }

  return [...new Set(
    blockIds
      .map((blockId) => blockId.trim())
      .filter(Boolean),
  )] as TenderEditorManagedBlockId[];
}

export function resolveTenderIntelligenceHandoffLabel(intent: TenderIntelligenceHandoffIntent) {
  switch (intent) {
    case 'open-source-draft':
      return 'Avaa lähdeluonnos Tarjousälyssä';
    case 'reimport-managed-import':
      return 'Palaa hallittuun importtiin';
    case 'repair-managed-import':
      return 'Korjaa Tarjousälyn hallittu sisältö';
    default:
      return intent;
  }
}

export function buildTenderIntelligenceQuoteEditorHandoff(
  input: TenderIntelligenceQuoteEditorHandoffInput,
): TenderIntelligenceQuoteEditorHandoffLink {
  const blockIds = normalizeBlockIds(input.blockIds);
  const location: AppLocationState = {
    page: 'tender-intelligence',
    tenderContext: {
      source: 'quote-editor',
      tenderPackageId: input.tenderPackageId,
      draftPackageId: input.draftPackageId,
      importedQuoteId: input.importedQuoteId,
      intent: input.intent,
      blockIds,
    },
  };

  return {
    location,
    url: buildAppUrl(location),
    label: resolveTenderIntelligenceHandoffLabel(input.intent),
    intent: input.intent,
    blockIds,
  };
}

export function resolveTenderIntelligenceLocationHandoff(routeState: AppLocationState): TenderIntelligenceLocationState | null {
  if (routeState.page !== 'tender-intelligence' || !routeState.tenderContext?.source) {
    return null;
  }

  return {
    ...routeState.tenderContext,
    blockIds: normalizeBlockIds(routeState.tenderContext.blockIds),
  };
}

export function resolveTenderIntelligenceHandoff(
  routeState: AppLocationState,
  options: {
    draftPackage: Pick<TenderDraftPackage, 'id' | 'tenderPackageId'> | null;
    tenderPackage: Pick<TenderPackage, 'id'> | null;
  },
): TenderIntelligenceResolvedHandoff {
  const context = resolveTenderIntelligenceLocationHandoff(routeState);

  if (!context) {
    return {
      isActive: false,
      status: 'none',
      context: null,
      resolvedTenderPackageId: null,
      resolvedDraftPackageId: null,
      focusedBlockIds: [],
      bannerTone: 'default',
      title: null,
      description: null,
      ctaLabel: null,
    };
  }

  const ctaLabel = context.intent ? resolveTenderIntelligenceHandoffLabel(context.intent) : null;
  const focusedBlockIds = normalizeBlockIds(context.blockIds);

  if (!context.tenderPackageId || !context.draftPackageId || !context.importedQuoteId || !context.intent) {
    return {
      isActive: true,
      status: 'missing_context',
      context,
      resolvedTenderPackageId: context.tenderPackageId ?? null,
      resolvedDraftPackageId: context.draftPackageId ?? null,
      focusedBlockIds,
      bannerTone: 'warning',
      title: 'Editorin lähdekonteksti oli puutteellinen',
      description: 'Tarjousäly avattiin editorista, mutta linkki ei sisältänyt koko draft/import-kontekstia. Näytetään paras saatavilla oleva työtila ilman rikkinäistä kohdistusta.',
      ctaLabel,
    };
  }

  if (!options.tenderPackage) {
    return {
      isActive: true,
      status: 'missing_tender_package',
      context,
      resolvedTenderPackageId: null,
      resolvedDraftPackageId: null,
      focusedBlockIds,
      bannerTone: 'warning',
      title: 'Lähdepakettia ei löytynyt Tarjousälystä',
      description: 'QuoteEditorista tullut linkki osoitti tarjouspyyntöpakettiin, jota ei ole enää saatavilla. Tarjousäly avautui ilman rikkinäistä draft-valintaa.',
      ctaLabel,
    };
  }

  if (!options.draftPackage) {
    return {
      isActive: true,
      status: 'missing_draft_package',
      context,
      resolvedTenderPackageId: context.tenderPackageId,
      resolvedDraftPackageId: null,
      focusedBlockIds,
      bannerTone: 'warning',
      title: 'Lähdeluonnosta ei löytynyt enää',
      description: 'QuoteEditorista tullut linkki osoitti draft packageen, jota ei löytynyt enää tästä tarjouspyyntöpaketista. Tarjousäly kohdistettiin silti oikeaan tarjouspyyntöpakettiin.',
      ctaLabel,
    };
  }

  if (options.draftPackage.tenderPackageId !== context.tenderPackageId) {
    return {
      isActive: true,
      status: 'package_mismatch',
      context,
      resolvedTenderPackageId: options.draftPackage.tenderPackageId,
      resolvedDraftPackageId: options.draftPackage.id,
      focusedBlockIds,
      bannerTone: 'warning',
      title: 'Lähdeluonnos kuului eri tarjouspyyntöpakettiin',
      description: 'Editorista tullut handoff sisälsi ristiriitaisen tarjouspyyntöpaketin. Tarjousäly avasi löytyneen draft packagen sen oikeassa lähdepaketissa, jotta korjaus voidaan tehdä hallitusti.',
      ctaLabel,
    };
  }

  const intentDescription = context.intent === 'repair-managed-import'
    ? 'QuoteEditor ohjasi sinut tänne, koska Tarjousälyn hallittu sisältö pitää korjata tai re-importoida lähdeluonnoksesta käsin.'
    : context.intent === 'reimport-managed-import'
      ? 'QuoteEditor ohjasi sinut tänne, koska hallittu sisältö kannattaa päivittää Tarjousälyn re-importin kautta editorin sijaan.'
      : 'QuoteEditor avasi suoraan oikean lähdeluonnoksen, jotta näet mistä hallittu import-sisältö on peräisin.';

  return {
    isActive: true,
    status: 'ready',
    context,
    resolvedTenderPackageId: context.tenderPackageId,
    resolvedDraftPackageId: context.draftPackageId,
    focusedBlockIds,
    bannerTone: 'default',
    title: ctaLabel,
    description: intentDescription,
    ctaLabel,
  };
}