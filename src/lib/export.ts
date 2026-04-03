import * as XLSX from 'xlsx';
import { calculateQuote, calculateQuoteRow, formatCurrency, formatNumber, getQuoteExtraChargeLines } from './calculations';
import { Customer, InstallationGroup, Invoice, Product, Project, Quote, QuoteRow, QuoteTerms, Settings } from './types';
import { getInvoiceStatusLabel, invoiceToQuoteLike, isInvoiceOverdue } from './invoices';
import { renderTermTemplateHtml, renderTermTemplatePlainText, resolveTermTemplatePlaceholders } from './term-templates';

type ExcelCellValue = string | number;

export interface ReportExportKpis {
  totalProjects: number;
  totalQuotes: number;
  sentQuotes: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
  draftQuotes: number;
  acceptanceRate: number;
  totalValue: number;
  totalMargin: number;
  marginPercent: number;
}

export interface ReportExportStatusItem {
  name: string;
  value: number;
}

export interface ReportExportMonthlyItem {
  month: string;
  quotes: number;
  value: number;
  margin: number;
}

export interface ReportExportTopProductItem {
  name: string;
  code: string;
  quantity: number;
  value: number;
  count: number;
}

export interface ReportExportCustomerItem {
  name: string;
  projectCount: number;
  quoteCount: number;
  totalValue: number;
  acceptedValue: number;
  acceptanceRate: number;
}

export interface ReportExportProjectItem {
  id: string;
  name: string;
  customerName: string;
  region?: string;
  quoteCount: number;
  latestStatus?: Quote['status'];
  createdAt: string;
}

