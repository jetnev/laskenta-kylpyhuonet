/**
 * User-scenario integration tests
 *
 * Simulates a real user (Virtasen Remontti Oy) performing common actions:
 *   1. Laskenta-oikeellisuus    – calculation consistency across pricing modes
 *   2. Aluekertoimen vaikutus   – region multiplier scaling on costs
 *   3. Alennus-logiikka         – percent & amount discounts behave correctly
 *   4. ALV-johdonmukaisuus      – VAT derived from subtotal is consistent
 *   5. Tilasiirtymät            – valid workflow; blocked reverse transitions
 *   6. line_total-hinnoittelu   – overridePrice drives the row total
 *   7. Laskun luominen          – invoice snapshot from accepted quote
 *   8. Laskun hylkäys (ei-accepted) – throws expected Finnish errors
 *   9. Raportointi-painotukset  – REPORT_STATUS_WEIGHTS match expectations
 *  10. Edge-tapaukset           – zero/null/boundary values don't crash
 */

import { describe, expect, it } from 'vitest';
import { calculateQuote, calculateQuoteRow } from '../calculations';
import { createInvoiceSnapshotFromQuote } from '../invoices';
import { REPORT_STATUS_WEIGHTS } from '../reporting';
import {
  allQuotes,
  allQuoteRowsFlat,
  customerById,
  customerHome,
  customerHousingCo,
  installGroupTiling,
  projectById,
  projectEspoo,
  projectHelsinki,
  projectTampere,
  quoteAccepted1,
  quoteAccepted1Rows,
  quoteAccepted2,
  quoteAccepted2Rows,
  quoteDraft1,
  quoteDraft1Rows,
  quoteDraft2,
  quoteDraft2Rows,
  quoteDraft3,
  quoteDraft3Rows,
  quoteDraft4,
  quoteDraft4Rows,
  quoteRejected1,
  quoteRejected1Rows,
  quoteRejected2,
  quoteRejected2Rows,
  quoteRowsMap,
  quoteSent1,
  quoteSent1Rows,
  quoteSent2,
  quoteSent2Rows,
  testSettings,
} from './user-scenario-fixtures';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ─────────────────────────────────────────────
// 1. Laskenta-oikeellisuus
// ─────────────────────────────────────────────

