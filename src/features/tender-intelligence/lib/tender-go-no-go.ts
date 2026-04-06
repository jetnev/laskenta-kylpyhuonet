import { buildTenderDraftPackageReadiness } from './tender-draft-package';
import type { TenderGoNoGoRecommendation, TenderPackageDetails } from '../types/tender-intelligence';

export type TenderGoNoGoSignalState = 'ready' | 'warning' | 'blocked';

export interface TenderGoNoGoSignal {
  key: 'assessment' | 'analysis' | 'risks' | 'workflow' | 'draft';
  label: string;
  state: TenderGoNoGoSignalState;
  detail: string;
}

export interface TenderGoNoGoDecisionSupport {
  recommendation: TenderGoNoGoRecommendation;
  state: TenderGoNoGoSignalState;
  summary: string;
  signals: TenderGoNoGoSignal[];
  nextActions: string[];
  unresolvedWorkflowCount: number;
  openHighRiskCount: number;
  canProceed: boolean;
}

function countUnresolvedWorkflowItems(packageDetails: TenderPackageDetails) {
  return [
    ...packageDetails.results.requirements,
    ...packageDetails.results.missingItems,
    ...packageDetails.results.riskFlags,
    ...packageDetails.results.referenceSuggestions,
    ...packageDetails.results.reviewTasks,
  ].filter((item) => item.reviewStatus === 'unreviewed' || item.resolutionStatus === 'open' || item.resolutionStatus === 'in_progress').length;
}

function buildRecommendationSummary(recommendation: TenderGoNoGoRecommendation) {
  switch (recommendation) {
    case 'go':
      return 'Nykyiset signaalit tukevat tarjouksen jatkamista.';
    case 'conditional-go':
      return 'Tarjous voidaan jättää, mutta ennen päätöstä pitää sulkea alla näkyvät ehdolliset kohdat.';
    case 'no-go':
      return 'Nykyiset signaalit puoltavat tarjouksen keskeyttämistä tai palauttamista valmisteluun.';
    case 'pending':
    default:
      return 'Go / No-Go -suositus odottaa vielä tarkempaa päätöstä, joten katso alla olevat signaalit ennen editorivientiä.';
  }
}

export function buildTenderGoNoGoDecisionSupport(packageDetails: TenderPackageDetails): TenderGoNoGoDecisionSupport {
  const draftReadiness = buildTenderDraftPackageReadiness(packageDetails);
  const assessment = packageDetails.results.goNoGoAssessment;
  const recommendation = assessment?.recommendation ?? 'pending';
  const unresolvedWorkflowCount = countUnresolvedWorkflowItems(packageDetails);
  const openHighRiskCount = packageDetails.results.riskFlags.filter(
    (risk) => risk.severity === 'high' && (risk.resolutionStatus === 'open' || risk.resolutionStatus === 'in_progress'),
  ).length;
  const extractedChunkCount = packageDetails.analysisReadiness.coverage.extractedChunks;
  const latestJobCompleted = packageDetails.latestAnalysisJob?.status === 'completed';

  const signals: TenderGoNoGoSignal[] = [
    {
      key: 'assessment',
      label: 'Go / No-Go -suositus',
      state:
        recommendation === 'go'
          ? 'ready'
          : recommendation === 'no-go'
            ? 'blocked'
            : 'warning',
      detail: assessment?.summary?.trim() || buildRecommendationSummary(recommendation),
    },
    {
      key: 'analysis',
      label: 'Analyysi ja evidence',
      state:
        packageDetails.documents.length < 1 || extractedChunkCount < 1
          ? 'blocked'
          : latestJobCompleted
            ? 'ready'
            : 'warning',
      detail:
        packageDetails.documents.length < 1
          ? 'Pakettiin ei ole vielä lisätty dokumentteja päätöstuen pohjaksi.'
          : extractedChunkCount < 1
            ? 'Analyysi ei perustu vielä yhteenkään purettuun evidence-chunkiin.'
            : latestJobCompleted
              ? `Viimeisin analyysi on valmis ja evidence-pohjana on ${extractedChunkCount} chunkia.`
              : 'Evidence-pohja on olemassa, mutta analyysiajoa ei ole vielä saatettu valmiiksi viimeisimpään päätöstarkasteluun.',
    },
    {
      key: 'risks',
      label: 'Korkean prioriteetin riskit',
      state: openHighRiskCount > 0 ? 'blocked' : 'ready',
      detail:
        openHighRiskCount > 0
          ? `${openHighRiskCount} korkean prioriteetin riskiriviä on yhä avoinna.`
          : 'Korkean prioriteetin avoimia riskejä ei ole tällä hetkellä näkyvissä.',
    },
    {
      key: 'workflow',
      label: 'Avoimet workflow-rivit',
      state: unresolvedWorkflowCount > 0 ? 'warning' : 'ready',
      detail:
        unresolvedWorkflowCount > 0
          ? `${unresolvedWorkflowCount} workflow-riviä odottaa yhä tarkistusta tai ratkaisua.`
          : 'Review-workflow ei sisällä enää avoimia tai tarkistamattomia rivejä.',
    },
    {
      key: 'draft',
      label: 'Draft package -valmius',
      state: draftReadiness.canGenerate ? 'ready' : 'warning',
      detail:
        draftReadiness.canGenerate
          ? 'Hyväksytty ydinsisältö riittää draft package -vaiheeseen ja editoriviennin valmisteluun.'
          : draftReadiness.blockedReason ?? 'Draft package ei ole vielä valmis editorivientiä varten.',
    },
  ];

  const state: TenderGoNoGoSignalState = signals.some((signal) => signal.state === 'blocked')
    ? 'blocked'
    : signals.some((signal) => signal.state === 'warning')
      ? 'warning'
      : 'ready';

  const nextActions = [
    ...(signals.find((signal) => signal.key === 'analysis')?.state !== 'ready'
      ? ['Varmista että pakettiin on purettu evidence-lähteet ja että analyysiajo on valmis ennen lopullista päätöstä.']
      : []),
    ...(openHighRiskCount > 0
      ? ['Ratkaise tai hylkää korkean prioriteetin riskit ennen tarjouksen jatkopäätöstä.']
      : []),
    ...(unresolvedWorkflowCount > 0
      ? ['Sulje tai delegoi avoimet workflow-rivit ennen editorivientiä.']
      : []),
    ...(!draftReadiness.canGenerate
      ? ['Hyväksy vähintään yksi vaatimus, referenssi tai draft artefakti, jotta luonnospaketti on käyttökelpoinen.']
      : []),
    ...(recommendation === 'conditional-go'
      ? ['Käsittele ehdollisen go-päätöksen avoimet ehdot ennen sitovaa tarjoustoimea.']
      : recommendation === 'no-go'
        ? ['Keskeytä editorivienti tai palauta paketti valmisteluun, kunnes no-go-syy on käsitelty.']
        : recommendation === 'pending'
          ? ['Tee eksplisiittinen Go / No-Go -päätös, kun review-tilanne on riittävän kypsä.']
          : []),
  ];

  return {
    recommendation,
    state,
    summary: assessment?.summary?.trim() || buildRecommendationSummary(recommendation),
    signals,
    nextActions: [...new Set(nextActions)],
    unresolvedWorkflowCount,
    openHighRiskCount,
    canProceed: state !== 'blocked' && recommendation !== 'no-go',
  };
}