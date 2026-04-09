import { describe, expect, it } from 'vitest';

import type {
  QuoteFamilySummary,
  ReportActionItem,
  ReportCustomerSummary,
  ReportProductSummary,
  ReportProjectSummary,
  ReportRowInsight,
  ReportingModel,
} from '../../../lib/reporting';
import type { Project, Quote } from '../../../lib/types';
import {
  countReportingDrillItems,
  createReportingActionDrillState,
  resolveQuoteFamilyNavigationTarget,
} from './reporting-drilldown-state';

function createFamily(overrides: Partial<QuoteFamilySummary> = {}): QuoteFamilySummary {
  return {
    id: 'family-1',
    projectId: 'project-1',
    projectName: 'Munkkivuoren kohde',
    projectSite: 'Työmaa 1',
    customerId: 'customer-1',
    customerName: 'Asiakas Oy',
    ownerLabel: 'Testi Myyjä',
    latestQuoteId: 'quote-1',
    latestQuoteNumber: 'TAR-2026-1',
    latestQuoteTitle: 'Kylpyhuone',
    latestRevisionNumber: 1,
    latestStatus: 'accepted',
    latestStatusLabel: 'Hyväksytty',
    latestStatusVariant: 'default',
    revisionCount: 1,
    originalQuoteId: 'quote-1',
    originalQuoteNumber: 'TAR-2026-1',
    originalSubtotal: 1000,
    originalMarginPercent: 20,
    latestSubtotal: 1200,
    latestMargin: 240,
    latestMarginPercent: 20,
    marginTargetPercent: 25,
    marginGapPercent: -5,
    valueDelta: 200,
    valueDeltaPercent: 20,
    weightedForecast: 1200,
    isOpen: false,
    isDecided: true,
    ageDays: 3,
    agingBucket: '0-7',
    lastActivityAt: '2026-04-01T08:00:00.000Z',
    expiresInDays: null,
    actualValue: null,
    actualMargin: null,
    actualMarginPercent: null,
    quoteToActualDelta: null,
    quoteToActualDeltaPercent: null,
    actualMarginDeltaPercent: null,
    invoiceCount: 0,
    invoiceStatusLabels: [],
    projectStage: 'Hyväksytty',
    projectStageVariant: 'outline',
    projectRisk: false,
    primaryDeviationReason: '',
    belowTargetMargin: false,
    hasOwner: true,
    revisionImpactLabel: 'Ei vaikutusta',
    sourceQuoteIds: ['quote-1'],
    revisions: [],
    rowIds: ['row-1'],
    ...overrides,
  };
}

function createCustomer(overrides: Partial<ReportCustomerSummary> = {}): ReportCustomerSummary {
  return {
    id: 'customer-1',
    name: 'Asiakas Oy',
    ownerLabel: 'Testi Myyjä',
    quoteCount: 1,
    decidedCount: 1,
    acceptedCount: 1,
    acceptedValue: 1200,
    totalValue: 1200,
    totalMargin: 240,
    marginPercent: 20,
    acceptanceRatePercent: 100,
    averageRevisionCount: 1,
    lastActivityAt: '2026-04-01T08:00:00.000Z',
    daysSinceActivity: 2,
    profileLabels: [],
    sourceIds: ['family-1'],
    ...overrides,
  };
}

function createProduct(overrides: Partial<ReportProductSummary> = {}): ReportProductSummary {
  return {
    id: 'product-1',
    name: 'Seinälaatta 60x60',
    code: 'LAA-60',
    categoryName: 'Laatat',
    installationGroupName: 'Laatoitus',
    quantity: 18,
    value: 1200,
    cost: 800,
    margin: 400,
    marginPercent: 33.3,
    discountImpact: 0,
    belowTargetCount: 0,
    acceptedUsageCount: 1,
    acceptedValue: 1200,
    revisionAddCount: 0,
    sourceIds: ['family-1'],
    sourceRowIds: ['row-1'],
    ...overrides,
  };
}

function createProjectSummary(overrides: Partial<ReportProjectSummary> = {}): ReportProjectSummary {
  return {
    id: 'project-1',
    name: 'Munkkivuoren kohde',
    customerName: 'Asiakas Oy',
    ownerLabel: 'Testi Myyjä',
    projectStage: 'Hyväksytty',
    projectStageVariant: 'outline',
    quoteValue: 1200,
    actualValue: null,
    quoteMarginPercent: 20,
    actualMarginPercent: null,
    quoteToActualDelta: null,
    quoteToActualDeltaPercent: null,
    actualMarginDeltaPercent: null,
    riskFlag: false,
    riskReason: '',
    familyCount: 1,
    sourceIds: ['family-1'],
    ...overrides,
  };
}

