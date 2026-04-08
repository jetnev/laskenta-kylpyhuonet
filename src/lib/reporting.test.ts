import { describe, it, expect } from 'vitest';
import {
  REPORT_STATUS_WEIGHTS,
  buildReportingModel,
  resolveReportingFilters,
  type ReportingInput,
} from './reporting';
import {
  allQuotes,
  allQuoteRowsFlat,
  allProjects,
  allCustomers,
  allProducts,
  allInstallationGroups,
  OWNER_USER_ID,
  projectHelsinki,
  customerHome,
} from './test-scenarios/user-scenario-fixtures';

const testUsers = [{ id: OWNER_USER_ID, displayName: 'Juhani Testaaja' }];

function buildInput(overrides?: Partial<ReportingInput>): ReportingInput {
  return {
    quotes: allQuotes,
    quoteRows: allQuoteRowsFlat,
    projects: allProjects,
    customers: allCustomers,
    invoices: [],
    products: allProducts,
    installationGroups: allInstallationGroups,
    users: testUsers,
    now: new Date('2026-04-08T12:00:00Z'),
    ...overrides,
  };
}

describe('resolveReportingFilters', () => {
  it('palauttaa tyhjät filtterit kun ei syötettä', () => {
    const result = resolveReportingFilters({ canManageUsers: false });
    expect(result.quoteStatus).toBeUndefined();
    expect(result.customerId).toBeUndefined();
    expect(result.projectId).toBeUndefined();
  });

  it('pakottaa ownerUserId ei-admin-käyttäjälle', () => {
    const result = resolveReportingFilters({
      filters: { ownerUserId: 'someone-else' },
      canManageUsers: false,
      currentUserId: 'my-id',
    });
    expect(result.ownerUserId).toBe('my-id');
  });

  it('sallii admin-käyttäjälle valitun ownerUserId:n', () => {
    const result = resolveReportingFilters({
      filters: { ownerUserId: 'someone-else' },
      canManageUsers: true,
      currentUserId: 'my-id',
    });
    expect(result.ownerUserId).toBe('someone-else');
  });

  it('poistaa all-arvot suodattimista', () => {
    const result = resolveReportingFilters({
      filters: {
        ownerUserId: 'all',
        quoteStatus: 'all',
        customerId: 'all',
        projectId: 'all',
        projectStage: 'all',
        installationGroupId: 'all',
      },
      canManageUsers: true,
    });
    expect(result.ownerUserId).toBeUndefined();
    expect(result.quoteStatus).toBeUndefined();
    expect(result.customerId).toBeUndefined();
    expect(result.projectId).toBeUndefined();
    expect(result.projectStage).toBeUndefined();
    expect(result.installationGroupId).toBeUndefined();
  });

  it('säilyttää konkreettiset arvot', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-12-31');
    const result = resolveReportingFilters({
      filters: {
        from,
        to,
        quoteStatus: 'accepted',
        customerId: 'cust-1',
      },
      canManageUsers: true,
    });
    expect(result.from).toBe(from);
    expect(result.to).toBe(to);
    expect(result.quoteStatus).toBe('accepted');
    expect(result.customerId).toBe('cust-1');
  });
});

describe('buildReportingModel — perusrakenne', () => {
  const model = buildReportingModel(buildInput());

  it('palauttaa generatedAt-kentän', () => {
    expect(model.generatedAt).toBeTruthy();
    expect(new Date(model.generatedAt).getTime()).not.toBeNaN();
  });

  it('meta.hasQuotes on true kun tarjouksia on', () => {
    expect(model.meta.hasQuotes).toBe(true);
  });

  it('meta.totalFamilies > 0', () => {
    expect(model.meta.totalFamilies).toBeGreaterThan(0);
  });

  it('meta.filteredFamilies === meta.totalFamilies ilman filttereitä', () => {
    expect(model.meta.filteredFamilies).toBe(model.meta.totalFamilies);
  });

  it('families-taulukko ei ole tyhjä', () => {
    expect(model.families.length).toBeGreaterThan(0);
  });

  it('rows-taulukko ei ole tyhjä', () => {
    expect(model.rows.length).toBeGreaterThan(0);
  });

  it('statusSummary sisältää kaikki 4 statusta', () => {
    const statuses = model.statusSummary.map((s) => s.status);
    expect(statuses).toEqual(['draft', 'sent', 'accepted', 'rejected']);
  });
});