describe('Laskenta-oikeellisuus', () => {
  it('section-rivit eivät vaikuta quote-summaan', () => {
    const sectionRows = quoteDraft1Rows.filter(r => r.mode === 'section');
    for (const row of sectionRows) {
      const calc = calculateQuoteRow(row);
      expect(calc.rowTotal).toBe(0);
      expect(calc.costTotal).toBe(0);
    }
  });

  it('product_installation-rivi: rowTotal > 0 kun salesPrice ja installationPrice > 0', () => {
    const tilingRow = quoteDraft1Rows.find(r => r.id === 'row-001-2')!;
    const calc = calculateQuoteRow(tilingRow);
    // salesPrice * qty should form the row total
    expect(calc.rowTotal).toBeGreaterThan(0);
    expect(calc.costTotal).toBeGreaterThan(0);
  });

  it('charge-rivi: rowTotal = salesPrice * qty, costTotal = 0', () => {
    const chargeRow = quoteDraft1Rows.find(r => r.mode === 'charge')!;
    const calc = calculateQuoteRow(chargeRow);
    expect(calc.rowTotal).toBe(chargeRow.salesPrice * chargeRow.quantity);
    expect(calc.costTotal).toBe(0);
  });

  it('installation-rivi: kostnadet sisältyvät aluekertoimeen', () => {
    const installRow = quoteDraft1Rows.find(r => r.mode === 'installation')!;
    const calc = calculateQuoteRow(installRow);
    const expectedCost = round2(installRow.installationPrice * installRow.regionMultiplier);
    expect(calc.costTotal).toBe(expectedCost);
  });

  it('calculateQuote: total = subtotal + vat', () => {
    const calc = calculateQuote(quoteDraft1, quoteDraft1Rows);
    expect(calc.total).toBeCloseTo(calc.subtotal + calc.vat, 2);
  });

  it('calculateQuote: lineSubtotal = sum of row totals', () => {
    const calc = calculateQuote(quoteDraft1, quoteDraft1Rows);
    const rowSum = round2(
      quoteDraft1Rows.reduce((s, r) => s + calculateQuoteRow(r).rowTotal, 0)
    );
    expect(calc.lineSubtotal).toBe(rowSum);
  });

  it('marginPercent on ei-negatiivinen kaikissa tarjouksissa', () => {
    for (const quote of allQuotes) {
      const rows = quoteRowsMap[quote.id] ?? [];
      const calc = calculateQuote(quote, rows);
      expect(calc.marginPercent).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────
// 2. Aluekertoimen vaikutus
// ─────────────────────────────────────────────

describe('Aluekertoimen vaikutus', () => {
  it('Tampere (0.95) tuottaa matalamman kustannuksen kuin Helsinki (1.0) samalla rivillä', () => {
    const baseInstallPrice = 35.0;

    const helsinkiRow = quoteDraft1Rows.find(r => r.installationPrice === baseInstallPrice)!;
    const tampereRow = { ...helsinkiRow, regionMultiplier: 0.95 };

    const helsinkiCost = calculateQuoteRow(helsinkiRow).costTotal;
    const tampereCost = calculateQuoteRow(tampereRow).costTotal;

    expect(tampereCost).toBeLessThan(helsinkiCost);
  });

  it('Espoo (1.1) tuottaa korkeamman kustannuksen kuin Helsinki (1.0)', () => {
    const tilingRow = quoteDraft1Rows.find(r => r.id === 'row-001-2')!;
    const espooRow = { ...tilingRow, regionMultiplier: 1.1 };

    const helsinkiCost = calculateQuoteRow(tilingRow).costTotal;
    const espooCost = calculateQuoteRow(espooRow).costTotal;

    expect(espooCost).toBeGreaterThan(helsinkiCost);
  });

  it('kustannukset skaalautuvat lineaarisesti multiplieriin nähden', () => {
    const row = quoteDraft3Rows[0]; // Espoo region 1.1
    const baseRow = { ...row, regionMultiplier: 1.0 };

    const baseCost = calculateQuoteRow(baseRow).costTotal;
    const espooCost = calculateQuoteRow(row).costTotal;

    // ratio should be ~1.1 (within floating-point rounding tolerance)
    const ratio = espooCost / baseCost;
    expect(ratio).toBeCloseTo(1.1, 1);
  });

  it('Espoo-tarjouksen kustannukset ovat suuremmat kuin vastaavan Helsinki-tarjouksen', () => {
    // quoteDraft3 is the Espoo quote with same product types as quoteDraft1
    const helsinkiCalc = calculateQuote(quoteDraft1, quoteDraft1Rows);
    const espooCalc = calculateQuote(quoteDraft3, quoteDraft3Rows);

    // Both have tiling rows; Espoo rows have regionMultiplier 1.1
    // totalCost / qty should reflect the difference
    const helsinkiTilingRow = quoteDraft1Rows.find(r => r.id === 'row-001-2')!;
    const espooTilingRow = quoteDraft3Rows.find(r => r.productId === 'prod-002')!;

    const helsinkiRowCost = calculateQuoteRow(helsinkiTilingRow).costTotal;
    const espooRowCost = calculateQuoteRow(espooTilingRow).costTotal;

    // Espoo per-unit cost > Helsinki per-unit cost (same purchase price, different multiplier)
    const helsinkiUnitCost = helsinkiRowCost / helsinkiTilingRow.quantity;
    const espooUnitCost = espooRowCost / espooTilingRow.quantity;
    expect(espooUnitCost).toBeGreaterThan(helsinkiUnitCost);
  });
});

// ─────────────────────────────────────────────
// 3. Alennus-logiikka
// ─────────────────────────────────────────────

describe('Alennus-logiikka', () => {
  it('none-alennus: discountAmount = 0', () => {
    const calc = calculateQuote(quoteDraft1, quoteDraft1Rows);
    expect(calc.discountAmount).toBe(0);
    expect(calc.subtotal).toBe(calc.beforeDiscountSubtotal);
  });

  it('percent-alennus 10%: discountAmount ≈ beforeDiscount × 0.1', () => {
    const calc = calculateQuote(quoteDraft2, quoteDraft2Rows);
    const expected = round2(calc.beforeDiscountSubtotal * 0.1);
    expect(calc.discountAmount).toBeCloseTo(expected, 2);
  });

  it('percent-alennus: subtotal = beforeDiscountSubtotal - discountAmount', () => {
    const calc = calculateQuote(quoteDraft2, quoteDraft2Rows);
    expect(calc.subtotal).toBeCloseTo(calc.beforeDiscountSubtotal - calc.discountAmount, 2);
  });

  it('amount-alennus 200€: discountAmount = 200', () => {
    const calc = calculateQuote(quoteAccepted2, quoteAccepted2Rows);
    expect(calc.discountAmount).toBe(200);
  });

  it('amount-alennus: subtotal koskaan ei negatiivinen', () => {
    // Extreme case: discount larger than subtotal
    const extremeQuote = { ...quoteAccepted2, discountValue: 999_999 };
    const calc = calculateQuote(extremeQuote, quoteAccepted2Rows);
    expect(calc.subtotal).toBeGreaterThanOrEqual(0);
    expect(calc.total).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────
// 4. ALV-johdonmukaisuus
// ─────────────────────────────────────────────

describe('ALV-johdonmukaisuus', () => {
  const vatPercent = 25.5;

  it('vat ≈ subtotal × vatPercent/100 jokaisessa tarjouksessa', () => {
    for (const quote of allQuotes) {
      const rows = quoteRowsMap[quote.id] ?? [];
      const calc = calculateQuote(quote, rows);
      const expectedVat = round2(calc.subtotal * (quote.vatPercent / 100));
      expect(calc.vat).toBeCloseTo(expectedVat, 2);
    }
  });

  it('total = subtotal + vat kaikissa tarjouksissa', () => {
    for (const quote of allQuotes) {
      const rows = quoteRowsMap[quote.id] ?? [];
      const calc = calculateQuote(quote, rows);
      expect(calc.total).toBeCloseTo(calc.subtotal + calc.vat, 2);
    }
  });

  it('ALV eri tarjouksissa: vaihtelee subtotalin mukaan', () => {
    const calc1 = calculateQuote(quoteDraft1, quoteDraft1Rows);
    const calc2 = calculateQuote(quoteSent1, quoteSent1Rows);
    // Both at 25.5%; different subtotals should yield different VAT
    if (calc1.subtotal !== calc2.subtotal) {
      expect(calc1.vat).not.toBe(calc2.vat);
    }
  });
});

// ─────────────────────────────────────────────
// 5. Tilasiirtymät
// ─────────────────────────────────────────────

describe('Tilasiirtymät', () => {
  it('draft-tarjouksella ei ole sentAt', () => {
    expect(quoteDraft1.sentAt).toBeUndefined();
    expect(quoteDraft1.acceptedAt).toBeUndefined();
    expect(quoteDraft1.rejectedAt).toBeUndefined();
  });

  it('sent-tarjouksella on sentAt', () => {
    expect(quoteSent1.sentAt).toBeTruthy();
  });

  it('accepted-tarjouksella on sekä sentAt että acceptedAt', () => {
    expect(quoteAccepted1.sentAt).toBeTruthy();
    expect(quoteAccepted1.acceptedAt).toBeTruthy();
  });

  it('rejected-tarjouksella on sekä sentAt että rejectedAt', () => {
    expect(quoteRejected1.sentAt).toBeTruthy();
    expect(quoteRejected1.rejectedAt).toBeTruthy();
  });

  it('createInvoiceSnapshotFromQuote estää laskun luonnin draft-tilasta', () => {
    expect(() =>
      createInvoiceSnapshotFromQuote({
        quote: quoteDraft1,
        rows: quoteDraft1Rows,
        customer: customerHome,
        project: projectHelsinki,
        settings: testSettings,
      })
    ).toThrow('Laskun voi luoda vain hyväksytystä tarjouksesta.');
  });

  it('createInvoiceSnapshotFromQuote estää laskun luonnin sent-tilasta', () => {
    expect(() =>
      createInvoiceSnapshotFromQuote({
        quote: quoteSent1,
        rows: quoteSent1Rows,
        customer: customerHousingCo,
        project: projectEspoo,
        settings: testSettings,
      })
    ).toThrow('Laskun voi luoda vain hyväksytystä tarjouksesta.');
  });

  it('createInvoiceSnapshotFromQuote estää laskun luonnin rejected-tilasta', () => {
    expect(() =>
      createInvoiceSnapshotFromQuote({
        quote: quoteRejected1,
        rows: quoteRejected1Rows,
        customer: customerHome,
        project: projectTampere,
        settings: testSettings,
      })
    ).toThrow('Laskun voi luoda vain hyväksytystä tarjouksesta.');
  });
});

// ─────────────────────────────────────────────
// 6. line_total-hinnoittelu
// ─────────────────────────────────────────────

describe('line_total-hinnoittelu', () => {
  it('line_total-rivin rowTotal = overridePrice', () => {
    const row = quoteDraft4Rows.find(r => r.pricingModel === 'line_total')!;
    const calc = calculateQuoteRow(row);
    expect(calc.rowTotal).toBe(row.overridePrice);
  });

  it('line_total-rivin derivedUnitPrice = overridePrice / qty', () => {
    const row = quoteDraft4Rows.find(r => r.pricingModel === 'line_total')!;
    const calc = calculateQuoteRow(row);
    const expected = round2(row.overridePrice! / row.quantity);
    expect(calc.derivedUnitPrice).toBeCloseTo(expected, 2);
  });

  it('line_total ja unit_price -rivit voivat olla samassa tarjouksessa', () => {
    const calc = calculateQuote(quoteDraft4, quoteDraft4Rows);
    expect(calc.lineSubtotal).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// 7. Laskun luominen hyväksytystä tarjouksesta
// ─────────────────────────────────────────────

describe('Laskun luominen', () => {
  const invoice = createInvoiceSnapshotFromQuote({
    quote: quoteAccepted1,
    rows: quoteAccepted1Rows,
    customer: customerHome,
    project: projectHelsinki,
    settings: testSettings,
    issueDate: '2026-04-08',
    invoiceNumber: 'LASKU-20260408-001',
  });

  it('lasku saa oikean sourceQuoteId:n', () => {
    expect(invoice.sourceQuoteId).toBe(quoteAccepted1.id);
  });

  it('lasku saa oikean sourceQuoteNumber:n', () => {
    expect(invoice.sourceQuoteNumber).toBe(quoteAccepted1.quoteNumber);
  });

  it('laskun title sisältää tarjouksen otsikon', () => {
    expect(invoice.title).toContain(quoteAccepted1.title);
  });

  it('laskun customer-snapshot vastaa asiakasta', () => {
    expect(invoice.customer.name).toBe(customerHome.name);
    expect(invoice.customer.email).toBe(customerHome.email);
  });

  it('laskun project-snapshot vastaa projektia', () => {
    expect(invoice.project.name).toBe(projectHelsinki.name);
    expect(invoice.project.site).toBe(projectHelsinki.site);
  });

  it('laskun yritys-snapshot käyttää testSettings-arvoja', () => {
    expect(invoice.company.companyName).toBe(testSettings.companyName);
    expect(invoice.company.companyEmail).toBe(testSettings.companyEmail);
  });

  it('laskun status on draft', () => {
    expect(invoice.status).toBe('draft');
  });

  it('laskun rivit ovat kopioita, eivät sama referenssi', () => {
    expect(invoice.rows).not.toBe(quoteAccepted1Rows);
    expect(invoice.rows[0]).not.toBe(quoteAccepted1Rows[0]);
  });

  it('laskun rivit sisältävät saman datan kuin alkuperäiset rivit', () => {
    for (let i = 0; i < invoice.rows.length; i++) {
      expect(invoice.rows[i].id).toBe(quoteAccepted1Rows[i].id);
      expect(invoice.rows[i].salesPrice).toBe(quoteAccepted1Rows[i].salesPrice);
    }
  });

  it('disposalCosts kopioituu tarjouksesta laskulle', () => {
    expect(invoice.disposalCosts).toBe(quoteAccepted1.disposalCosts);
  });

  it('vatPercent kopioituu tarjouksesta laskulle', () => {
    expect(invoice.vatPercent).toBe(quoteAccepted1.vatPercent);
  });

  it('dueDate on issueDate + paymentTermDays', () => {
    const issueMs = new Date('2026-04-08').getTime();
    const dueMs = new Date(invoice.dueDate).getTime();
    const diffDays = (dueMs - issueMs) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(invoice.paymentTermDays);
  });
});

// ─────────────────────────────────────────────
// 8. Only-sections guard
// ─────────────────────────────────────────────

describe('Laskun luominen: vain section-rivejä', () => {
  it('heittää virheen kun kaikki rivit ovat section-modessa', () => {
    const sectionsOnly = quoteAccepted1Rows
      .filter(r => r.mode === 'section')
      .concat([
        {
          ...quoteAccepted1Rows[0],
          id: 'dummy-section',
          mode: 'section' as const,
        },
      ]);

    // Make sure our test data has at least one section row
    expect(
      quoteAccepted1Rows.some(r => r.mode !== 'section')
    ).toBe(true);

    const sectionOnlyRows = quoteAccepted1Rows.map(r => ({ ...r, mode: 'section' as const }));

    expect(() =>
      createInvoiceSnapshotFromQuote({
        quote: quoteAccepted1,
        rows: sectionOnlyRows,
        customer: customerHome,
        project: projectHelsinki,
      })
    ).toThrow('Tarjouksella ei ole laskutettavia rivejä.');
  });
});

// ─────────────────────────────────────────────
// 9. Raportointi-painotukset
// ─────────────────────────────────────────────

describe('Raportointi: REPORT_STATUS_WEIGHTS', () => {
  it('accepted-tarjoukset saavat painon 1', () => {
    expect(REPORT_STATUS_WEIGHTS['accepted']).toBe(1);
  });

  it('rejected-tarjoukset saavat painon 0', () => {
    expect(REPORT_STATUS_WEIGHTS['rejected']).toBe(0);
  });

  it('sent > draft painona', () => {
    expect(REPORT_STATUS_WEIGHTS['sent']).toBeGreaterThan(REPORT_STATUS_WEIGHTS['draft']);
  });

  it('accepted > sent painona', () => {
    expect(REPORT_STATUS_WEIGHTS['accepted']).toBeGreaterThan(REPORT_STATUS_WEIGHTS['sent']);
  });

  it('painotettu pipelinearvo: rejected lisää 0 pipelineen', () => {
    const rejectedCalc = calculateQuote(quoteRejected2, quoteRejected2Rows);
    const weightedValue = rejectedCalc.total * REPORT_STATUS_WEIGHTS['rejected'];
    expect(weightedValue).toBe(0);
  });

  it('painotettu pipelinearvo: accepted lisää 100% summasta', () => {
    const acceptedCalc = calculateQuote(quoteAccepted1, quoteAccepted1Rows);
    const weightedValue = acceptedCalc.total * REPORT_STATUS_WEIGHTS['accepted'];
    expect(weightedValue).toBe(acceptedCalc.total);
  });

  it('kaikilla statuksille on paino määriteltynä ilman undefined-arvoja', () => {
    const statuses = ['draft', 'sent', 'accepted', 'rejected'] as const;
    for (const status of statuses) {
      expect(REPORT_STATUS_WEIGHTS[status]).toBeDefined();
      expect(typeof REPORT_STATUS_WEIGHTS[status]).toBe('number');
    }
  });
});

// ─────────────────────────────────────────────
// 10. Edge-tapaukset
// ─────────────────────────────────────────────

describe('Edge-tapaukset', () => {
  it('regionMultiplier = 0 normalisoidaan 1:ksi, ei nollakustannusta', () => {
    const row = { ...quoteAccepted1Rows[0], regionMultiplier: 0 };
    const calc = calculateQuoteRow(row);
    // With multiplier=0 normalized to 1, cost = purchasePrice * 1 * qty
    const expectedCostAtOne = round2(
      (row.purchasePrice + row.installationPrice) * 1 * row.quantity
    );
    expect(calc.costTotal).toBe(expectedCostAtOne);
  });

  it('regionMultiplier = NaN normalisoidaan 1:ksi', () => {
    const row = { ...quoteAccepted1Rows[0], regionMultiplier: NaN };
    const calcNaN = calculateQuoteRow(row);
    const calcNormal = calculateQuoteRow({ ...row, regionMultiplier: 1.0 });
    expect(calcNaN.costTotal).toBe(calcNormal.costTotal);
  });

  it('nollahintainen product-rivi: rowTotal = 0, ei negatiivinen', () => {
    const row = { ...quoteAccepted1Rows[0], salesPrice: 0, installationPrice: 0 };
    const calc = calculateQuoteRow(row);
    expect(calc.rowTotal).toBeGreaterThanOrEqual(0);
  });

  it('quantity = 0: rowTotal = 0', () => {
    const row = { ...quoteAccepted1Rows[0], quantity: 0 };
    const calc = calculateQuoteRow(row);
    expect(calc.rowTotal).toBe(0);
    expect(calc.costTotal).toBe(0);
  });

  it('tyhjä rivit-taulukko: calculateQuote palauttaa nollat', () => {
    const calc = calculateQuote(quoteDraft1, []);
    expect(calc.lineSubtotal).toBe(0);
    expect(calc.total).toBe(0);
    expect(calc.marginPercent).toBe(0);
  });

  it('tarjousnumerot ovat uniikkeja', () => {
    const numbers = allQuotes.map(q => q.quoteNumber);
    const unique = new Set(numbers);
    expect(unique.size).toBe(numbers.length);
  });

  it('tarjous-id:t ovat uniikkeja', () => {
    const ids = allQuotes.map(q => q.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('rivi-id:t ovat uniikkeja kaikkien tarjousten läpi', () => {
    const ids = allQuoteRowsFlat.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('kaikilla riveillä on olemassaoleva quoteId', () => {
    const quoteIds = new Set(allQuotes.map(q => q.id));
    for (const row of allQuoteRowsFlat) {
      expect(quoteIds.has(row.quoteId)).toBe(true);
    }
  });

  it('projectById sisältää kaikki projekti-id:t', () => {
    const projIds = ['proj-001', 'proj-002', 'proj-003', 'proj-004', 'proj-005'];
    for (const id of projIds) {
      expect(projectById[id]).toBeDefined();
    }
  });

  it('customerById sisältää kaikki asiakas-id:t', () => {
    const custIds = ['cust-001', 'cust-002', 'cust-003'];
    for (const id of custIds) {
      expect(customerById[id]).toBeDefined();
    }
  });
});