function createRow(overrides: Partial<ReportRowInsight> = {}): ReportRowInsight {
  return {
    id: 'row-1',
    familyId: 'family-1',
    quoteId: 'quote-1',
    projectId: 'project-1',
    projectName: 'Munkkivuoren kohde',
    customerId: 'customer-1',
    customerName: 'Asiakas Oy',
    ownerLabel: 'Testi Myyjä',
    productKey: 'LAA-60',
    productName: 'Seinälaatta 60x60',
    productCode: 'LAA-60',
    categoryName: 'Laatat',
    installationGroupName: 'Laatoitus',
    quantity: 18,
    value: 1200,
    cost: 800,
    margin: 400,
    marginPercent: 33.3,
    targetMarginPercent: 30,
    belowTargetMargin: false,
    adjustmentValue: 0,
    discountImpact: 0,
    purchaseDeltaValue: 0,
    manualPricing: false,
    ...overrides,
  };
}

function createAction(overrides: Partial<ReportActionItem> = {}): ReportActionItem {
  return {
    id: 'action-1',
    group: 'sales',
    title: 'Toimenpide',
    description: 'Kuvaus',
    severity: 'medium',
    metricLabel: '1 kpl',
    sourceKind: 'families',
    sourceIds: ['family-1'],
    ...overrides,
  };
}

function createProjectEntity(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    ownerUserId: 'user-1',
    customerId: 'customer-1',
    name: 'Munkkivuoren kohde',
    site: 'Työmaa 1',
    regionCoefficient: 1,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    ...overrides,
  };
}

function createQuoteEntity(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    ownerUserId: 'user-1',
    projectId: 'project-1',
    title: 'Kylpyhuone',
    quoteNumber: 'TAR-2026-1',
    revisionNumber: 1,
    status: 'accepted',
    vatPercent: 25.5,
    acceptedAt: '2026-04-01T08:00:00.000Z',
    discountType: 'none',
    discountValue: 0,
    projectCosts: 0,
    deliveryCosts: 0,
    installationCosts: 0,
    travelKilometers: 0,
    travelRatePerKm: 0,
    disposalCosts: 0,
    demolitionCosts: 0,
    protectionCosts: 0,
    permitCosts: 0,
    selectedMarginPercent: 30,
    pricingMode: 'manual',
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    ...overrides,
  };
}

function createModel(overrides: Partial<ReportingModel> = {}): ReportingModel {
  return {
    generatedAt: '2026-04-01T08:00:00.000Z',
    filters: {},
    meta: {
      totalFamilies: 0,
      filteredFamilies: 0,
      totalRows: 0,
      filteredRows: 0,
      hasQuotes: true,
      hasInvoices: false,
      hasProducts: true,
    },
    kpis: {
      openQuoteBookValue: 0,
      weightedForecastValue: 0,
      averageMarginPercent: 0,
      acceptanceRatePercent: 0,
      staleQuotesCount: 0,
      atRiskProjectsCount: 0,
    },
    families: [],
    rows: [],
    overviewChains: [],
    statusSummary: [],
    agingSummary: [],
    ownerSummary: [],
    marginByOwner: [],
    marginByCustomer: [],
    marginByGroup: [],
    leakageSummary: [],
    lowMarginFamilies: [],
    revisionImpactFamilies: [],
    customers: [],
    dormantCustomers: [],
    highAcceptanceCustomers: [],
    revisionHeavyCustomers: [],
    customerByOwner: [],
    customerConcentration: {
      topFiveSharePercent: 0,
      topCustomerSharePercent: 0,
    },
    products: [],
    profitableProducts: [],
    weakMarginProducts: [],
    discountedProducts: [],
    wonProducts: [],
    revisionAddedProducts: [],
    groupsUnderTarget: [],
    basketPairs: [],
    projects: [],
    projectByOwner: [],
    projectStages: [],
    acceptedWithoutActualization: [],
    revisionDistribution: [],
    stalledRevisionFamilies: [],
    actions: {
      sales: [],
      margin: [],
      customers: [],
      projects: [],
      data: [],
    },
    ...overrides,
  };
}

