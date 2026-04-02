import { calculateQuote, calculateQuoteRow, formatCurrency, formatNumber, getQuoteExtraChargeLines } from './calculations';
import { Customer, InstallationGroup, Product, Project, Quote, QuoteRow, QuoteTerms, Settings } from './types';

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
  URL.revokeObjectURL(url);
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
  const companyName = settings?.companyName || 'Yritys Oy';
  const companyLogo = settings?.companyLogo?.trim();
  const customerAddress = [customer.address, customer.phone, customer.email]
    .filter(Boolean)
    .map((value) => escapeHtml(value))
    .join('<br />');
  const projectMeta = [
    ['Tarjousnumero', quote.quoteNumber],
    ['Status', getQuoteStatusLabel(quote.status)],
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

          ${terms ? `<div class="terms"><h2>Tarjousehdot</h2><pre>${escapeHtml(terms.content)}</pre></div>` : ''}
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