function csvEscape(value: unknown) {
  const normalized = `${value ?? ''}`.replace(/"/g, '""');
  return `"${normalized}"`;
}

function escapeHtml(value: unknown) {
  return `${value ?? ''}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('fi-FI');
}

function getQuoteStatusLabel(status: Quote['status']) {
  switch (status) {
    case 'accepted':
      return 'Hyväksytty';
    case 'rejected':
      return 'Hylätty';
    case 'sent':
      return 'Lähetetty';
    default:
      return 'Luonnos';
  }
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function downloadBinaryFile(content: ArrayBuffer, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function sanitizeWorksheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31) || 'Taulukko';
}

function roundExcelNumber(value: number, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function appendWorksheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: ExcelCellValue[][],
  widths?: number[]
) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  if (widths?.length) {
    worksheet['!cols'] = widths.map((width) => ({ wch: width }));
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeWorksheetName(name));
}

function formatWorksheetCell(
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number,
  format: string
) {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[address];
  if (!cell || typeof cell.v !== 'number') {
    return;
  }
  cell.z = format;
}

function renderQuoteRows(rows: QuoteRow[], internal: boolean) {
  return rows.map((row) => {
    if (row.mode === 'section') {
      return `
        <tr class="section-row">
          <td colspan="${internal ? 8 : 6}">${escapeHtml(row.productName)}</td>
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
        <td class="code-cell">${escapeHtml(row.productCode || '')}</td>
        <td class="description-cell">
          <strong>${escapeHtml(row.productName)}</strong>
          ${row.description ? `<div class="subtle">${escapeHtml(row.description)}</div>` : ''}
          ${row.notes ? `<div class="subtle">Huomio: ${escapeHtml(row.notes)}</div>` : ''}
        </td>
        <td class="number-cell">${formatNumber(row.quantity)}</td>
        <td class="number-cell">${escapeHtml(row.unit)}</td>
        ${internal ? `<td class="number-cell">${formatCurrency(row.purchasePrice)}</td>` : ''}
        <td class="number-cell">${formatCurrency(unitPrice)}</td>
        ${internal ? `<td class="number-cell">${formatCurrency(calc.marginAmount)}</td><td class="number-cell">${formatNumber(calc.marginPercent, 1)} %</td>` : ''}
        <td class="number-cell total-cell">${formatCurrency(calc.rowTotal)}</td>
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
  const extraChargeRows = getQuoteExtraChargeLines(quote).filter((line) => line.amount > 0);
  const resolvedTermsContent = terms
    ? resolveTermTemplatePlaceholders(terms.contentMd, { customer, project, quote, settings })
    : undefined;
  const companyName = settings?.companyName || 'Yritys Oy';
  const companyLogo = settings?.companyLogo?.trim();
  const customerAddress = [customer.address, customer.phone, customer.email]
    .filter(Boolean)
    .map((value) => escapeHtml(value))
    .join('<br />');
  const projectMeta = [
    ['Tarjousnumero', quote.quoteNumber],
    ...(internal ? [['Status', getQuoteStatusLabel(quote.status)]] : []),
    ['Voimassa asti', quote.validUntil ? formatDate(quote.validUntil) : '-'],
    ['Luotu', formatDate(quote.createdAt)],
    ...(quote.sentAt ? [['Lähetetty', formatDate(quote.sentAt)]] : []),
  ];

  return `
    <!DOCTYPE html>
    <html lang="fi">
      <head>
        <meta charset="UTF-8" />
        <title>Tarjous ${escapeHtml(quote.quoteNumber)}</title>
        <style>
          :root {
            --ink: #0f172a;
            --muted: #475569;
            --line: #dbe4ee;
            --line-strong: #c4d2e1;
            --panel: #f8fbff;
            --panel-strong: #eef4fb;
            --accent: #1d4ed8;
            --accent-soft: #dbeafe;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: var(--ink);
            background: #edf2f7;
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
            line-height: 1.45;
          }
          .page {
            max-width: 1040px;
            margin: 0 auto;
            padding: 40px 32px 56px;
            background: #fff;
          }
          .topband {
            height: 10px;
            border-radius: 999px;
            background: linear-gradient(90deg, #0f172a 0%, #1d4ed8 55%, #60a5fa 100%);
            margin-bottom: 28px;
          }
          .hero {
            display: grid;
            grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
            gap: 22px;
            margin-bottom: 24px;
            align-items: start;
          }
          .brand-block { display: flex; gap: 16px; align-items: flex-start; }
          .logo {
            width: 68px;
            height: 68px;
            border-radius: 18px;
            object-fit: cover;
            border: 1px solid var(--line);
            background: #fff;
          }
          .hero-eyebrow {
            margin: 0 0 8px;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-size: 11px;
            font-weight: 700;
          }
          .hero h1 {
            margin: 0;
            font-size: 34px;
            line-height: 1.05;
            letter-spacing: -0.03em;
          }
          .company-meta {
            margin-top: 12px;
            display: grid;
            gap: 4px;
            color: var(--muted);
            font-size: 14px;
          }
          .meta-card {
            border: 1px solid var(--line);
            border-radius: 20px;
            padding: 18px 20px;
            background: linear-gradient(180deg, #ffffff 0%, var(--panel) 100%);
          }
          .meta-card .meta-kicker {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--muted);
            margin-bottom: 8px;
          }
          .quote-id {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin-bottom: 14px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px 18px;
            font-size: 13px;
          }
          .meta-label { color: var(--muted); }
          .meta-value { font-weight: 600; text-align: right; }
          .draft-note {
            margin-top: 12px;
            display: inline-flex;
            align-items: center;
            padding: 6px 10px;
            border-radius: 999px;
            background: var(--accent-soft);
            color: var(--accent);
            font-size: 12px;
            font-weight: 600;
          }
          .title-panel {
            border: 1px solid var(--line);
            border-radius: 22px;
            padding: 18px 20px;
            background: var(--panel);
            margin-bottom: 18px;
          }
          .title-panel .eyebrow {
            color: var(--muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            margin-bottom: 8px;
            font-weight: 700;
          }
          .title-panel .title {
            font-size: 28px;
            line-height: 1.15;
            letter-spacing: -0.03em;
            font-weight: 700;
            margin: 0;
          }
          .title-panel .context {
            margin-top: 10px;
            color: var(--muted);
            font-size: 14px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 22px;
          }
          .panel {
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 18px 20px;
            background: #fff;
            min-height: 180px;
          }
          .panel h2 {
            margin: 0 0 14px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--muted);
          }
          .panel .lead {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 10px;
            letter-spacing: -0.02em;
          }
          .panel .stack {
            display: grid;
            gap: 6px;
            color: var(--muted);
            font-size: 14px;
          }
          .table-wrap {
            border: 1px solid var(--line);
            border-radius: 18px;
            overflow: hidden;
            margin: 20px 0 24px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
          }
          .table th,
          .table td {
            padding: 14px 14px;
            border-bottom: 1px solid var(--line);
            vertical-align: top;
            text-align: left;
          }
          .table th {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--muted);
            background: var(--panel);
            font-weight: 700;
          }
          .table tbody tr:last-child td { border-bottom: 0; }
          .table .section-row td {
            background: var(--accent-soft);
            color: var(--accent);
            font-weight: 700;
          }
          .code-cell {
            width: 170px;
            color: var(--muted);
            font-size: 13px;
          }
          .description-cell strong {
            display: block;
            font-size: 15px;
            line-height: 1.3;
            margin-bottom: 2px;
          }
          .number-cell { text-align: right; white-space: nowrap; }
          .total-cell { font-weight: 700; }
          .subtle {
            font-size: 12px;
            color: var(--muted);
            margin-top: 4px;
          }
          .summary-layout {
            display: grid;
            grid-template-columns: 1fr minmax(320px, 390px);
            gap: 18px;
            align-items: start;
          }
          .summary-note {
            border: 1px dashed var(--line-strong);
            border-radius: 18px;
            padding: 18px 20px;
            background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
            min-height: 100%;
          }
          .summary-note h3 {
            margin: 0 0 10px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--muted);
          }
          .summary-note p {
            margin: 0;
            color: var(--muted);
            font-size: 14px;
          }
          .summary {
            border: 1px solid var(--line);
            border-radius: 20px;
            padding: 18px 20px;
            background: linear-gradient(180deg, #ffffff 0%, var(--panel) 100%);
          }
          .summary h3 {
            margin: 0 0 12px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--muted);
          }
          .summary-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 16px;
            padding: 8px 0;
            font-size: 14px;
          }
          .summary-row span:first-child { color: var(--muted); }
          .summary-row strong { font-weight: 700; }
          .summary-row.total {
            border-top: 1px solid var(--line-strong);
            margin-top: 10px;
            padding-top: 14px;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.03em;
          }
          .summary-row.total span:first-child { color: var(--ink); }
          .summary-row.internal {
            border-top: 1px dashed var(--line);
            margin-top: 10px;
            padding-top: 12px;
          }
          .terms {
            margin-top: 28px;
            border-top: 1px solid var(--line);
            padding-top: 24px;
          }
          .terms h2 {
            margin: 0 0 10px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--muted);
          }
          .terms pre {
            white-space: pre-wrap;
            font-family: inherit;
            color: var(--muted);
            margin: 0;
            font-size: 14px;
          }
          .terms h1,
          .terms h3,
          .terms h4,
          .terms h5,
          .terms h6 {
            margin: 18px 0 8px;
            font-size: 16px;
            color: var(--ink);
          }
          .terms p,
          .terms ul {
            margin: 0 0 12px;
            color: var(--muted);
            font-size: 14px;
          }
          .terms ul {
            padding-left: 20px;
          }
          @media print {
            body { background: #fff; }
            .page { padding: 24px; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="topband"></div>

          <div class="hero">
            <div class="brand-block">
              ${companyLogo ? `<img class="logo" src="${escapeHtml(companyLogo)}" alt="${escapeHtml(companyName)}" />` : ''}
              <div>
                <p class="hero-eyebrow">Tarjous</p>
                <h1>${escapeHtml(companyName)}</h1>
                <div class="company-meta">
                  ${settings?.companyAddress ? `<div>${escapeHtml(settings.companyAddress)}</div>` : ''}
                  ${settings?.companyEmail ? `<div>${escapeHtml(settings.companyEmail)}</div>` : ''}
                  ${settings?.companyPhone ? `<div>${escapeHtml(settings.companyPhone)}</div>` : ''}
                </div>
              </div>
            </div>
            <div class="meta-card">
              <div class="meta-kicker">Tarjouksen tiedot</div>
              <div class="quote-id">${escapeHtml(quote.quoteNumber)}</div>
              <div class="meta-grid">
                ${projectMeta.map(([label, value]) => `
                  <div class="meta-label">${escapeHtml(label)}</div>
                  <div class="meta-value">${escapeHtml(value)}</div>
                `).join('')}
              </div>
              ${internal ? '<div class="draft-note">Sisäinen versio</div>' : ''}
            </div>
          </div>

          <div class="title-panel">
            <div class="eyebrow">Tarjouksen otsikko</div>
            <p class="title">${escapeHtml(quote.title)}</p>
            <div class="context">Projekti: ${escapeHtml(project.name)} • Kohde: ${escapeHtml(project.site)}</div>
          </div>

          <div class="grid">
            <div class="panel">
              <h2>Asiakas</h2>
              <p class="lead">${escapeHtml(customer.name)}</p>
              <div class="stack">
                ${customer.contactPerson ? `<div>${escapeHtml(customer.contactPerson)}</div>` : ''}
                ${customerAddress ? `<div>${customerAddress}</div>` : '<div>Ei yhteystietoja.</div>'}
                ${customer.businessId ? `<div>Y-tunnus: ${escapeHtml(customer.businessId)}</div>` : ''}
              </div>
            </div>
            <div class="panel">
              <h2>Projektin tiedot</h2>
              <p class="lead">${escapeHtml(project.name)}</p>
              <div class="stack">
                <div>Kohde: ${escapeHtml(project.site)}</div>
                <div>Voimassa asti: ${escapeHtml(quote.validUntil ? formatDate(quote.validUntil) : '-')}</div>
                ${project.region ? `<div>Alue: ${escapeHtml(project.region)}</div>` : ''}
                ${project.notes ? `<div>${escapeHtml(project.notes)}</div>` : ''}
              </div>
            </div>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Koodi</th>
                  <th>Rivi</th>
                  <th class="number-cell">Määrä</th>
                  <th class="number-cell">Yks.</th>
                  ${internal ? '<th class="number-cell">Osto</th>' : ''}
                  <th class="number-cell">Yks. hinta</th>
                  ${internal ? '<th class="number-cell">Kate €</th><th class="number-cell">Kate %</th>' : ''}
                  <th class="number-cell">Yhteensä</th>
                </tr>
              </thead>
              <tbody>${renderQuoteRows(rows, internal)}</tbody>
            </table>
          </div>

          <div class="summary-layout">
            <div class="summary-note">
              <h3>Huomiot</h3>
              <p>
                ${quote.notes
                  ? escapeHtml(quote.notes)
                  : 'Tarjouksen summat sisältävät valitut tuotteet, mahdolliset lisäkulut, alennuksen sekä arvonlisäveron.'}
              </p>
            </div>
            <div class="summary">
              <h3>Yhteenveto</h3>
              <div class="summary-row"><span>Rivien välisumma</span><strong>${formatCurrency(calculation.lineSubtotal)}</strong></div>
              <div class="summary-row"><span>Lisäkulut yhteensä</span><strong>${formatCurrency(calculation.extraChargesTotal)}</strong></div>
              ${extraChargeRows
                .map(
                  (line) =>
                    `<div class="summary-row"><span>${escapeHtml(line.label)}</span><strong>${formatCurrency(line.amount)}</strong></div>`
                )
                .join('')}
              <div class="summary-row"><span>Alennus</span><strong>-${formatCurrency(calculation.discountAmount)}</strong></div>
              <div class="summary-row"><span>Välisumma</span><strong>${formatCurrency(calculation.subtotal)}</strong></div>
              <div class="summary-row"><span>ALV ${formatNumber(quote.vatPercent, 1)} %</span><strong>${formatCurrency(calculation.vat)}</strong></div>
              <div class="summary-row total"><span>Loppusumma</span><span>${formatCurrency(calculation.total)}</span></div>
              ${internal ? `<div class="summary-row internal"><span>Kokonaiskate</span><strong>${formatCurrency(calculation.totalMargin)} (${formatNumber(calculation.marginPercent, 1)} %)</strong></div>` : ''}
            </div>
          </div>

          ${terms && resolvedTermsContent ? `<div class="terms"><h2>Tarjousehdot</h2>${renderTermTemplateHtml(resolvedTermsContent)}</div>` : ''}
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
  const extraChargeRows = getQuoteExtraChargeLines(quote).filter((line) => line.amount > 0);
  const resolvedTermsContent = terms
    ? resolveTermTemplatePlaceholders(terms.contentMd, { customer, project, quote, settings })
    : undefined;
  const workbook = XLSX.utils.book_new();

  const companyName = settings?.companyName || 'Yritys Oy';
  const summaryRows: Array<[string, number]> = [
    ['Rivien välisumma', roundExcelNumber(calculation.lineSubtotal)],
    ['Lisäkulut yhteensä', roundExcelNumber(calculation.extraChargesTotal)],
    ...extraChargeRows.map((line) => [line.label, roundExcelNumber(line.amount)] as [string, number]),
    ['Alennus', roundExcelNumber(-calculation.discountAmount)],
    ['Välisumma (alv 0 %)', roundExcelNumber(calculation.subtotal)],
    [`ALV ${formatNumber(quote.vatPercent, 1)} %`, roundExcelNumber(calculation.vat)],
    ['Loppusumma', roundExcelNumber(calculation.total)],
  ];

  const overviewRows: ExcelCellValue[][] = [
    ['TARJOUSYHTEENVETO', '', '', ''],
    [companyName, '', '', ''],
    ['', '', '', ''],
    ['Tarjousnumero', quote.quoteNumber, 'Päiväys', formatDate(quote.createdAt)],
    ['Asiakas', customer.name, 'Voimassa asti', quote.validUntil ? formatDate(quote.validUntil) : '-'],
    ['Projekti', project.name, 'Työkohde', project.site],
    ['', '', '', ''],
    ['YHTEENVETO', '', '', ''],
    ['Erä', '', '', 'Arvo (EUR)'],
    ...summaryRows.map(([label, value]) => [label, '', '', value]),
    ['', '', '', ''],
    ['Huomio', '', '', ''],
    [
      quote.notes
        ? quote.notes
        : 'Tarjouksen tarkemmat rivit löytyvät välilehdeltä "Tarjousrivit". Hinnat sisältävät valitut tuotteet, mahdolliset lisäkulut, alennuksen sekä arvonlisäveron.',
      '',
      '',
      '',
    ],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
  overviewSheet['!cols'] = [28, 26, 18, 24].map((width) => ({ wch: width }));
  overviewSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: 2 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 3 } },
  ];

  const summaryStartRow = 9;
  const summaryEndRow = summaryStartRow + summaryRows.length - 1;
  for (let rowIndex = summaryStartRow; rowIndex <= summaryEndRow; rowIndex += 1) {
    formatWorksheetCell(overviewSheet, rowIndex, 3, '#,##0.00');
  }
  formatWorksheetCell(overviewSheet, summaryEndRow, 3, '#,##0.00');

  XLSX.utils.book_append_sheet(workbook, overviewSheet, sanitizeWorksheetName('Tarjous'));

  const lineRows: ExcelCellValue[][] = [
    ['Koodi', 'Rivi', 'Kuvaus', 'Määrä', 'Yksikkö', 'Yksikköhinta (EUR)', 'Yhteensä (EUR)'],
    ...rows.map((row) => {
      if (row.mode === 'section') {
        return ['', `${row.productName}`, row.description || '', '', '', '', ''];
      }

      const calc = calculateQuoteRow(row);
      const unitPrice = row.mode === 'installation'
        ? row.installationPrice
        : row.mode === 'charge'
          ? row.salesPrice
          : row.salesPrice + row.installationPrice;

      return [
        row.productCode || '',
        row.productName,
        row.description || row.notes || '',
        roundExcelNumber(row.quantity, 3),
        row.unit,
        roundExcelNumber(unitPrice),
        roundExcelNumber(calc.rowTotal),
      ];
    }),
  ];

  const linesSheet = XLSX.utils.aoa_to_sheet(lineRows);
  linesSheet['!cols'] = [16, 34, 48, 12, 12, 18, 18].map((width) => ({ wch: width }));
  linesSheet['!autofilter'] = { ref: 'A1:G1' };

  for (let rowIndex = 1; rowIndex <= rows.length; rowIndex += 1) {
    formatWorksheetCell(linesSheet, rowIndex, 3, '#,##0.###');
    formatWorksheetCell(linesSheet, rowIndex, 5, '#,##0.00');
    formatWorksheetCell(linesSheet, rowIndex, 6, '#,##0.00');
  }

  XLSX.utils.book_append_sheet(workbook, linesSheet, sanitizeWorksheetName('Tarjousrivit'));

  if (terms && resolvedTermsContent) {
    appendWorksheet(
      workbook,
      'Ehdot',
      [
        ['Ehtopohja', terms.name],
        [],
        ['Sisältö'],
        [renderTermTemplatePlainText(resolvedTermsContent)],
      ],
      [18, 110]
    );
  }

  const file = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBinaryFile(
    file,
    `tarjous-${quote.quoteNumber}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

export function exportQuoteToInternalExcel(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  terms?: QuoteTerms,
  settings?: Settings
) {
  const calculation = calculateQuote(quote, rows);
  const extraChargeRows = getQuoteExtraChargeLines(quote).filter((line) => line.amount > 0);
  const resolvedTermsContent = terms
    ? resolveTermTemplatePlaceholders(terms.contentMd, { customer, project, quote, settings })
    : undefined;
  const workbook = XLSX.utils.book_new();

  const companyName = settings?.companyName || 'Yritys Oy';
  const summaryRows: Array<[string, number]> = [
    ['Rivien valisumma', roundExcelNumber(calculation.lineSubtotal)],
    ['Lisakulut yhteensa', roundExcelNumber(calculation.extraChargesTotal)],
    ...extraChargeRows.map((line) => [line.label, roundExcelNumber(line.amount)] as [string, number]),
    ['Alennus', roundExcelNumber(-calculation.discountAmount)],
    ['Valisumma', roundExcelNumber(calculation.subtotal)],
    [`ALV ${formatNumber(quote.vatPercent, 1)} %`, roundExcelNumber(calculation.vat)],
    ['Loppusumma', roundExcelNumber(calculation.total)],
    ['Kokonaiskate', roundExcelNumber(calculation.totalMargin)],
    ['Kokonaiskate %', roundExcelNumber(calculation.marginPercent, 1)],
  ];

  const sisainenRows: ExcelCellValue[][] = [
    [`Sisainen tarjous - ${quote.quoteNumber}`, '', '', '', '', '', '', '', '', '', '', ''],
    [companyName, '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['Perustiedot', '', '', '', '', '', '', '', '', '', '', ''],
    ['Tarjousnumero', quote.quoteNumber, '', 'Pvm', formatDate(quote.createdAt), '', 'Asiakas', customer.name, '', 'Status', getQuoteStatusLabel(quote.status), ''],
    ['Projekti', project.name, '', 'Tyokohde', project.site, '', 'Voimassa asti', quote.validUntil ? formatDate(quote.validUntil) : '-', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['Tarjousrivit', '', '', '', '', '', '', '', '', '', '', ''],
    ['Koodi', 'Rivi', 'Kuvaus', 'Tyyppi', 'Maara', 'Yks', 'Ostohinta', 'Myyntihinta', 'Asennushinta', 'Kate euroa', 'Kate %', 'Yhteensa'],
    ...rows.map((row) => {
      const calc = calculateQuoteRow(row);

      if (row.mode === 'section') {
        return ['', row.productName, row.description || '', 'Valiotsikko', '', '', '', '', '', '', '', ''];
      }

      return [
        row.productCode || '',
        row.productName,
        row.description || row.notes || '',
        row.mode,
        roundExcelNumber(row.quantity, 3),
        row.unit,
        roundExcelNumber(row.purchasePrice),
        roundExcelNumber(row.salesPrice),
        roundExcelNumber(row.installationPrice),
        roundExcelNumber(calc.marginAmount),
        roundExcelNumber(calc.marginPercent, 1),
        roundExcelNumber(calc.rowTotal),
      ];
    }),
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['Yhteenveto', '', '', '', '', '', '', '', '', '', '', ''],
    ['Era', '', '', '', '', '', '', '', '', '', '', 'Arvo'],
    ...summaryRows.map(([label, value]) => [label, '', '', '', '', '', '', '', '', '', '', value]),
  ];

  const sisainenSheet = XLSX.utils.aoa_to_sheet(sisainenRows);
  sisainenSheet['!cols'] = [16, 26, 36, 14, 10, 8, 13, 13, 13, 13, 10, 14].map((width) => ({ wch: width }));

  const linesHeaderRow = 8;
  const firstLineDataRow = linesHeaderRow + 1;
  const lastLineDataRow = firstLineDataRow + rows.length - 1;
  const summaryHeaderRow = lastLineDataRow + 3;
  const summaryFirstRow = summaryHeaderRow + 1;
  const summaryLastRow = summaryFirstRow + summaryRows.length - 1;

  sisainenSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 11 } },
    { s: { r: summaryHeaderRow - 1, c: 0 }, e: { r: summaryHeaderRow - 1, c: 11 } },
    { s: { r: summaryHeaderRow, c: 0 }, e: { r: summaryHeaderRow, c: 10 } },
  ];
  sisainenSheet['!autofilter'] = { ref: `A${linesHeaderRow + 1}:L${linesHeaderRow + 1}` };

  for (let rowIndex = firstLineDataRow; rowIndex <= lastLineDataRow; rowIndex += 1) {
    formatWorksheetCell(sisainenSheet, rowIndex, 4, '#,##0.###');
    formatWorksheetCell(sisainenSheet, rowIndex, 6, '#,##0.00');
    formatWorksheetCell(sisainenSheet, rowIndex, 7, '#,##0.00');
    formatWorksheetCell(sisainenSheet, rowIndex, 8, '#,##0.00');
    formatWorksheetCell(sisainenSheet, rowIndex, 9, '#,##0.00');
    formatWorksheetCell(sisainenSheet, rowIndex, 10, '#,##0.0');
    formatWorksheetCell(sisainenSheet, rowIndex, 11, '#,##0.00');
  }
  for (let rowIndex = summaryFirstRow; rowIndex <= summaryLastRow; rowIndex += 1) {
    const isPercentRow = (sisainenSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 0 })]?.v || '')
      .toString()
      .toLowerCase()
      .includes('%');
    formatWorksheetCell(sisainenSheet, rowIndex, 11, isPercentRow ? '#,##0.0' : '#,##0.00');
  }

  XLSX.utils.book_append_sheet(workbook, sisainenSheet, sanitizeWorksheetName('Sisainen tarjous'));

  if (quote.notes || quote.internalNotes || terms) {
    appendWorksheet(
      workbook,
      'Muistiinpanot',
      [
        ['Tarjoushuomautukset', quote.notes || ''],
        [],
        ['Sisäiset muistiinpanot', quote.internalNotes || ''],
        ...(terms && resolvedTermsContent ? [[], ['Ehtopohja', terms.name], ['Ehdot', renderTermTemplatePlainText(resolvedTermsContent)]] : []),
      ],
      [22, 110]
    );
  }

  const file = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBinaryFile(
    file,
    `tarjous-sisainen-${quote.quoteNumber}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

function invoiceDocumentHtml(invoice: Invoice) {
  const quoteLikeInvoice = invoiceToQuoteLike(invoice);
  const calculation = calculateQuote(quoteLikeInvoice, invoice.rows);
  const extraChargeRows = getQuoteExtraChargeLines(quoteLikeInvoice).filter((line) => line.amount > 0);
  const isOverdue = isInvoiceOverdue(invoice);
  const customerAddress = [invoice.customer.address, invoice.customer.phone, invoice.customer.email]
    .filter(Boolean)
    .map((value) => escapeHtml(value))
    .join('<br />');

  return `
    <!DOCTYPE html>
    <html lang="fi">
      <head>
        <meta charset="UTF-8" />
        <title>Lasku ${escapeHtml(invoice.invoiceNumber)}</title>
        <style>
          :root {
            --ink: #0f172a;
            --muted: #475569;
            --line: #dbe4ee;
            --line-strong: #c4d2e1;
            --panel: #f8fbff;
            --panel-strong: #eef4fb;
            --accent: #0f766e;
            --accent-soft: #ccfbf1;
            --warn: #b45309;
            --warn-soft: #fef3c7;
            --success: #166534;
            --success-soft: #dcfce7;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: var(--ink);
            background: #edf2f7;
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
            line-height: 1.45;
          }
          .page {
            max-width: 1040px;
            margin: 0 auto;
            padding: 40px 32px 56px;
            background: #fff;
          }
          .topband {
            height: 10px;
            border-radius: 999px;
            background: linear-gradient(90deg, #0f172a 0%, #0f766e 55%, #5eead4 100%);
            margin-bottom: 28px;
          }
          .hero {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
            gap: 22px;
            margin-bottom: 24px;
            align-items: start;
          }
          .brand-block { display: flex; gap: 16px; align-items: flex-start; }
          .logo {
            width: 68px;
            height: 68px;
            border-radius: 18px;
            object-fit: cover;
            border: 1px solid var(--line);
            background: #fff;
          }
          .hero-eyebrow {
            margin: 0 0 8px;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-size: 11px;
            font-weight: 700;
          }
          .hero h1 {
            margin: 0;
            font-size: 34px;
            line-height: 1.05;
            letter-spacing: -0.03em;
          }
          .company-meta {
            margin-top: 12px;
            display: grid;
            gap: 4px;
            color: var(--muted);
            font-size: 14px;
          }
          .meta-card,
          .panel,
          .summary,
          .note-panel {
            border: 1px solid var(--line);
            border-radius: 20px;
            background: linear-gradient(180deg, #ffffff 0%, var(--panel) 100%);
          }
          .meta-card {
            padding: 18px 20px;
          }
          .meta-kicker,
          .panel h2,
          .summary h3,
          .note-panel h3 {
            margin: 0 0 10px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--muted);
          }
          .invoice-id {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.03em;
            margin-bottom: 14px;
          }
          .meta-grid,
          .summary-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px 18px;
            font-size: 13px;
          }
          .meta-label,
          .summary-row span:first-child { color: var(--muted); }
          .meta-value { font-weight: 600; text-align: right; }
          .status-pill {
            margin-top: 12px;
            display: inline-flex;
            align-items: center;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
          }
          .status-pill.draft { background: #e2e8f0; color: #334155; }
          .status-pill.issued { background: var(--accent-soft); color: var(--accent); }
          .status-pill.paid { background: var(--success-soft); color: var(--success); }
          .status-pill.cancelled { background: #fee2e2; color: #b91c1c; }
          .status-pill.overdue { background: var(--warn-soft); color: var(--warn); }
          .title-panel {
            border: 1px solid var(--line);
            border-radius: 22px;
            padding: 18px 20px;
            background: var(--panel);
            margin-bottom: 18px;
          }
          .title-panel .eyebrow {
            color: var(--muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            margin-bottom: 8px;
            font-weight: 700;
          }
          .title-panel .title {
            font-size: 28px;
            line-height: 1.15;
            letter-spacing: -0.03em;
            font-weight: 700;
            margin: 0;
          }
          .title-panel .context {
            margin-top: 10px;
            color: var(--muted);
            font-size: 14px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 22px;
          }
          .panel {
            padding: 18px 20px;
            min-height: 180px;
          }
          .panel .lead {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 10px;
            letter-spacing: -0.02em;
          }
          .panel .stack {
            display: grid;
            gap: 6px;
            color: var(--muted);
            font-size: 14px;
          }
          .table-wrap {
            border: 1px solid var(--line);
            border-radius: 18px;
            overflow: hidden;
            margin: 20px 0 24px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
          }
          .table th,
          .table td {
            padding: 14px 14px;
            border-bottom: 1px solid var(--line);
            vertical-align: top;
            text-align: left;
          }
          .table th {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--muted);
            background: var(--panel);
            font-weight: 700;
          }
          .table tbody tr:last-child td { border-bottom: 0; }
          .table .section-row td {
            background: var(--accent-soft);
            color: var(--accent);
            font-weight: 700;
          }
          .code-cell {
            width: 170px;
            color: var(--muted);
            font-size: 13px;
          }
          .description-cell strong {
            display: block;
            font-size: 15px;
            line-height: 1.3;
            margin-bottom: 2px;
          }
          .number-cell { text-align: right; white-space: nowrap; }
          .total-cell { font-weight: 700; }
          .subtle {
            font-size: 12px;
            color: var(--muted);
            margin-top: 4px;
          }
          .summary-layout {
            display: grid;
            grid-template-columns: 1fr minmax(320px, 390px);
            gap: 18px;
            align-items: start;
          }
          .note-panel {
            padding: 18px 20px;
            min-height: 100%;
          }
          .note-panel p {
            margin: 0;
            color: var(--muted);
            font-size: 14px;
            white-space: pre-wrap;
          }
          .summary {
            padding: 18px 20px;
          }
          .summary-row {
            padding: 8px 0;
            font-size: 14px;
          }
          .summary-row strong { font-weight: 700; }
          .summary-row.total {
            border-top: 1px solid var(--line-strong);
            margin-top: 10px;
            padding-top: 14px;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.03em;
          }
          .summary-row.total span:first-child { color: var(--ink); }
          @media print {
            body { background: #fff; }
            .page { padding: 24px; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="topband"></div>

          <div class="hero">
            <div class="brand-block">
              ${invoice.company.companyLogo ? `<img class="logo" src="${escapeHtml(invoice.company.companyLogo)}" alt="${escapeHtml(invoice.company.companyName)}" />` : ''}
              <div>
                <p class="hero-eyebrow">Lasku</p>
                <h1>${escapeHtml(invoice.company.companyName)}</h1>
                <div class="company-meta">
                  ${invoice.company.companyAddress ? `<div>${escapeHtml(invoice.company.companyAddress)}</div>` : ''}
                  ${invoice.company.companyEmail ? `<div>${escapeHtml(invoice.company.companyEmail)}</div>` : ''}
                  ${invoice.company.companyPhone ? `<div>${escapeHtml(invoice.company.companyPhone)}</div>` : ''}
                  ${invoice.company.businessId ? `<div>Y-tunnus: ${escapeHtml(invoice.company.businessId)}</div>` : ''}
                </div>
              </div>
            </div>
            <div class="meta-card">
              <div class="meta-kicker">Laskun tiedot</div>
              <div class="invoice-id">${escapeHtml(invoice.invoiceNumber)}</div>
              <div class="meta-grid">
                <div class="meta-label">Päiväys</div>
                <div class="meta-value">${escapeHtml(formatDate(invoice.issueDate))}</div>
                <div class="meta-label">Eräpäivä</div>
                <div class="meta-value">${escapeHtml(formatDate(invoice.dueDate))}</div>
                <div class="meta-label">Viitenumero</div>
                <div class="meta-value">${escapeHtml(invoice.referenceNumber)}</div>
                <div class="meta-label">Lähdetarjous</div>
                <div class="meta-value">${escapeHtml(invoice.sourceQuoteNumber)}</div>
              </div>
              <div class="status-pill ${isOverdue ? 'overdue' : invoice.status}">
                ${escapeHtml(isOverdue ? `Erääntynyt • ${getInvoiceStatusLabel(invoice.status)}` : getInvoiceStatusLabel(invoice.status))}
              </div>
            </div>
          </div>

          <div class="title-panel">
            <div class="eyebrow">Laskun otsikko</div>
            <p class="title">${escapeHtml(invoice.title)}</p>
            <div class="context">Projekti: ${escapeHtml(invoice.project.name)} • Kohde: ${escapeHtml(invoice.project.site)}</div>
          </div>

          <div class="grid">
            <div class="panel">
              <h2>Laskutetaan</h2>
              <p class="lead">${escapeHtml(invoice.customer.name)}</p>
              <div class="stack">
                ${invoice.customer.contactPerson ? `<div>${escapeHtml(invoice.customer.contactPerson)}</div>` : ''}
                ${customerAddress ? `<div>${customerAddress}</div>` : '<div>Ei yhteystietoja.</div>'}
                ${invoice.customer.businessId ? `<div>Y-tunnus: ${escapeHtml(invoice.customer.businessId)}</div>` : ''}
              </div>
            </div>
            <div class="panel">
              <h2>Maksutiedot</h2>
              <div class="stack">
                <div>Maksuehto: ${invoice.paymentTermDays} pv</div>
                <div>IBAN: ${escapeHtml(invoice.company.iban || '-')}</div>
                <div>BIC: ${escapeHtml(invoice.company.bic || '-')}</div>
                <div>Viitenumero: ${escapeHtml(invoice.referenceNumber)}</div>
                <div>Viivästyskorko: ${formatNumber(invoice.company.lateInterestPercent || 0, 1)} %</div>
              </div>
            </div>
            <div class="panel">
              <h2>Laskun peruste</h2>
              <p class="lead">${escapeHtml(invoice.project.name)}</p>
              <div class="stack">
                <div>Kohde: ${escapeHtml(invoice.project.site)}</div>
                <div>Tarjousnumero: ${escapeHtml(invoice.sourceQuoteNumber)}</div>
                <div>Tarjousrevisio: ${invoice.sourceQuoteRevisionNumber}</div>
                ${invoice.project.notes ? `<div>${escapeHtml(invoice.project.notes)}</div>` : ''}
              </div>
            </div>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Koodi</th>
                  <th>Rivi</th>
                  <th class="number-cell">Määrä</th>
                  <th class="number-cell">Yks.</th>
                  <th class="number-cell">Yks. hinta</th>
                  <th class="number-cell">Yhteensä</th>
                </tr>
              </thead>
              <tbody>${renderQuoteRows(invoice.rows, false)}</tbody>
            </table>
          </div>

          <div class="summary-layout">
            <div class="note-panel">
              <h3>Lisätiedot</h3>
              <p>${invoice.notes ? escapeHtml(invoice.notes) : 'Lasku on luotu hyväksytystä tarjouksesta snapshot-muodossa. Tämä dokumentti säilyttää laskutushetken sisällön riippumatta myöhemmistä tarjousmuutoksista.'}</p>
            </div>
            <div class="summary">
              <h3>Yhteenveto</h3>
              <div class="summary-row"><span>Rivien välisumma</span><strong>${formatCurrency(calculation.lineSubtotal)}</strong></div>
              <div class="summary-row"><span>Lisäkulut yhteensä</span><strong>${formatCurrency(calculation.extraChargesTotal)}</strong></div>
              ${extraChargeRows
                .map(
                  (line) =>
                    `<div class="summary-row"><span>${escapeHtml(line.label)}</span><strong>${formatCurrency(line.amount)}</strong></div>`
                )
                .join('')}
              <div class="summary-row"><span>Alennus</span><strong>-${formatCurrency(calculation.discountAmount)}</strong></div>
              <div class="summary-row"><span>Veroton yhteensä</span><strong>${formatCurrency(calculation.subtotal)}</strong></div>
              <div class="summary-row"><span>ALV ${formatNumber(invoice.vatPercent, 1)} %</span><strong>${formatCurrency(calculation.vat)}</strong></div>
              <div class="summary-row total"><span>Laskun loppusumma</span><span>${formatCurrency(calculation.total)}</span></div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function exportInvoiceToPDF(invoice: Invoice) {
  const html = invoiceDocumentHtml(invoice);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

interface ReportPdfExportInput {
  periodLabel: string;
  generatedAt: string;
  kpiData: ReportExportKpis;
  statusData: ReportExportStatusItem[];
  monthlyData: ReportExportMonthlyItem[];
  topProducts: ReportExportTopProductItem[];
  customerAnalysis: ReportExportCustomerItem[];
  recentProjects: ReportExportProjectItem[];
  settings?: Settings;
}

function reportDocumentHtml(input: ReportPdfExportInput) {
  const companyName = input.settings?.companyName?.trim() || 'Tarjouslaskenta';

  return `
    <!DOCTYPE html>
    <html lang="fi">
      <head>
        <meta charset="UTF-8" />
        <title>Raportointi ${escapeHtml(input.periodLabel)}</title>
        <style>
          :root {
            --ink: #0f172a;
            --muted: #475569;
            --line: #dbe4ee;
            --panel: #f8fbff;
            --panel-strong: #eef4fb;
            --accent: #1d4ed8;
            --accent-soft: #dbeafe;
            --good: #15803d;
            --bad: #b91c1c;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #edf2f7;
            color: var(--ink);
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
            line-height: 1.45;
          }
          .page {
            max-width: 1120px;
            margin: 0 auto;
            padding: 36px 32px 48px;
            background: #fff;
          }
          .topband {
            height: 10px;
            border-radius: 999px;
            background: linear-gradient(90deg, #0f172a 0%, #1d4ed8 55%, #60a5fa 100%);
            margin-bottom: 28px;
          }
          .hero {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
            gap: 20px;
            margin-bottom: 20px;
            align-items: start;
          }
          .hero h1 {
            margin: 0;
            font-size: 34px;
            line-height: 1.05;
            letter-spacing: -0.03em;
          }
          .eyebrow {
            margin: 0 0 8px;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-size: 11px;
            font-weight: 700;
          }
          .hero p {
            margin: 12px 0 0;
            color: var(--muted);
            font-size: 14px;
            max-width: 56ch;
          }
          .meta-card {
            border: 1px solid var(--line);
            border-radius: 20px;
            padding: 18px 20px;
            background: linear-gradient(180deg, #ffffff 0%, var(--panel) 100%);
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px 14px;
            font-size: 13px;
          }
          .meta-label { color: var(--muted); }
          .meta-value { font-weight: 600; text-align: right; }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 22px;
          }
          .kpi-card {
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 16px 18px;
            background: #fff;
          }
          .kpi-card h2 {
            margin: 0 0 10px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--muted);
          }
          .kpi-value {
            font-size: 28px;
            line-height: 1;
            font-weight: 800;
            letter-spacing: -0.03em;
            margin-bottom: 6px;
          }
          .kpi-meta {
            font-size: 13px;
            color: var(--muted);
          }
          .section {
            border: 1px solid var(--line);
            border-radius: 20px;
            background: #fff;
            margin-bottom: 18px;
            overflow: hidden;
          }
          .section-head {
            padding: 18px 20px 10px;
            border-bottom: 1px solid var(--line);
            background: var(--panel);
          }
          .section-head h2 {
            margin: 0;
            font-size: 18px;
            letter-spacing: -0.02em;
          }
          .section-head p {
            margin: 6px 0 0;
            color: var(--muted);
            font-size: 13px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
          }
          .table th,
          .table td {
            padding: 12px 14px;
            border-bottom: 1px solid var(--line);
            text-align: left;
            vertical-align: top;
          }
          .table th {
            background: #fff;
            color: var(--muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-weight: 700;
          }
          .table tbody tr:last-child td { border-bottom: 0; }
          .mono { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
          .summary-grid {
            display: grid;
            grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1.1fr);
            gap: 18px;
            margin-bottom: 18px;
          }
          .status-list {
            display: grid;
            gap: 10px;
            padding: 18px 20px 20px;
          }
          .status-row {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 12px;
            align-items: center;
            font-size: 14px;
          }
          .pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 3px 8px;
            background: var(--accent-soft);
            color: var(--accent);
            font-size: 11px;
            font-weight: 700;
          }
          .muted-box {
            padding: 18px 20px 20px;
            color: var(--muted);
            font-size: 14px;
          }
          .status-accepted { color: var(--good); font-weight: 700; }
          .status-rejected { color: var(--bad); font-weight: 700; }
          .status-sent { color: var(--accent); font-weight: 700; }
          .status-draft { color: var(--muted); font-weight: 700; }
          @media print {
            body { background: #fff; }
            .page { padding: 24px; }
          }
          @media (max-width: 920px) {
            .hero,
            .summary-grid,
            .kpi-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="topband"></div>

          <div class="hero">
            <div>
              <p class="eyebrow">Raportointi</p>
              <h1>${escapeHtml(companyName)}</h1>
              <p>Tarjouslaskennan ja projektiseurannan yhteenveto valitulta ajanjaksolta. Raportti kokoaa avainluvut, statukset, kehityksen sekä tärkeimmät asiakkaat, tuotteet ja projektit yhteen dokumenttiin.</p>
            </div>
            <div class="meta-card">
              <div class="meta-grid">
                <div class="meta-label">Aikaväli</div>
                <div class="meta-value">${escapeHtml(input.periodLabel)}</div>
                <div class="meta-label">Luotu</div>
                <div class="meta-value">${escapeHtml(input.generatedAt)}</div>
                <div class="meta-label">Tarjouksia</div>
                <div class="meta-value">${input.kpiData.totalQuotes}</div>
                <div class="meta-label">Projekteja</div>
                <div class="meta-value">${input.kpiData.totalProjects}</div>
              </div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <h2>Kokonaisarvo</h2>
              <div class="kpi-value">${formatCurrency(input.kpiData.totalValue)}</div>
              <div class="kpi-meta">Kate ${formatNumber(input.kpiData.marginPercent, 1)} %</div>
            </div>
            <div class="kpi-card">
              <h2>Kokonaiskate</h2>
              <div class="kpi-value">${formatCurrency(input.kpiData.totalMargin)}</div>
              <div class="kpi-meta">Laskettu koko raporttijaksolta</div>
            </div>
            <div class="kpi-card">
              <h2>Hyväksymisaste</h2>
              <div class="kpi-value">${formatNumber(input.kpiData.acceptanceRate, 1)} %</div>
              <div class="kpi-meta">${input.kpiData.acceptedQuotes} / ${input.kpiData.sentQuotes} lähetetyistä</div>
            </div>
            <div class="kpi-card">
              <h2>Luonnokset</h2>
              <div class="kpi-value">${input.kpiData.draftQuotes}</div>
              <div class="kpi-meta">Avoimet keskeneräiset tarjoukset</div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="section">
              <div class="section-head">
                <h2>Tilastoyhteenveto</h2>
                <p>Tarjousten jakauma tiloittain.</p>
              </div>
              <div class="status-list">
                ${[
                  ['Luonnos', input.kpiData.draftQuotes, 'status-draft'],
                  ['Lähetetty', input.kpiData.sentQuotes, 'status-sent'],
                  ['Hyväksytty', input.kpiData.acceptedQuotes, 'status-accepted'],
                  ['Hylätty', input.kpiData.rejectedQuotes, 'status-rejected'],
                ]
                  .map(
                    ([label, value, className]) => `
                      <div class="status-row">
                        <span>${escapeHtml(label)}</span>
                        <strong class="${className}">${value}</strong>
                        <span class="pill">${input.kpiData.totalQuotes > 0 ? formatNumber((Number(value) / input.kpiData.totalQuotes) * 100, 0) : '0'} %</span>
                      </div>
                    `
                  )
                  .join('')}
              </div>
            </div>

            <div class="section">
              <div class="section-head">
                <h2>Kuukausittainen kehitys</h2>
                <p>Tarjousten määrä, arvo ja kate kuukausitasolla.</p>
              </div>
              ${
                input.monthlyData.length > 0
                  ? `
                <table class="table">
                  <thead>
                    <tr>
                      <th>Kuukausi</th>
                      <th class="mono">Tarjoukset</th>
                      <th class="mono">Arvo</th>
                      <th class="mono">Kate</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${input.monthlyData
                      .map(
                        (row) => `
                          <tr>
                            <td>${escapeHtml(row.month)}</td>
                            <td class="mono">${row.quotes}</td>
                            <td class="mono">${formatCurrency(row.value)}</td>
                            <td class="mono">${formatCurrency(row.margin)}</td>
                          </tr>
                        `
                      )
                      .join('')}
                  </tbody>
                </table>
              `
                  : `<div class="muted-box">Ei kuukausittaista dataa valitulla ajanjaksolla.</div>`
              }
            </div>
          </div>

          <div class="section">
            <div class="section-head">
              <h2>Top tuotteet</h2>
              <p>Eniten arvoa tuottaneet tuotteet raporttijaksolla.</p>
            </div>
            ${
              input.topProducts.length > 0
                ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Koodi</th>
                    <th>Tuote</th>
                    <th class="mono">Määrä</th>
                    <th class="mono">Esiintymät</th>
                    <th class="mono">Arvo</th>
                  </tr>
                </thead>
                <tbody>
                  ${input.topProducts
                    .slice(0, 15)
                    .map(
                      (product, index) => `
                        <tr>
                          <td>${index + 1}</td>
                          <td>${escapeHtml(product.code || '-')}</td>
                          <td>${escapeHtml(product.name)}</td>
                          <td class="mono">${formatNumber(product.quantity)}</td>
                          <td class="mono">${product.count}</td>
                          <td class="mono">${formatCurrency(product.value)}</td>
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : `<div class="muted-box">Ei tuotedataa raporttijaksolla.</div>`
            }
          </div>

          <div class="section">
            <div class="section-head">
              <h2>Asiakasanalyysi</h2>
              <p>Asiakkaat, projektimäärät ja hyväksytty arvo.</p>
            </div>
            ${
              input.customerAnalysis.length > 0
                ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>Asiakas</th>
                    <th class="mono">Projektit</th>
                    <th class="mono">Tarjoukset</th>
                    <th class="mono">Kokonaisarvo</th>
                    <th class="mono">Hyväksytty arvo</th>
                    <th class="mono">Hyväksymisaste</th>
                  </tr>
                </thead>
                <tbody>
                  ${input.customerAnalysis
                    .slice(0, 20)
                    .map(
                      (customer) => `
                        <tr>
                          <td>${escapeHtml(customer.name)}</td>
                          <td class="mono">${customer.projectCount}</td>
                          <td class="mono">${customer.quoteCount}</td>
                          <td class="mono">${formatCurrency(customer.totalValue)}</td>
                          <td class="mono">${formatCurrency(customer.acceptedValue)}</td>
                          <td class="mono">${formatNumber(customer.acceptanceRate, 0)} %</td>
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : `<div class="muted-box">Ei asiakasdataa raporttijaksolla.</div>`
            }
          </div>

          <div class="section">
            <div class="section-head">
              <h2>Viimeisimmät projektit</h2>
              <p>Tuoreimmat projektit ja niiden tarjousstatus.</p>
            </div>
            ${
              input.recentProjects.length > 0
                ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>Projekti</th>
                    <th>Asiakas</th>
                    <th>Alue</th>
                    <th class="mono">Tarjouksia</th>
                    <th>Status</th>
                    <th>Luotu</th>
                  </tr>
                </thead>
                <tbody>
                  ${input.recentProjects
                    .slice(0, 10)
                    .map(
                      (project) => `
                        <tr>
                          <td>${escapeHtml(project.name)}</td>
                          <td>${escapeHtml(project.customerName)}</td>
                          <td>${escapeHtml(project.region || '-')}</td>
                          <td class="mono">${project.quoteCount}</td>
                          <td>${escapeHtml(project.latestStatus ? getQuoteStatusLabel(project.latestStatus) : 'Ei tarjouksia')}</td>
                          <td>${escapeHtml(formatDate(project.createdAt))}</td>
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : `<div class="muted-box">Ei projektidataa raporttijaksolla.</div>`
            }
          </div>
        </div>
        <script>
          window.addEventListener('load', () => {
            window.setTimeout(() => window.print(), 150);
          });
        </script>
      </body>
    </html>
  `;
}

export function exportReportsToPDF(input: ReportPdfExportInput) {
  const html = reportDocumentHtml(input);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, '_blank');

  if (!popup) {
    throw new Error('Salli ponnahdusikkunat PDF-vientiä varten.');
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
