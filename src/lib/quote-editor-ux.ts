import {
  calculateQuoteRow,
  formatCurrency,
  getQuoteExtraChargeLines,
  getQuoteRowPricingModel,
  getQuoteRowUnitPricingMode,
  type ValidationResult,
} from './calculations';
import type { Quote, QuoteRow, ScheduleMilestone } from './types';

export type QuoteEditorStepId = 'basics' | 'rows' | 'costs' | 'finishing' | 'review';
export type QuoteEditorStepStatus = 'not-started' | 'in-progress' | 'completed';
export type QuoteChecklistState = 'ok' | 'warning' | 'missing' | 'optional';

export interface QuoteEditorStep {
  id: QuoteEditorStepId;
  title: string;
  description: string;
  status: QuoteEditorStepStatus;
  summary: string;
  optional?: boolean;
}

export interface QuoteCompletionChecklistItem {
  id: string;
  stepId: QuoteEditorStepId;
  label: string;
  message: string;
  state: QuoteChecklistState;
}

interface QuoteEditorProgressInput {
  quote: Quote;
  rows: QuoteRow[];
  validation: ValidationResult;
  quoteOwnerLabel: string;
  visibleScheduleMilestones: ScheduleMilestone[];
}

const VAT_WARNING_FREE_VALUES = new Set([0, 10, 14, 24, 25.5]);

function hasAnyAdditionalCost(quote: Quote) {
  return getQuoteExtraChargeLines(quote).some((line) => line.amount > 0);
}

function hasTravelMismatch(quote: Quote) {
  const hasKilometers = (quote.travelKilometers || 0) > 0;
  const hasRate = (quote.travelRatePerKm || 0) > 0;
  return hasKilometers !== hasRate;
}

function hasPotentialInstallationDoubleCount(quote: Quote, rows: QuoteRow[]) {
  if ((quote.installationCosts || 0) <= 0) {
    return false;
  }

  return rows.some(
    (row) =>
      row.mode !== 'section' &&
      row.mode !== 'charge' &&
      (row.mode === 'installation' || row.mode === 'product_installation') &&
      row.installationPrice > 0
  );
}

function getBillableRows(rows: QuoteRow[]) {
  return rows.filter((row) => row.mode !== 'section');
}

function getInvalidBillableRowCount(rows: QuoteRow[]) {
  return getBillableRows(rows).filter((row) => {
    if (!row.productName.trim()) {
      return true;
    }

    if (row.quantity <= 0) {
      return true;
    }

    if (getQuoteRowPricingModel(row) === 'unit_price') {
      return row.salesPrice <= 0;
    }

    return (row.overridePrice ?? 0) <= 0;
  }).length;
}

function getMarginOverrideWarnings(rows: QuoteRow[]) {
  return getBillableRows(rows).filter((row) => {
    if (getQuoteRowPricingModel(row) !== 'unit_price') {
      return false;
    }

    if (getQuoteRowUnitPricingMode(row) !== 'margin' || !row.manualSalesPrice) {
      return false;
    }

    const calculation = calculateQuoteRow(row);
    return calculation.marginAmount < 0 || calculation.marginPercent < row.marginPercent;
  });
}

function hasTermsSnapshot(quote: Quote) {
  return Boolean(quote.termsId || quote.termsSnapshotContentMd?.trim());
}

function getBasicsStatus(input: QuoteEditorProgressInput): QuoteEditorStep {
  const hasQuoteNumber = Boolean(input.quote.quoteNumber.trim());
  const hasValidity = Boolean(input.quote.validUntil);
  const hasOwner = Boolean(input.quote.ownerUserId);
  const hasTerms = hasTermsSnapshot(input.quote);
  const hasCorePricingSetup = Number.isFinite(input.quote.selectedMarginPercent) && Number.isFinite(input.quote.vatPercent);
  const completed = hasQuoteNumber && hasValidity && hasOwner && hasTerms && hasCorePricingSetup;
  const started = completed || Boolean(input.quote.title.trim() || hasTerms || hasQuoteNumber || hasValidity);

  return {
    id: 'basics',
    title: 'Perustiedot',
    description: 'Täytä tarjouksen tunnisteet, voimassaolo ja oletushinnoittelun asetukset.',
    status: completed ? 'completed' : started ? 'in-progress' : 'not-started',
    summary: completed
      ? `${input.quote.quoteNumber} · ${input.quoteOwnerLabel}`
      : hasQuoteNumber || hasValidity
        ? 'Tunnisteita ja asetuksia on aloitettu'
        : 'Tarjouksen perustiedot puuttuvat',
  };
}

