import { TENDER_ANALYSIS_RUNNER_FUNCTION_NAME } from '../types/tender-analysis-runner-contract';
import { TENDER_DOCUMENT_EXTRACTION_RUNNER_FUNCTION_NAME } from '../types/tender-document-extraction-contract';
import { TENDER_INTELLIGENCE_STORAGE_BUCKET } from './tender-document-upload';
import type { TenderIntelligenceEnvironmentIssueType } from './tender-intelligence-errors';

export type TenderIntelligenceReadinessState = 'ready' | 'check' | 'blocked';

export interface TenderIntelligenceReadinessItem {
  key: 'database' | 'storage' | 'extraction' | 'analysis' | 'rollout';
  label: string;
  state: TenderIntelligenceReadinessState;
  detail: string;
}

function resolveItemState(
  issueType: TenderIntelligenceEnvironmentIssueType,
  key: TenderIntelligenceReadinessItem['key'],
): TenderIntelligenceReadinessState {
  if (key === 'rollout') {
    return 'check';
  }

  if (issueType === 'schema') {
    return key === 'database' ? 'blocked' : 'check';
  }

  if (issueType === 'storage') {
    if (key === 'database') {
      return 'ready';
    }

    return key === 'storage' ? 'blocked' : 'check';
  }

  if (issueType === 'extraction-runner') {
    if (key === 'database' || key === 'storage') {
      return 'ready';
    }

    return key === 'extraction' ? 'blocked' : 'check';
  }

  if (issueType === 'analysis-runner') {
    if (key === 'database' || key === 'storage' || key === 'extraction') {
      return 'ready';
    }

    return key === 'analysis' ? 'blocked' : 'check';
  }

  return 'check';
}

export function getTenderIntelligenceEnvironmentIssueTitle(issueType: TenderIntelligenceEnvironmentIssueType) {
  switch (issueType) {
    case 'schema':
      return 'Tarjousälyn tietokantaperusta puuttuu tästä ympäristöstä';
    case 'storage':
      return 'Tarjousälyn dokumenttivarasto ei ole valmis tässä ympäristössä';
    case 'analysis-runner':
      return 'Tarjousälyn analyysipalvelu ei ole valmis tässä ympäristössä';
    case 'extraction-runner':
      return 'Tarjousälyn extraction-palvelu ei ole valmis tässä ympäristössä';
    default:
      return 'Tarjousälyn ympäristö tarvitsee tarkistuksen';
  }
}

export function buildTenderIntelligenceReadinessItems(issueType: TenderIntelligenceEnvironmentIssueType): TenderIntelligenceReadinessItem[] {
  return [
    {
      key: 'database',
      label: 'Tietokantamigraatiot ja schema cache',
      state: resolveItemState(issueType, 'database'),
      detail: 'Tarjousälyn taulujen pitää olla vietyinä tähän Supabase-ympäristöön ennen frontend-julkaisua.',
    },
    {
      key: 'storage',
      label: `Storage bucket ${TENDER_INTELLIGENCE_STORAGE_BUCKET}`,
      state: resolveItemState(issueType, 'storage'),
      detail: 'Dokumenttien lataus tarvitsee erillisen storage-bucketin sekä toimivat oikeudet upload- ja delete-poluille.',
    },
    {
      key: 'extraction',
      label: `Edge Function ${TENDER_DOCUMENT_EXTRACTION_RUNNER_FUNCTION_NAME}`,
      state: resolveItemState(issueType, 'extraction'),
      detail: 'Dokumenttien extraction käynnistyy serveripuolella tästä rajapinnasta, ei frontendistä suoraan.',
    },
    {
      key: 'analysis',
      label: `Edge Function ${TENDER_ANALYSIS_RUNNER_FUNCTION_NAME}`,
      state: resolveItemState(issueType, 'analysis'),
      detail: 'Baseline-analyysi tarvitsee julkaistun analyysirunnerin ennen kuin package voidaan prosessoida loppuun.',
    },
    {
      key: 'rollout',
      label: 'Rollout-järjestys ja smoke test',
      state: resolveItemState(issueType, 'rollout'),
      detail: 'Vie tietokantamuutos ja palvelurajat ensin, julkaise frontend vasta niiden jälkeen ja tee lopuksi Tarjousäly-smoke test.',
    },
  ];
}

export function buildTenderIntelligenceReadinessSteps(issueType: TenderIntelligenceEnvironmentIssueType) {
  const firstStep = issueType === 'schema'
    ? 'Tarkista linked-projektia vasten migraatiot ensin kuivaharjoittelulla komennolla `npx supabase db push --linked --dry-run` ja vie sen jälkeen Tarjousälyn migraatiot tähän ympäristöön.'
    : issueType === 'storage'
      ? 'Varmista että Supabase Storage -bucket `tender-intelligence` on luotu ja että bucketin oikeudet sallivat dokumenttien latauksen.'
      : issueType === 'extraction-runner'
        ? 'Julkaise Edge Function `tender-document-extractor` tähän ympäristöön ja varmista, että se on kytketty samaan projektiin kuin frontend.'
        : 'Julkaise Edge Function `tender-analysis-runner` tähän ympäristöön ja varmista, että se käyttää saman ympäristön tietokantaa kuin frontend.';

  return [
    firstStep,
    'Pidä rollout-järjestys kurinalaisena: tietokantamuutokset ja palvelurajat ensin, frontend vasta niiden jälkeen.',
    'Aja lopuksi Tarjousälylle smoke test: sivu avautuu, dokumentin upload toimii, extraction käynnistyy, analyysi etenee ja draft package -näkymä latautuu.',
  ];
}