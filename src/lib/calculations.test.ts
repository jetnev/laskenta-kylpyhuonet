import { describe, expect, it } from 'vitest';
import {
  calculateQuote,
  calculateQuoteRow,
  calculateQuoteRowTargetUnitPrice,
  getQuoteSummaryBreakdown,
  getQuoteRowPricingDetails,
} from './calculations';
import type { Quote, QuoteRow } from './types';

function createBaseRow(overrides: Partial<QuoteRow> = {}): QuoteRow {
  return {
    id: 'row-1',
    ownerUserId: 'user-1',
    quoteId: 'quote-1',
    sortOrder: 0,
    mode: 'product',
    pricingModel: 'unit_price',
    source: 'manual',
    productName: 'Laminaatti',
    productCode: 'LAM-1',
    description: 'Testirivi',
    quantity: 1,
    unit: 'm2',
    purchasePrice: 0,
    salesPrice: 0,
    installationPrice: 0,
    marginPercent: 0,
    priceAdjustment: 0,
    regionMultiplier: 1,
    notes: '',
    manualSalesPrice: true,
    createdAt: '2026-04-03T00:00:00.000Z',
    updatedAt: '2026-04-03T00:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

function createBaseQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    ownerUserId: 'user-1',
    projectId: 'project-1',
    title: 'Testitarjous',
    quoteNumber: 'TAR-1',
    revisionNumber: 1,
    status: 'draft',
    vatPercent: 25.5,
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
    createdAt: '2026-04-03T00:00:00.000Z',
    updatedAt: '2026-04-03T00:00:00.000Z',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    ...overrides,
  };
}

describe('calculateQuoteRow', () => {
  it('calculates a unit-price row explicitly as quantity times unit price', () => {
    const row = createBaseRow({
      pricingModel: 'unit_price',
      quantity: 120,
      salesPrice: 344,
      purchasePrice: 200,
    });

    const calculation = calculateQuoteRow(row);

    expect(calculation.pricingModel).toBe('unit_price');
    expect(calculation.enteredUnitPrice).toBe(344);
    expect(calculation.isUnitPriceDerived).toBe(false);
    expect(calculation.rowTotal).toBe(41280);
    expect(calculation.costTotal).toBe(24000);
  });

  it('treats a line-total row total as the user input and only derives unit price as an aid value', () => {
    const row = createBaseRow({
      pricingModel: 'line_total',
      quantity: 120,
      overridePrice: 344,
      purchasePrice: 1,
      salesPrice: 999,
    });

    const pricing = getQuoteRowPricingDetails(row, 25.5);
    const calculation = calculateQuoteRow(row);

    expect(pricing.pricingModel).toBe('line_total');
    expect(pricing.enteredUnitPrice).toBeNull();
    expect(pricing.enteredLineTotal).toBe(344);
    expect(pricing.isUnitPriceDerived).toBe(true);
    expect(pricing.derivedUnitPrice).toBe(2.87);
    expect(pricing.netTotal).toBe(344);
    expect(pricing.vatAmount).toBe(87.72);
    expect(pricing.grossTotal).toBe(431.72);
    expect(calculation.rowTotal).toBe(344);
  });

  it('keeps legacy product-installation rows compatible by combining the old split prices into the new effective unit price', () => {
    const row = createBaseRow({
      pricingModel: undefined,
      mode: 'product_installation',
      quantity: 120,
      salesPrice: 447.2,
      installationPrice: 9,
      regionMultiplier: 1,
    });

    const pricing = getQuoteRowPricingDetails(row);
    const calculation = calculateQuoteRow(row);

    expect(pricing.usesLegacyPricing).toBe(true);
    expect(pricing.enteredUnitPrice).toBe(456.2);
    expect(calculation.rowTotal).toBe(54744);
  });

  it('updates quote VAT and totals consistently for the new pricing model', () => {
    const quote = createBaseQuote({
      vatPercent: 25.5,
      discountType: 'amount',
      discountValue: 44,
    });
    const rows = [
      createBaseRow({
        pricingModel: 'line_total',
        quantity: 120,
        overridePrice: 344,
      }),
    ];

    const calculation = calculateQuote(quote, rows);

    expect(calculation.lineSubtotal).toBe(344);
    expect(calculation.discountAmount).toBe(44);
    expect(calculation.subtotal).toBe(300);
    expect(calculation.vat).toBe(76.5);
    expect(calculation.total).toBe(376.5);
  });

  it('builds a shared summary breakdown with the selected VAT label and amount', () => {
    const quote = createBaseQuote({ vatPercent: 25.5 });
    const rows = [
      createBaseRow({
        quantity: 2,
        salesPrice: 100,
      }),
    ];

    const summary = getQuoteSummaryBreakdown(quote, rows);

    expect(summary.subtotalLabel).toBe('Veroton välisumma');
    expect(summary.vatLabel).toBe('ALV 25,5 %');
    expect(summary.calculation.subtotal).toBe(200);
    expect(summary.calculation.vat).toBe(51);
    expect(summary.calculation.total).toBe(251);
  });

  it('keeps an intentionally tax-free quote at ALV 0 % without forcing a decimal tail', () => {
    const quote = createBaseQuote({ vatPercent: 0 });
    const rows = [
      createBaseRow({
        quantity: 3,
        salesPrice: 50,
      }),
    ];

    const summary = getQuoteSummaryBreakdown(quote, rows);

    expect(summary.vatPercent).toBe(0);
    expect(summary.vatLabel).toBe('ALV 0 %');
    expect(summary.calculation.subtotal).toBe(150);
    expect(summary.calculation.vat).toBe(0);
    expect(summary.calculation.total).toBe(150);
  });

  it('derives customer price and margin from the combined internal unit cost', () => {
    const row = createBaseRow({
      pricingModel: 'unit_price',
      mode: 'product_installation',
      quantity: 2,
      purchasePrice: 80,
      installationPrice: 20,
      regionMultiplier: 1.1,
      marginPercent: 30,
      salesPrice: calculateQuoteRowTargetUnitPrice({
        mode: 'product_installation',
        purchasePrice: 80,
        installationPrice: 20,
        regionMultiplier: 1.1,
      }, 30),
    });

    const calculation = calculateQuoteRow(row);

    expect(calculation.internalUnitCost).toBe(110);
    expect(calculation.costTotal).toBe(220);
    expect(calculation.rowTotal).toBe(314.28);
    expect(calculation.marginAmount).toBe(94.28);
    expect(calculation.marginPercent).toBe(30);
    expect(calculation.hasInternalCostBasis).toBe(true);
  });
});
