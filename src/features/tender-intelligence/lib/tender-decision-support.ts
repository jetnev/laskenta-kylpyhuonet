import { getLatestSuccessfulTenderAnalysisJob, isTenderAnalysisJobActive } from './tender-analysis';
import { isTenderReferenceRequirementCandidate } from './tender-reference-matching';
import { buildTenderWorkflowSummary } from './tender-review-workflow';
import type { TenderGoNoGoRecommendation, TenderPackageDetails } from '../types/tender-intelligence';

export type TenderDecisionSupportSignalKey =
  | 'analysis'
  | 'requirements'
  | 'missing-items'
  | 'risks'
  | 'workflow'
  | 'references';

export type TenderDecisionSupportSignalStatus = 'positive' | 'warning' | 'critical' | 'neutral';

export interface TenderDecisionSupportSignal {
  key: TenderDecisionSupportSignalKey;
  title: string;
  status: TenderDecisionSupportSignalStatus;
  countLabel: string;
  summary: string;
  recommendedAction: string | null;
}

export interface TenderDecisionSupportSummary {
  storedRecommendation: TenderGoNoGoRecommendation;
  storedSummary: string | null;
  storedConfidence: number | null;
  storedUpdatedAt: string | null;
  operationalRecommendation: TenderGoNoGoRecommendation;
  operationalSummary: string;
  criticalCount: number;
  warningCount: number;
  positiveCount: number;
  neutralCount: number;
  blockingReasons: string[];
  nextActions: string[];
  workflowSummary: ReturnType<typeof buildTenderWorkflowSummary>;
  signals: TenderDecisionSupportSignal[];
  stats: {
    totalResults: number;
    openReviewTaskCount: number;
    missingRequirementCount: number;
    atRiskRequirementCount: number;
    openMissingItemCount: number;
    openRiskCount: number;
    unresolvedReferenceSuggestionCount: number;
  };
}

interface DecisionSignalBuildResult extends TenderDecisionSupportSignal {
  blockingReasons: string[];
}

function addUnique(target: string[], value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return;
  }

  if (!target.includes(normalized)) {
    target.push(normalized);
  }
}

function formatInlineCounts(parts: string[], emptyLabel: string) {
  return parts.length > 0 ? parts.join(' • ') : emptyLabel;
}

function buildOperationalSummary(input: {
  operationalRecommendation: TenderGoNoGoRecommendation;
  blockingReasons: string[];
  criticalCount: number;
  warningCount: number;
}) {
  if (input.operationalRecommendation === 'pending') {
    return input.blockingReasons[0] ?? 'Päätöstuki odottaa ensimmäistä analyysiä tai analyysille kelpaavaa dataa.';
  }

  if (input.operationalRecommendation === 'no-go') {
    const lead = input.blockingReasons[0] ?? 'Paketissa on kriittisiä avoimia esteitä.';
    return `Nykyinen workflow-pohjainen tila on no-go. ${lead}`;
  }

  if (input.operationalRecommendation === 'conditional-go') {
    return input.warningCount > 0
      ? `Pohja päätökselle on olemassa, mutta ${input.warningCount} signaalia vaatii vielä toimenpiteitä ennen täyttä go-päätöstä.`
      : 'Päätös voi edetä vain ehtojen kautta nykyisen workflow-tilan perusteella.';
  }

  return input.criticalCount > 0
    ? 'Signaalit näyttävät myönteisiltä, mutta kriittiset esteet tulee vielä tarkistaa.'
    : 'Nykyiset signaalit eivät näytä avoimia kovia esteitä. Paketti voidaan viedä go/no-go-keskusteluun tämän hetken datalla.';
}