describe('reporting-drilldown-state', () => {
  it('resolves row-backed actions into family drilldown snapshots', () => {
    const family = createFamily();
    const model = createModel({
      families: [family],
      rows: [
        createRow({ id: 'row-1', familyId: family.id }),
        createRow({ id: 'row-2', familyId: family.id, quoteId: 'quote-2' }),
      ],
    });

    const drill = createReportingActionDrillState(
      createAction({
        title: 'Rivihälytys',
        sourceKind: 'rows',
        sourceIds: ['row-1', 'row-2'],
      }),
      model,
    );

    expect(drill).toEqual({
      kind: 'families',
      title: 'Rivihälytys',
      families: [family],
    });
    expect(countReportingDrillItems(drill)).toBe(1);
  });

  it('returns null for stale row actions that no longer resolve to visible families', () => {
    const model = createModel({
      rows: [createRow({ id: 'row-1', familyId: 'family-missing' })],
    });

    const drill = createReportingActionDrillState(
      createAction({
        sourceKind: 'rows',
        sourceIds: ['row-1'],
      }),
      model,
    );

    expect(drill).toBeNull();
  });

  it('resolves product-backed actions through product source families', () => {
    const family = createFamily();
    const model = createModel({
      families: [family],
      products: [createProduct({ id: 'product-1', sourceIds: [family.id] })],
    });

    const drill = createReportingActionDrillState(
      createAction({
        title: 'Tuotehälytys',
        sourceKind: 'products',
        sourceIds: ['product-1'],
      }),
      model,
    );

    expect(drill).toEqual({
      kind: 'families',
      title: 'Tuotehälytys',
      families: [family],
    });
  });

  it('resolves customer and project actions directly from the current model snapshot', () => {
    const customer = createCustomer();
    const project = createProjectSummary();
    const model = createModel({
      customers: [customer],
      projects: [project],
    });

    const customerDrill = createReportingActionDrillState(
      createAction({
        title: 'Asiakashälytys',
        sourceKind: 'customers',
        sourceIds: [customer.id],
      }),
      model,
    );
    const projectDrill = createReportingActionDrillState(
      createAction({
        title: 'Projektihälytys',
        sourceKind: 'projects',
        sourceIds: [project.id],
      }),
      model,
    );

    expect(customerDrill).toEqual({
      kind: 'customers',
      title: 'Asiakashälytys',
      customers: [customer],
    });
    expect(projectDrill).toEqual({
      kind: 'projects',
      title: 'Projektihälytys',
      projects: [project],
    });
  });

  it('opens the exact quote when the project and quote still exist', () => {
    const family = createFamily();

    const navigation = resolveQuoteFamilyNavigationTarget({
      family,
      projects: [createProjectEntity({ id: family.projectId })],
      quotes: [createQuoteEntity({ id: family.latestQuoteId, projectId: family.projectId })],
    });

    expect(navigation).toEqual({
      target: {
        page: 'projects',
        projectId: family.projectId,
        quoteId: family.latestQuoteId,
        editor: 'quote',
      },
    });
  });

  it('opens the quote editor when quote list is stale but family project still exists', () => {
    const family = createFamily();

    const navigation = resolveQuoteFamilyNavigationTarget({
      family,
      projects: [createProjectEntity({ id: family.projectId })],
      quotes: [],
    });

    expect(navigation).toEqual({
      target: {
        page: 'projects',
        projectId: family.projectId,
        quoteId: family.latestQuoteId,
        editor: 'quote',
      },
    });
  });

  it('opens the quote editor even when project list is stale if quote has project id', () => {
    const family = createFamily();

    const navigation = resolveQuoteFamilyNavigationTarget({
      family,
      projects: [],
      quotes: [createQuoteEntity({ id: family.latestQuoteId, projectId: family.projectId })],
    });

    expect(navigation).toEqual({
      target: {
        page: 'projects',
        projectId: family.projectId,
        quoteId: family.latestQuoteId,
        editor: 'quote',
      },
    });
  });

  it('prefers quote project id when family project id is stale', () => {
    const family = createFamily({ projectId: 'project-stale' });

    const navigation = resolveQuoteFamilyNavigationTarget({
      family,
      projects: [],
      quotes: [createQuoteEntity({ id: family.latestQuoteId, projectId: 'project-fresh' })],
    });

    expect(navigation).toEqual({
      target: {
        page: 'projects',
        projectId: 'project-fresh',
        quoteId: family.latestQuoteId,
        editor: 'quote',
      },
    });
  });
});