function getRowsStatus(input: QuoteEditorProgressInput): QuoteEditorStep {
  const billableRows = getBillableRows(input.rows);
  const invalidRows = getInvalidBillableRowCount(input.rows);
  const completed = billableRows.length > 0 && invalidRows === 0;

  return {
    id: 'rows',
    title: 'Tarjousrivit',
    description: 'Lisää myytävät tuotteet, työrivit, väliotsikot ja erilliset veloitukset.',
    status: completed ? 'completed' : billableRows.length > 0 ? 'in-progress' : 'not-started',
    summary: billableRows.length > 0
      ? `${billableRows.length} laskutettavaa riviä`
      : 'Tarjouksella ei ole vielä rivejä',
  };
}

function getCostsStatus(input: QuoteEditorProgressInput): QuoteEditorStep {
  const hasAdditionalCosts = hasAnyAdditionalCost(input.quote);
  const hasMismatch = hasTravelMismatch(input.quote) || hasPotentialInstallationDoubleCount(input.quote, input.rows);

  return {
    id: 'costs',
    title: 'Lisäkulut',
    description: 'Lisää tarvittaessa työmaan logistiikka-, purku- ja projektikulut omaksi kokonaisuudekseen.',
    status: hasAdditionalCosts && !hasMismatch ? 'completed' : hasAdditionalCosts || hasMismatch ? 'in-progress' : 'not-started',
    summary: hasAdditionalCosts
      ? `${formatCurrency(getQuoteExtraChargeLines(input.quote).reduce((sum, line) => sum + line.amount, 0))} lisäkuluja`
      : 'Valinnainen vaihe',
    optional: true,
  };
}

function getFinishingStatus(input: QuoteEditorProgressInput): QuoteEditorStep {
  const hasTerms = hasTermsSnapshot(input.quote);
  const hasCustomerNotes = Boolean(input.quote.notes?.trim());
  const hasInternalNotes = Boolean(input.quote.internalNotes?.trim());
  const hasSchedule = input.visibleScheduleMilestones.length > 0;
  const completed = hasTerms && (hasCustomerNotes || hasInternalNotes || hasSchedule);
  const started = hasTerms || hasCustomerNotes || hasInternalNotes || hasSchedule;

  return {
    id: 'finishing',
    title: 'Ehdot ja huomiot',
    description: 'Viimeistele ehtoteksti, aikataulu ja asiakkaalle näkyvät tai sisäiset huomiot.',
    status: completed ? 'completed' : started ? 'in-progress' : 'not-started',
    summary: started
      ? `${hasTerms ? 'Ehdot valittu' : 'Ehtoja ei ole viimeistelty'} · ${input.visibleScheduleMilestones.length} määräaikaa`
      : 'Ehdot, aikataulu ja huomiot ovat vielä avaamatta',
  };
}

function getReviewStatus(input: QuoteEditorProgressInput): QuoteEditorStep {
  const hasReviewSignals = input.validation.errors.length > 0 || input.validation.warnings.length > 0 || getBillableRows(input.rows).length > 0;
  const completed = input.validation.isValid && input.validation.warnings.length === 0;

  return {
    id: 'review',
    title: 'Viimeistely ja lähetys',
    description: 'Tarkista yhteenveto, puuttuvat tiedot ja lähetysvalmius ennen asiakkaalle vientiä.',
    status: completed ? 'completed' : hasReviewSignals ? 'in-progress' : 'not-started',
    summary: completed
      ? 'Tarjous on valmis lähetettäväksi'
      : input.validation.errors.length > 0
        ? `${input.validation.errors.length} estävää puutetta`
        : input.validation.warnings.length > 0
          ? `${input.validation.warnings.length} tarkistettavaa asiaa`
          : 'Yhteenveto odottaa tarkistusta',
  };
}