describe('buildReportingModel — KPI-arvot', () => {
  const model = buildReportingModel(buildInput());

  it('openQuoteBookValue > 0 kun avoimia tarjouksia on', () => {
    expect(model.kpis.openQuoteBookValue).toBeGreaterThan(0);
  });

  it('weightedForecastValue > 0 kun tarjouksia on', () => {
    expect(model.kpis.weightedForecastValue).toBeGreaterThan(0);
  });

  it('averageMarginPercent on rationaalinen luku', () => {
    expect(model.kpis.averageMarginPercent).toBeGreaterThanOrEqual(0);
    expect(model.kpis.averageMarginPercent).toBeLessThanOrEqual(100);
  });

  it('acceptanceRatePercent perustuu päättyneiden tarjousten suhteeseen', () => {
    const decided = model.families.filter((f) => f.isDecided);
    const accepted = decided.filter((f) => f.latestStatus === 'accepted');
    if (decided.length > 0) {
      const expected = Math.round((accepted.length / decided.length) * 10000) / 100;
      expect(model.kpis.acceptanceRatePercent).toBeCloseTo(expected, 0);
    }
  });
});

describe('buildReportingModel — status-summat', () => {
  const model = buildReportingModel(buildInput());

  it('draft-summan count vastaa draft-familyjen lukumäärää', () => {
    const draftStatus = model.statusSummary.find((s) => s.status === 'draft')!;
    const draftFamilies = model.families.filter((f) => f.latestStatus === 'draft');
    expect(draftStatus.count).toBe(draftFamilies.length);
  });

  it('accepted-summan painotettu ennuste = arvo × 1', () => {
    const accepted = model.statusSummary.find((s) => s.status === 'accepted')!;
    expect(accepted.weightedForecast).toBeCloseTo(accepted.value, 1);
  });

  it('rejected-summan painotettu ennuste = 0', () => {
    const rejected = model.statusSummary.find((s) => s.status === 'rejected')!;
    expect(rejected.weightedForecast).toBe(0);
  });
});

describe('buildReportingModel — family-ominaisuudet', () => {
  const model = buildReportingModel(buildInput());

  it('jokaisella familyllä on latestQuoteId', () => {
    model.families.forEach((f) => {
      expect(f.latestQuoteId).toBeTruthy();
    });
  });

  it('jokaisella familyllä on projectName', () => {
    model.families.forEach((f) => {
      expect(f.projectName).toBeTruthy();
    });
  });

  it('jokaisella familyllä on customerName', () => {
    model.families.forEach((f) => {
      expect(f.customerName).toBeTruthy();
    });
  });

  it('isOpen on true vain draft/sent-tilaisilla', () => {
    model.families.forEach((f) => {
      if (f.isOpen) {
        expect(['draft', 'sent']).toContain(f.latestStatus);
      }
    });
  });

  it('isDecided on true vain accepted/rejected-tilaisilla', () => {
    model.families.forEach((f) => {
      if (f.isDecided) {
        expect(['accepted', 'rejected']).toContain(f.latestStatus);
      }
    });
  });

  it('agingBucket on aina validi arvo', () => {
    const validBuckets = ['0-7', '8-14', '15-30', '30+'];
    model.families.forEach((f) => {
      expect(validBuckets).toContain(f.agingBucket);
    });
  });

  it('weightedForecast vastaa kaavaa subtotal × painokerroin', () => {
    model.families.forEach((f) => {
      const expected = Math.round((f.latestSubtotal * REPORT_STATUS_WEIGHTS[f.latestStatus] + Number.EPSILON) * 100) / 100;
      expect(f.weightedForecast).toBeCloseTo(expected, 1);
    });
  });
});