export function buildTenderDecisionSupport(selectedPackage: TenderPackageDetails): TenderDecisionSupportSummary {
  const results = selectedPackage.results;
  const workflowSummary = buildTenderWorkflowSummary(results);
  const latestSuccessfulJob = getLatestSuccessfulTenderAnalysisJob(selectedPackage.analysisJobs);
  const latestJob = selectedPackage.latestAnalysisJob;
  const analysisInProgress = latestJob ? isTenderAnalysisJobActive(latestJob.status) : false;
  const totalResults =
    results.requirements.length +
    results.missingItems.length +
    results.riskFlags.length +
    results.referenceSuggestions.length +
    results.draftArtifacts.length +
    results.reviewTasks.length;
  const hasDecisionData = totalResults > 0 || Boolean(results.goNoGoAssessment) || Boolean(latestSuccessfulJob);

  const missingRequirements = results.requirements.filter((item) => item.status === 'missing');
  const atRiskRequirements = results.requirements.filter((item) => item.status === 'at-risk');
  const unreviewedRequirements = results.requirements.filter((item) => item.reviewStatus === 'unreviewed');
  const openMissingItems = results.missingItems.filter((item) => item.status === 'open');
  const highOpenMissingItems = openMissingItems.filter((item) => item.severity === 'high');
  const openRisks = results.riskFlags.filter((item) => item.status === 'open');
  const highOpenRisks = openRisks.filter((item) => item.severity === 'high');
  const acceptedRisks = results.riskFlags.filter((item) => item.status === 'accepted');
  const openReviewTasks = results.reviewTasks.filter((item) => item.status !== 'done');
  const openDecisionTasks = openReviewTasks.filter((item) => item.taskType === 'decision');
  const referenceRequirements = results.requirements.filter((item) =>
    isTenderReferenceRequirementCandidate({
      title: item.title,
      description: item.description ?? null,
      sourceExcerpt: item.sourceExcerpt ?? null,
    })
  );
  const unresolvedReferenceSuggestions = results.referenceSuggestions.filter(
    (item) => item.reviewStatus !== 'dismissed' && item.resolutionStatus !== 'resolved'
  );

  const signals: DecisionSignalBuildResult[] = [];

  if (!hasDecisionData) {
    if (selectedPackage.analysisReadiness.canStart) {
      signals.push({
        key: 'analysis',
        title: 'Analyysipohja',
        status: 'warning',
        countLabel: 'Valmis käynnistettäväksi',
        summary: 'Paketti on valmis baseline-analyysiin, mutta ajoa ei ole vielä käynnistetty.',
        recommendedAction: 'Käynnistä baseline-analyysi, jotta päätöstuki saa evidence-pohjaiset löydökset.',
        blockingReasons: [],
      });
    } else {
      const blockedReason =
        selectedPackage.analysisReadiness.blockedReason ??
        'Päätöstuki tarvitsee vähintään yhden analyysille kelpaavan dokumentin ja extraction-datan.';

      signals.push({
        key: 'analysis',
        title: 'Analyysipohja',
        status: 'critical',
        countLabel: 'Blokattu',
        summary: blockedReason,
        recommendedAction: blockedReason,
        blockingReasons: [blockedReason],
      });
    }
  } else if (analysisInProgress) {
    signals.push({
      key: 'analysis',
      title: 'Analyysipohja',
      status: 'warning',
      countLabel: 'Ajo käynnissä',
      summary: 'Uusi analyysiajo on käynnissä. Päätöstuki perustuu viimeisimpiin tallennettuihin tuloksiin, kunnes ajo valmistuu.',
      recommendedAction: 'Odota käynnissä olevan analyysiajon valmistumista ennen lopullista päätöstä.',
      blockingReasons: [],
    });
  } else {
    signals.push({
      key: 'analysis',
      title: 'Analyysipohja',
      status: 'positive',
      countLabel: `${totalResults} tulosriviä`,
      summary:
        selectedPackage.resultEvidence.length > 0
          ? `Analyysipohja on olemassa: paketilla on ${selectedPackage.resultEvidence.length} evidence-riviä päätöksenteon tueksi.`
          : 'Analyysipohja on olemassa, mutta evidence-rivejä ei ole vielä tallennettu näkyvästi tähän näkymään.',
      recommendedAction: null,
      blockingReasons: [],
    });
  }

  if (results.requirements.length < 1) {
    signals.push({
      key: 'requirements',
      title: 'Vaatimukset',
      status: 'neutral',
      countLabel: 'Ei rivejä',
      summary: 'Vaatimuksia ei ole vielä muodostettu päätöstuen käsiteltäväksi.',
      recommendedAction: null,
      blockingReasons: [],
    });
  } else if (missingRequirements.length > 0) {
    const blocker = `${missingRequirements.length} vaatimus(ta) on edelleen merkitty puuttuvaksi.`;

    signals.push({
      key: 'requirements',
      title: 'Vaatimukset',
      status: 'critical',
      countLabel: formatInlineCounts(
        [
          missingRequirements.length > 0 ? `${missingRequirements.length} puuttuu` : '',
          atRiskRequirements.length > 0 ? `${atRiskRequirements.length} riskissä` : '',
          unreviewedRequirements.length > 0 ? `${unreviewedRequirements.length} tarkistamatta` : '',
        ].filter(Boolean),
        'Valmiit'
      ),
      summary: 'Vaatimuspohja sisältää edelleen puuttuviksi merkittyjä rivejä, joten tarjousvalmius ei ole vielä riittävä go-päätökseen.',
      recommendedAction: 'Ratkaise puuttuvat vaatimukset tai merkitse niille hyväksytty käsittely ennen go-päätöstä.',
      blockingReasons: [blocker],
    });
  } else if (atRiskRequirements.length > 0 || unreviewedRequirements.length > 0) {
    signals.push({
      key: 'requirements',
      title: 'Vaatimukset',
      status: 'warning',
      countLabel: formatInlineCounts(
        [
          atRiskRequirements.length > 0 ? `${atRiskRequirements.length} riskissä` : '',
          unreviewedRequirements.length > 0 ? `${unreviewedRequirements.length} tarkistamatta` : '',
        ].filter(Boolean),
        'Keskeneräinen'
      ),
      summary: 'Vaatimusrivejä on tunnistettu, mutta osa niistä on vielä riskissä tai ilman katselmointia.',
      recommendedAction: 'Käy riskissä olevat ja tarkistamattomat vaatimukset läpi ennen lopullista päätöstä.',
      blockingReasons: [],
    });
  } else {
    signals.push({
      key: 'requirements',
      title: 'Vaatimukset',
      status: 'positive',
      countLabel: `${results.requirements.length} käsitelty`,
      summary: 'Vaatimuspohja ei sisällä avoimia puuttuvia tai riskissä olevia rivejä.',
      recommendedAction: null,
      blockingReasons: [],
    });
  }

  if (highOpenMissingItems.length > 0) {
    const blocker = `${highOpenMissingItems.length} korkean vakavuuden puute(tta) on vielä avoinna.`;

    signals.push({
      key: 'missing-items',
      title: 'Puutteet',
      status: 'critical',
      countLabel: formatInlineCounts(
        [
          openMissingItems.length > 0 ? `${openMissingItems.length} avointa` : '',
          highOpenMissingItems.length > 0 ? `${highOpenMissingItems.length} korkeaa` : '',
        ].filter(Boolean),
        'Ei puutteita'
      ),
      summary: 'Puutelistalla on korkean vakavuuden avoimia kohtia, jotka estävät päätöksen etenemisen turvallisesti.',
      recommendedAction: 'Ratkaise tai rajaa korkean vakavuuden puutteet ennen go/no-go-päätöstä.',
      blockingReasons: [blocker],
    });
  } else if (openMissingItems.length > 0) {
    signals.push({
      key: 'missing-items',
      title: 'Puutteet',
      status: 'warning',
      countLabel: `${openMissingItems.length} avointa`,
      summary: 'Puutelistalla on edelleen avoimia kohtia, mutta niiden vakavuus ei yksinään tee tilanteesta automaattista no-go:ta.',
      recommendedAction: 'Sulje avoimet puutteet tai tee niille näkyvä hyväksytty käsittelypolku.',
      blockingReasons: [],
    });
  } else {
    signals.push({
      key: 'missing-items',
      title: 'Puutteet',
      status: 'positive',
      countLabel: results.missingItems.length > 0 ? `${results.missingItems.length} ratkaistu` : 'Ei puutteita',
      summary:
        results.missingItems.length > 0
          ? 'Kaikki tunnistetut puutteet on merkitty ratkaistuiksi.'
          : 'Puutelista ei sisällä tällä hetkellä avoimia kohtia.',
      recommendedAction: null,
      blockingReasons: [],
    });
  }

  if (highOpenRisks.length > 0) {
    const blocker = `${highOpenRisks.length} korkean vakavuuden riski(ä) on edelleen avoinna.`;

    signals.push({
      key: 'risks',
      title: 'Riskit',
      status: 'critical',
      countLabel: formatInlineCounts(
        [
          openRisks.length > 0 ? `${openRisks.length} avointa` : '',
          highOpenRisks.length > 0 ? `${highOpenRisks.length} korkeaa` : '',
          acceptedRisks.length > 0 ? `${acceptedRisks.length} hyväksyttyä` : '',
        ].filter(Boolean),
        'Ei avoimia riskejä'
      ),
      summary: 'Riskilistalla on korkean vakavuuden avoimia riskejä, jotka vaativat päätöksen tai mitigation ennen etenemistä.',
      recommendedAction: 'Mitigoi tai hyväksy eksplisiittisesti korkean vakavuuden riskit ennen go/no-go-päätöstä.',
      blockingReasons: [blocker],
    });
  } else if (openRisks.length > 0 || acceptedRisks.length > 0) {
    signals.push({
      key: 'risks',
      title: 'Riskit',
      status: 'warning',
      countLabel: formatInlineCounts(
        [
          openRisks.length > 0 ? `${openRisks.length} avointa` : '',
          acceptedRisks.length > 0 ? `${acceptedRisks.length} hyväksyttyä` : '',
        ].filter(Boolean),
        'Seurannassa'
      ),
      summary: 'Riskit eivät muodosta suoraa no-go-estettä, mutta osa niistä vaatii vielä päätöksen tai hyväksytyn omistajan.',
      recommendedAction: 'Käy avoimet tai juuri hyväksytyt riskit läpi ja varmista niille omistajuus.',
      blockingReasons: [],
    });
  } else {
    signals.push({
      key: 'risks',
      title: 'Riskit',
      status: 'positive',
      countLabel: results.riskFlags.length > 0 ? `${results.riskFlags.length} käsitelty` : 'Ei riskejä',
      summary:
        results.riskFlags.length > 0
          ? 'Avoimia riskejä ei ole. Jäljellä olevat rivit on hyväksytty tai mitigioitu.'
          : 'Riskilista ei sisällä tällä hetkellä avoimia riskejä.',
      recommendedAction: null,
      blockingReasons: [],
    });
  }

  if (workflowSummary.total < 1) {
    signals.push({
      key: 'workflow',
      title: 'Review workflow',
      status: 'neutral',
      countLabel: 'Ei kohteita',
      summary: 'Workflow-yhteenveto aktivoituu, kun analyysi on tuottanut käsiteltäviä tulosrivejä.',
      recommendedAction: null,
      blockingReasons: [],
    });
  } else if (workflowSummary.needsAttention > 0 || workflowSummary.unreviewed > 0 || openReviewTasks.length > 0) {
    signals.push({
      key: 'workflow',
      title: 'Review workflow',
      status: 'warning',
      countLabel: formatInlineCounts(
        [
          workflowSummary.unreviewed > 0 ? `${workflowSummary.unreviewed} tarkistamatta` : '',
          workflowSummary.needsAttention > 0 ? `${workflowSummary.needsAttention} vaatii huomiota` : '',
          openReviewTasks.length > 0 ? `${openReviewTasks.length} avointa tehtävää` : '',
        ].filter(Boolean),
        'Hallinnassa'
      ),
      summary:
        openDecisionTasks.length > 0
          ? 'Paketilla on avoimia päätöstehtäviä tai tarkistamattomia workflow-rivejä, joten päätöstä ei kannata viedä eteenpäin ilman näkyvää omistajuutta.'
          : 'Workflow sisältää vielä tarkistamattomia tai huomiota vaativia rivejä.',
      recommendedAction:
        openDecisionTasks.length > 0
          ? 'Sulje avoimet päätöstehtävät ja käy needs_attention-rivit läpi ennen päätöspalaveria.'
          : 'Pudota tarkistamattomien rivien määrä alas tai ota ne näkyvästi omistukseen.',
      blockingReasons: [],
    });
  } else {
    signals.push({
      key: 'workflow',
      title: 'Review workflow',
      status: 'positive',
      countLabel: `${workflowSummary.resolved} ratkaistu`,
      summary: 'Workflow ei sisällä tarkistamattomia, huomiota vaativia tai avoimia tehtäviä.',
      recommendedAction: null,
      blockingReasons: [],
    });
  }

  if (referenceRequirements.length < 1 && results.referenceSuggestions.length < 1) {
    signals.push({
      key: 'references',
      title: 'Referenssit',
      status: 'neutral',
      countLabel: 'Ei signaalia',
      summary: 'Nykyinen tarjouspyyntö ei näytä tuottaneen referenssipainotteista päätössignaalia.',
      recommendedAction: null,
      blockingReasons: [],
    });
  } else if (referenceRequirements.length > 0 && results.referenceSuggestions.length < 1) {
    signals.push({
      key: 'references',
      title: 'Referenssit',
      status: 'warning',
      countLabel: `${referenceRequirements.length} vaatimusriviä`,
      summary: 'Tarjouspyyntö sisältää referenssivaatimuksia, mutta niille ei vielä näy yhtään referenssiehdotusta.',
      recommendedAction: 'Täydennä referenssikorpusta tai aja referenssiehdotusten päivitys ennen lopullista päätöstä.',
      blockingReasons: [],
    });
  } else if (unresolvedReferenceSuggestions.length > 0) {
    signals.push({
      key: 'references',
      title: 'Referenssit',
      status: 'warning',
      countLabel: formatInlineCounts(
        [
          `${results.referenceSuggestions.length} ehdotusta`,
          unresolvedReferenceSuggestions.length > 0 ? `${unresolvedReferenceSuggestions.length} avoinna` : '',
        ].filter(Boolean),
        'Valmis'
      ),
      summary: 'Referenssiehdotuksia on löytynyt, mutta osa niistä odottaa vielä hyväksyntää tai ratkaisua.',
      recommendedAction: 'Valitse käyttökelpoiset referenssit tai hylkää epäolennaiset ehdotukset.',
      blockingReasons: [],
    });
  } else {
    signals.push({
      key: 'references',
      title: 'Referenssit',
      status: 'positive',
      countLabel: `${results.referenceSuggestions.length} käsitelty`,
      summary: 'Referenssivaatimuksiin liittyvät ehdotukset on jo käsitelty näkyvästi workflow-tilassa.',
      recommendedAction: null,
      blockingReasons: [],
    });
  }

  const criticalCount = signals.filter((signal) => signal.status === 'critical').length;
  const warningCount = signals.filter((signal) => signal.status === 'warning').length;
  const positiveCount = signals.filter((signal) => signal.status === 'positive').length;
  const neutralCount = signals.filter((signal) => signal.status === 'neutral').length;
  const blockingReasons: string[] = [];
  const nextActions: string[] = [];

  signals.forEach((signal) => {
    signal.blockingReasons.forEach((value) => addUnique(blockingReasons, value));
    addUnique(nextActions, signal.recommendedAction);
  });

  let operationalRecommendation: TenderGoNoGoRecommendation;

  if (!hasDecisionData) {
    operationalRecommendation = 'pending';
  } else if (criticalCount > 0) {
    operationalRecommendation = 'no-go';
  } else if (warningCount > 0) {
    operationalRecommendation = 'conditional-go';
  } else {
    operationalRecommendation = 'go';
  }

  if (nextActions.length < 1 && operationalRecommendation === 'go') {
    nextActions.push('Vahvista go/no-go-päätös ja siirry luonnospaketin viimeistelyyn tai tarjouspalaveriin.');
  }

  return {
    storedRecommendation: results.goNoGoAssessment?.recommendation ?? 'pending',
    storedSummary: results.goNoGoAssessment?.summary ?? null,
    storedConfidence: results.goNoGoAssessment?.confidence ?? null,
    storedUpdatedAt: results.goNoGoAssessment?.updatedAt ?? null,
    operationalRecommendation,
    operationalSummary: buildOperationalSummary({
      operationalRecommendation,
      blockingReasons,
      criticalCount,
      warningCount,
    }),
    criticalCount,
    warningCount,
    positiveCount,
    neutralCount,
    blockingReasons,
    nextActions,
    workflowSummary,
    signals,
    stats: {
      totalResults,
      openReviewTaskCount: openReviewTasks.length,
      missingRequirementCount: missingRequirements.length,
      atRiskRequirementCount: atRiskRequirements.length,
      openMissingItemCount: openMissingItems.length,
      openRiskCount: openRisks.length,
      unresolvedReferenceSuggestionCount: unresolvedReferenceSuggestions.length,
    },
  };
}