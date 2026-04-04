import { describe, expect, it } from 'vitest';
import type { Quote, QuoteRow } from './types';
import { getQuoteCompletionChecklist, getQuoteEditorSteps } from './quote-editor-ux';

function createQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    ownerUserId: 'user-1',
    projectId: 'project-1',
    title: 'Kylpyhuonetarjous',
    quoteNumber: 'TAR-1',
    revisionNumber: 1,
    status: 'draft',
    vatPercent: 25.5,
    validUntil: '2026-05-01',
    notes: '',
    internalNotes: '',
    scheduleMilestones: [],
    termsSnapshotContentMd: 'Vakioehdot',
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
    pricingMode: 'margin',
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    ...overrides,
  };
}

function createRow(overrides: Partial<QuoteRow> = {}): QuoteRow {
  return {
    id: 'row-1',
    ownerUserId: 'user-1',
    quoteId: 'quote-1',
    sortOrder: 0,
    mode: 'product',
    pricingModel: 'unit_price',
    unitPricingMode: 'margin',
    source: 'manual',
    productName: 'Laatta',
    productCode: 'LAA-1',
    description: 'Seinakeramiikka',
    quantity: 1,
    unit: 'm2',
    purchasePrice: 50,
    salesPrice: 72,
    installationPrice: 0,
    marginPercent: 30,
    priceAdjustment: 0,
    regionMultiplier: 1,
    notes: '',
    manualSalesPrice: false,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    ...overrides,
  };
}

function createValidation() {
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
}

describe('quote-editor-ux', () => {
  it('warns when a margin-driven row has a manual customer price below the target or cost', () => {
    const quote = createQuote();
    const rows = [
      createRow({
        purchasePrice: 80,
        salesPrice: 70,
        manualSalesPrice: true,
        unitPricingMode: 'margin',
        marginPercent: 30,
      }),
    ];

    const checklist = getQuoteCompletionChecklist({
      quote,
      rows,
      validation: createValidation(),
      quoteOwnerLabel: 'Myyja 1',
      visibleScheduleMilestones: [],
    });

    const manualOverrideItem = checklist.find((item) => item.id === 'manual-overrides');

    expect(manualOverrideItem?.state).toBe('warning');
    expect(manualOverrideItem?.message).toContain('1 rivi');
  });

  it('marks the additional costs phase in progress when travel inputs are incomplete', () => {
    const quote = createQuote({ travelKilometers: 45, travelRatePerKm: 0 });
    const rows = [createRow()];

    const steps = getQuoteEditorSteps({
      quote,
      rows,
      validation: createValidation(),
      quoteOwnerLabel: 'Myyja 1',
      visibleScheduleMilestones: [],
    });
    const checklist = getQuoteCompletionChecklist({
      quote,
      rows,
      validation: createValidation(),
      quoteOwnerLabel: 'Myyja 1',
      visibleScheduleMilestones: [],
    });

    expect(steps.find((step) => step.id === 'costs')?.status).toBe('in-progress');
    expect(checklist.find((item) => item.id === 'travel-costs')?.state).toBe('warning');
  });
});