describe('buildReportingModel — filtteröinti', () => {
  it('quoteStatus-filtteri rajaa oikein', () => {
    const model = buildReportingModel(buildInput({
      filters: { quoteStatus: 'accepted' },
    }));
    model.families.forEach((f) => {
      expect(f.latestStatus).toBe('accepted');
    });
    expect(model.meta.filteredFamilies).toBeLessThanOrEqual(model.meta.totalFamilies);
  });

  it('customerId-filtteri rajaa oikein', () => {
    const model = buildReportingModel(buildInput({
      filters: { customerId: customerHome.id },
    }));
    model.families.forEach((f) => {
      expect(f.customerId).toBe(customerHome.id);
    });
  });

  it('projectId-filtteri rajaa oikein', () => {
    const model = buildReportingModel(buildInput({
      filters: { projectId: projectHelsinki.id },
    }));
    model.families.forEach((f) => {
      expect(f.projectId).toBe(projectHelsinki.id);
    });
  });

  it('aikaväli-filtteri rajaa tarjouksia', () => {
    const model = buildReportingModel(buildInput({
      filters: {
        from: new Date('2020-01-01'),
        to: new Date('2020-12-31'),
      },
    }));
    expect(model.meta.filteredFamilies).toBe(0);
  });
});

describe('buildReportingModel — agingSummary', () => {
  const model = buildReportingModel(buildInput());

  it('sisältää kaikki aging-bucketit', () => {
    expect(model.agingSummary.map((a) => a.bucket)).toEqual(['0-7', '8-14', '15-30', '30+']);
  });

  it('aging-summat koskevat vain avoimia tarjouksia', () => {
    const totalAging = model.agingSummary.reduce((sum, a) => sum + a.count, 0);
    const openFamilies = model.families.filter((f) => f.isOpen).length;
    expect(totalAging).toBe(openFamilies);
  });
});

describe('buildReportingModel — tyhjä syöte', () => {
  it('palauttaa nolla-KPIt ja tyhjät taulukot kun ei dataa', () => {
    const model = buildReportingModel(buildInput({
      quotes: [],
      quoteRows: [],
      projects: [],
      customers: [],
      invoices: [],
      products: [],
      installationGroups: [],
    }));
    expect(model.meta.totalFamilies).toBe(0);
    expect(model.kpis.openQuoteBookValue).toBe(0);
    expect(model.kpis.weightedForecastValue).toBe(0);
    expect(model.kpis.averageMarginPercent).toBe(0);
    expect(model.families).toEqual([]);
    expect(model.rows).toEqual([]);
  });
});

describe('buildReportingModel — actions', () => {
  const model = buildReportingModel(buildInput());

  it('actions-objekti sisältää kaikki ryhmäavaimet', () => {
    const groups = Object.keys(model.actions).sort();
    expect(groups).toEqual(['customers', 'data', 'margin', 'projects', 'sales']);
  });

  it('jokainen action-ryhmä on taulukko', () => {
    for (const group of Object.values(model.actions)) {
      expect(Array.isArray(group)).toBe(true);
    }
  });
});

describe('buildReportingModel — customerSummary', () => {
  const model = buildReportingModel(buildInput());

  it('customers-taulukko sisältää asiakkaita', () => {
    expect(model.customers.length).toBeGreaterThan(0);
  });

  it('jokaisella asiakkaalla on nimi', () => {
    model.customers.forEach((c) => {
      expect(c.name).toBeTruthy();
    });
  });

  it('quoteCount on positiivinen', () => {
    model.customers.forEach((c) => {
      expect(c.quoteCount).toBeGreaterThan(0);
    });
  });
});

describe('buildReportingModel — productSummary', () => {
  const model = buildReportingModel(buildInput());

  it('products-taulukko sisältää tuotteita', () => {
    expect(model.products.length).toBeGreaterThan(0);
  });

  it('jokaisen tuotteen value ≥ 0', () => {
    model.products.forEach((p) => {
      expect(p.value).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('buildReportingModel — projectSummary', () => {
  const model = buildReportingModel(buildInput());

  it('projects-taulukko ei ole tyhjä', () => {
    expect(model.projects.length).toBeGreaterThan(0);
  });

  it('jokaisella projektilla on vaihe', () => {
    model.projects.forEach((p) => {
      expect(p.projectStage).toBeTruthy();
    });
  });
});
