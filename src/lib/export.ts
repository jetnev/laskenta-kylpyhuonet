import { calculateQuote, calculateQuoteRow, formatCurrency, formatNumber } from './calculations';
import { Customer, InstallationGroup, Product, Project, Quote, QuoteRow, QuoteTerms, Settings } from './types';

function csvEscape(value: unknown) {
  const normalized = `${value ?? ''}`.replace(/"/g, '""');
  return `"${normalized}"`;
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function renderQuoteRows(rows: QuoteRow[], internal: boolean) {
  return rows.map((row) => {
    if (row.mode === 'section') {
      return `
        <tr class="section-row">
          <td colspan="${internal ? 8 : 6}">${row.productName}</td>
        </tr>
      `;
    }

    const calc = calculateQuoteRow(row);
    const unitPrice = row.mode === 'installation'
      ? row.installationPrice
      : row.mode === 'charge'
        ? row.salesPrice
        : row.salesPrice + row.installationPrice;

    return `
      <tr>
        <td>${row.productCode || ''}</td>
        <td>
          <strong>${row.productName}</strong>
          ${row.description ? `<div class="subtle">${row.description}</div>` : ''}
          ${row.notes ? `<div class="subtle">Huom: ${row.notes}</div>` : ''}
        </td>
        <td>${formatNumber(row.quantity)}</td>
        <td>${row.unit}</td>
        ${internal ? `<td>${formatCurrency(row.purchasePrice)}</td>` : ''}
        <td>${formatCurrency(unitPrice)}</td>
        ${internal ? `<td>${formatCurrency(calc.marginAmount)}</td><td>${formatNumber(calc.marginPercent, 1)} %</td>` : ''}
        <td>${formatCurrency(calc.rowTotal)}</td>
      </tr>
    `;
  }).join('');
}

function quoteDocumentHtml(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  terms?: QuoteTerms,
  settings?: Settings,
  internal: boolean = false
) {
  const calculation = calculateQuote(quote, rows);
  const companyName = settings?.companyName || 'Yritys Oy';

  return `
    <!DOCTYPE html>
    <html lang="fi">
      <head>
        <meta charset="UTF-8" />
        <title>Tarjous ${quote.quoteNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: #f8fafc; }
          .page { max-width: 1040px; margin: 0 auto; padding: 40px 32px 56px; background: #fff; }
          .hero { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
          .hero h1 { margin: 0 0 8px; font-size: 28px; }
          .hero p { margin: 2px 0; color: #475569; }
          .pill { display: inline-block; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 12px; margin-right: 8px; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
          .panel { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 18px; }
          .panel h2 { margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: left; }
          .table th { font-size: 12px; text-transform: uppercase; color: #64748b; background: #f8fafc; }
          .table .section-row td { background: #eff6ff; font-weight: bold; color: #1d4ed8; }
          .subtle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .summary { margin-left: auto; width: min(420px, 100%); border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 18px; }
          .summary-row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; }
          .summary-row.total { border-top: 1px solid #cbd5e1; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: bold; }
          .terms { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
          .terms pre { white-space: pre-wrap; font-family: inherit; color: #475569; }
          @media print { body { background: #fff; } .page { padding: 24px; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div>
              <h1>${companyName}</h1>
              ${settings?.companyAddress ? `<p>${settings.companyAddress}</p>` : ''}
              ${settings?.companyEmail ? `<p>${settings.companyEmail}</p>` : ''}
              ${settings?.companyPhone ? `<p>${settings.companyPhone}</p>` : ''}
            </div>
            <div>
              <div class="pill">${internal ? 'Sisäinen näkymä' : 'Asiakasnäkymä'}</div>
              <div class="pill">${quote.quoteNumber}</div>
              <div class="pill">${quote.status}</div>
            </div>
          </div>

          <div class="grid">
            <div class="panel">
              <h2>Asiakas</h2>
              <p><strong>${customer.name}</strong></p>
              ${customer.contactPerson ? `<p>${customer.contactPerson}</p>` : ''}
              ${customer.email ? `<p>${customer.email}</p>` : ''}
              ${customer.phone ? `<p>${customer.phone}</p>` : ''}
              ${customer.address ? `<p>${customer.address}</p>` : ''}
            </div>
            <div class="panel">
              <h2>Tarjous</h2>
              <p><strong>${quote.title}</strong></p>
              <p>Projekti: ${project.name}</p>
              <p>Kohde: ${project.site}</p>
              <p>Voimassa asti: ${quote.validUntil || '-'}</p>
              <p>Luotu: ${new Date(quote.createdAt).toLocaleDateString('fi-FI')}</p>
              ${quote.sentAt ? `<p>Lähetetty: ${new Date(quote.sentAt).toLocaleDateString('fi-FI')}</p>` : ''}
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Koodi</th>
                <th>Rivi</th>
                <th>Määrä</th>
                <th>Yks.</th>
                ${internal ? '<th>Osto</th>' : ''}
                <th>á-hinta</th>
                ${internal ? '<th>Kate €</th><th>Kate %</th>' : ''}
                <th>Yhteensä</th>
              </tr>
            </thead>
            <tbody>${renderQuoteRows(rows, internal)}</tbody>
          </table>

          <div class="summary">
            <div class="summary-row"><span>Rivien välisumma</span><strong>${formatCurrency(calculation.lineSubtotal)}</strong></div>
            <div class="summary-row"><span>Projektikulut</span><strong>${formatCurrency(quote.projectCosts)}</strong></div>
            <div class="summary-row"><span>Toimituskulut</span><strong>${formatCurrency(quote.deliveryCosts)}</strong></div>
            <div class="summary-row"><span>Asennuskulut</span><strong>${formatCurrency(quote.installationCosts)}</strong></div>
            <div class="summary-row"><span>Alennus</span><strong>-${formatCurrency(calculation.discountAmount)}</strong></div>
            <div class="summary-row"><span>Välisumma</span><strong>${formatCurrency(calculation.subtotal)}</strong></div>
            <div class="summary-row"><span>ALV ${formatNumber(quote.vatPercent, 1)} %</span><strong>${formatCurrency(calculation.vat)}</strong></div>
            <div class="summary-row total"><span>Loppusumma</span><span>${formatCurrency(calculation.total)}</span></div>
            ${internal ? `<div class="summary-row"><span>Kokonaiskate</span><strong>${formatCurrency(calculation.totalMargin)} (${formatNumber(calculation.marginPercent, 1)} %)</strong></div>` : ''}
          </div>

          ${quote.notes ? `<div class="terms"><h2>Tarjoushuomautukset</h2><pre>${quote.notes}</pre></div>` : ''}
          ${terms ? `<div class="terms"><h2>Tarjousehdot</h2><pre>${terms.content}</pre></div>` : ''}
        </div>
      </body>
    </html>
  `;
}

export function exportQuoteToPDF(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  terms?: QuoteTerms,
  settings?: Settings
) {
  const html = quoteDocumentHtml(quote, rows, customer, project, terms, settings, false);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export function exportQuoteToCustomerExcel(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  terms?: QuoteTerms,
  settings?: Settings
) {
  const calculation = calculateQuote(quote, rows);
  const headerRows = [
    ['Tarjousnumero', quote.quoteNumber],
    ['Yritys', settings?.companyName || 'Yritys Oy'],
    ['Asiakas', customer.name],
    ['Projekti', project.name],
    ['Työkohde', project.site],
    ['Voimassa asti', quote.validUntil || ''],
    [],
    ['Koodi', 'Rivi', 'Kuvaus', 'Määrä', 'Yksikkö', 'á-hinta', 'Yhteensä'],
  ];

  const bodyRows = rows.map((row) => {
    const calc = calculateQuoteRow(row);
    return [
      row.productCode || '',
      row.productName,
      row.description || row.notes || '',
      row.mode === 'section' ? '' : formatNumber(row.quantity),
      row.mode === 'section' ? '' : row.unit,
      row.mode === 'section' ? '' : formatCurrency(row.mode === 'installation' ? row.installationPrice : row.salesPrice + row.installationPrice),
      row.mode === 'section' ? '' : formatCurrency(calc.rowTotal),
    ];
  });

  const footerRows = [
    [],
    ['Välisumma', '', '', '', '', '', formatCurrency(calculation.subtotal)],
    ['ALV', '', '', '', '', '', formatCurrency(calculation.vat)],
    ['Yhteensä', '', '', '', '', '', formatCurrency(calculation.total)],
    ...(terms ? [['Ehdot', terms.name, '', '', '', '', '']] : []),
  ];

  const csv = [...headerRows, ...bodyRows, ...footerRows]
    .map((row) => row.map(csvEscape).join(';'))
    .join('\n');

  downloadTextFile(csv, `tarjous-${quote.quoteNumber}.csv`, 'text/csv;charset=utf-8;');
}

export function exportQuoteToInternalExcel(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  _terms?: QuoteTerms,
  settings?: Settings
) {
  const calculation = calculateQuote(quote, rows);
  const csvRows = [
    ['Tarjousnumero', quote.quoteNumber],
    ['Yritys', settings?.companyName || 'Yritys Oy'],
    ['Asiakas', customer.name],
    ['Projekti', project.name],
    [],
    ['Koodi', 'Rivi', 'Määrä', 'Yks.', 'Ostohinta', 'Myyntihinta', 'Asennushinta', 'Kate €', 'Kate %', 'Yhteensä'],
    ...rows.map((row) => {
      const calc = calculateQuoteRow(row);
      return [
        row.productCode || '',
        row.productName,
        row.mode === 'section' ? '' : formatNumber(row.quantity),
        row.mode === 'section' ? '' : row.unit,
        row.mode === 'section' ? '' : formatCurrency(row.purchasePrice),
        row.mode === 'section' ? '' : formatCurrency(row.salesPrice),
        row.mode === 'section' ? '' : formatCurrency(row.installationPrice),
        row.mode === 'section' ? '' : formatCurrency(calc.marginAmount),
        row.mode === 'section' ? '' : `${formatNumber(calc.marginPercent, 1)} %`,
        row.mode === 'section' ? '' : formatCurrency(calc.rowTotal),
      ];
    }),
    [],
    ['Välisumma', '', '', '', '', '', '', '', '', formatCurrency(calculation.subtotal)],
    ['ALV', '', '', '', '', '', '', '', '', formatCurrency(calculation.vat)],
    ['Loppusumma', '', '', '', '', '', '', '', '', formatCurrency(calculation.total)],
    ['Kokonaiskate', '', '', '', '', '', '', '', '', `${formatCurrency(calculation.totalMargin)} (${formatNumber(calculation.marginPercent, 1)} %)`],
  ];

  const csv = csvRows.map((row) => row.map(csvEscape).join(';')).join('\n');
  downloadTextFile(csv, `tarjous-sisainen-${quote.quoteNumber}.csv`, 'text/csv;charset=utf-8;');
}

export interface ExcelColumn {
  field: keyof Product | 'installationGroup';
  label: string;
  enabled: boolean;
}

export function exportProductsToExcel(
  products: Product[],
  groups: InstallationGroup[],
  columns: ExcelColumn[]
) {
  const enabledColumns = columns.filter((column) => column.enabled);
  const rows = [
    enabledColumns.map((column) => csvEscape(column.label)).join(';'),
    ...products.map((product) =>
      enabledColumns.map((column) => {
        if (column.field === 'installationGroup') {
          const group = product.installationGroupId
            ? groups.find((item) => item.id === product.installationGroupId)
            : undefined;
          return csvEscape(group?.name || '');
        }
        return csvEscape(product[column.field as keyof Product]);
      }).join(';')
    ),
  ];

  downloadTextFile(
    rows.join('\n'),
    `tuoterekisteri-${new Date().toISOString().split('T')[0]}.csv`,
    'text/csv;charset=utf-8;'
  );
}