export function getQuoteEditorSteps(input: QuoteEditorProgressInput): QuoteEditorStep[] {
  return [
    getBasicsStatus(input),
    getRowsStatus(input),
    getCostsStatus(input),
    getFinishingStatus(input),
    getReviewStatus(input),
  ];
}

export function getQuoteCompletionChecklist(input: QuoteEditorProgressInput): QuoteCompletionChecklistItem[] {
  const hasTerms = hasTermsSnapshot(input.quote);
  const billableRows = getBillableRows(input.rows);
  const marginOverrideWarnings = getMarginOverrideWarnings(input.rows);
  const additionalCostConflicts = hasPotentialInstallationDoubleCount(input.quote, input.rows);
  const unusualVat = !VAT_WARNING_FREE_VALUES.has(input.quote.vatPercent);

  return [
    {
      id: 'valid-until',
      stepId: 'basics',
      label: 'Voimassaoloaika',
      message: input.quote.validUntil ? `Voimassa ${input.quote.validUntil}` : 'Voimassaoloaika puuttuu.',
      state: input.quote.validUntil ? 'ok' : 'missing',
    },
    {
      id: 'terms-template',
      stepId: 'finishing',
      label: 'Ehtopohja tai ehtoteksti',
      message: hasTerms ? 'Tarjouksella on ehtopohja tai tallennettu ehtoteksti.' : 'Ehtopohjaa ei ole valittu.',
      state: hasTerms ? 'ok' : 'missing',
    },
    {
      id: 'billable-rows',
      stepId: 'rows',
      label: 'Tarjousrivit',
      message: billableRows.length > 0 ? `${billableRows.length} laskutettavaa riviä tarjouksella.` : 'Tarjouksessa ei ole rivejä.',
      state: billableRows.length > 0 ? 'ok' : 'missing',
    },
    {
      id: 'additional-costs',
      stepId: 'costs',
      label: 'Lisäkulut ja työmaan erät',
      message: hasAnyAdditionalCost(input.quote)
        ? 'Lisäkulut on täytetty ja ne vaikuttavat loppusummaan.'
        : 'Lisäkulut ovat valinnaisia ja voidaan jättää tyhjäksi.',
      state: hasAnyAdditionalCost(input.quote) ? 'ok' : 'optional',
    },
    {
      id: 'manual-overrides',
      stepId: 'rows',
      label: 'Ylikirjoitetut asiakashinnat',
      message: marginOverrideWarnings.length > 0
        ? `${marginOverrideWarnings.length} riviä poikkeaa tavoitekatteesta tai menee alle kustannuksen.`
        : 'Ylikirjoitetut asiakashinnat eivät riko tavoitekatetta.',
      state: marginOverrideWarnings.length > 0 ? 'warning' : 'ok',
    },
    {
      id: 'vat',
      stepId: 'basics',
      label: 'ALV-asetus',
      message: unusualVat
        ? `ALV ${input.quote.vatPercent} % poikkeaa yleisimmistä asetuksista.`
        : `ALV ${input.quote.vatPercent} % on asetettu.`,
      state: unusualVat ? 'warning' : 'ok',
    },
    {
      id: 'travel-costs',
      stepId: 'costs',
      label: 'Matkakulujen syötepari',
      message: hasTravelMismatch(input.quote)
        ? 'Kilometrit ja km-hinta eivät ole tasapainossa. Syötä molemmat tai jätä molemmat tyhjäksi.'
        : 'Kilometrit ja km-hinta ovat linjassa.',
      state: hasTravelMismatch(input.quote) ? 'warning' : 'ok',
    },
    {
      id: 'installation-double-count',
      stepId: 'costs',
      label: 'Asennuskulujen mahdollinen päällekkäisyys',
      message: additionalCostConflicts
        ? 'Erillinen asennuskulu on täytetty samalla kun riveillä on asennuksen taustahintoja. Tarkista, ettei sama kustannus näy kahdesti.'
        : 'Asennuskuluja ei näytä olevan päällekkäin.',
      state: additionalCostConflicts ? 'warning' : 'ok',
    },
  ];
}

export function getQuoteEditorStepStatusLabel(status: QuoteEditorStepStatus) {
  if (status === 'completed') {
    return 'Valmis';
  }

  if (status === 'in-progress') {
    return 'Kesken';
  }

  return 'Ei aloitettu';
}
