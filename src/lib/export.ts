import {
  Quote,
  QuoteRow,
  Customer,
  Project,
  QuoteTerms,
  Settings,
} from './types';
import {
  calculateQuote,
  calculateQuoteRow,
  formatCurrency,
  formatNumber,
} from './calculations';

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function exportQuoteToPDF(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  terms: QuoteTerms | undefined,
  settings: Settings
) {
  const calculation = calculateQuote(quote, rows);
  const date = new Date().toLocaleDateString('fi-FI');

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tarjous - ${quote.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563eb;
    }
    .company {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .quote-info {
      text-align: right;
    }
    .customer-section {
      background: #f8fafc;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 8px;
    }
    .customer-section h3 {
      margin-top: 0;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    th {
      background: #334155;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    th.right, td.right {
      text-align: right;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:hover {
      background: #f8fafc;
    }
    .totals {
      margin-top: 30px;
      text-align: right;
    }
    .totals-row {
      display: flex;
      justify-content: flex-end;
      padding: 8px 0;
    }
    .totals-label {
      width: 200px;
      text-align: right;
      padding-right: 20px;
    }
    .totals-value {
      width: 150px;
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .total-final {
      font-size: 20px;
      font-weight: bold;
      border-top: 2px solid #334155;
      padding-top: 12px;
      margin-top: 8px;
    }
    .terms {
      margin-top: 40px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    .terms h3 {
      margin-top: 0;
      color: #334155;
    }
    .terms p {
      white-space: pre-wrap;
      margin: 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    @media print {
      body {
        margin: 0;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${settings.companyName || 'Yritys Oy'}</div>
      ${settings.companyAddress ? `<div>${settings.companyAddress}</div>` : ''}
      ${settings.companyPhone ? `<div>Puh: ${settings.companyPhone}</div>` : ''}
      ${settings.companyEmail ? `<div>${settings.companyEmail}</div>` : ''}
    </div>
    <div class="quote-info">
      <h1 style="margin: 0 0 10px 0;">TARJOUS</h1>
      <div><strong>Tarjous nro:</strong> ${quote.title}</div>
      <div><strong>Revisio:</strong> ${quote.revisionNumber}</div>
      <div><strong>Päivämäärä:</strong> ${date}</div>
    </div>
  </div>

  <div class="customer-section">
    <h3>Asiakkaan tiedot</h3>
    <p><strong>${customer.name}</strong></p>
    ${customer.contactPerson ? `<p>Yhteyshenkilö: ${customer.contactPerson}</p>` : ''}
    ${customer.address ? `<p>${customer.address}</p>` : ''}
    ${customer.email ? `<p>Sähköposti: ${customer.email}</p>` : ''}
    ${customer.phone ? `<p>Puhelin: ${customer.phone}</p>` : ''}
    <p><strong>Työmaa:</strong> ${project.site}</p>
    <p><strong>Projekti:</strong> ${project.name}</p>
  </div>

  ${quote.notes ? `<div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-radius: 8px;">
    <strong>Huomiot:</strong><br>
    ${quote.notes}
  </div>` : ''}

  <h2 style="color: #334155;">Tarjousrivit</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Tuote/Palvelu</th>
        <th class="right">Määrä</th>
        <th class="right">Yks.</th>
        <th class="right">à hinta</th>
        <th class="right">Yhteensä</th>
      </tr>
    </thead>
    <tbody>`;

  rows.forEach((row) => {
    const calc = calculateQuoteRow(row);
    
    if (row.mode === 'product' || row.mode === 'product_installation') {
      html += `
      <tr>
        <td><strong>${row.productName}</strong></td>
        <td class="right">${formatNumber(row.quantity, 2)}</td>
        <td class="right">${row.unit}</td>
        <td class="right">${formatCurrency(calc.effectivePrice)}</td>
        <td class="right"><strong>${formatCurrency(calc.productTotal)}</strong></td>
      </tr>`;
    }
    
    if (row.mode === 'installation' || row.mode === 'product_installation') {
      const installationName = row.mode === 'product_installation' 
        ? `Asennus: ${row.productName}` 
        : row.productName;
      
      html += `
      <tr>
        <td><em>${installationName}</em></td>
        <td class="right">${formatNumber(row.quantity, 2)}</td>
        <td class="right">${row.unit}</td>
        <td class="right">${formatCurrency(row.installationPrice * row.regionMultiplier)}</td>
        <td class="right"><strong>${formatCurrency(calc.installationTotal)}</strong></td>
      </tr>`;
    }
  });

  html += `
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <div class="totals-label">Välisumma:</div>
      <div class="totals-value">${formatCurrency(calculation.subtotal)}</div>
    </div>
    <div class="totals-row">
      <div class="totals-label">ALV (${quote.vatPercent}%):</div>
      <div class="totals-value">${formatCurrency(calculation.vat)}</div>
    </div>
    <div class="totals-row total-final">
      <div class="totals-label">Yhteensä:</div>
      <div class="totals-value">${formatCurrency(calculation.total)}</div>
    </div>
  </div>`;

  if (terms) {
    html += `
  <div class="terms">
    <h3>${terms.name}</h3>
    <p>${terms.content}</p>
  </div>`;
  }

  html += `
  <div class="footer">
    <p>Kiitos luottamuksestanne!</p>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
}

export function exportQuoteToCustomerExcel(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  terms: QuoteTerms | undefined,
  settings: Settings
) {
  const calculation = calculateQuote(quote, rows);
  const date = new Date().toLocaleDateString('fi-FI');

  let csv = 'Tarjous\n';
  csv += `${settings.companyName || 'Yritys Oy'}\n`;
  csv += `\n`;
  csv += `Tarjous nro:,${quote.title}\n`;
  csv += `Revisio:,${quote.revisionNumber}\n`;
  csv += `Päivämäärä:,${date}\n`;
  csv += `\n`;
  csv += `Asiakas:,${customer.name}\n`;
  csv += `Yhteyshenkilö:,${customer.contactPerson || ''}\n`;
  csv += `Työmaa:,${project.site}\n`;
  csv += `Projekti:,${project.name}\n`;
  csv += `\n`;
  
  if (quote.notes) {
    csv += `Huomiot:,${quote.notes}\n`;
    csv += `\n`;
  }

  csv += `Tuote/Palvelu,Määrä,Yks.,à hinta,Yhteensä\n`;

  rows.forEach((row) => {
    const calc = calculateQuoteRow(row);
    
    if (row.mode === 'product' || row.mode === 'product_installation') {
      csv += `${row.productName},${formatNumber(row.quantity, 2)},${row.unit},${formatCurrency(calc.effectivePrice)},${formatCurrency(calc.productTotal)}\n`;
    }
    
    if (row.mode === 'installation' || row.mode === 'product_installation') {
      const installationName = row.mode === 'product_installation' 
        ? `Asennus: ${row.productName}` 
        : row.productName;
      csv += `${installationName},${formatNumber(row.quantity, 2)},${row.unit},${formatCurrency(row.installationPrice * row.regionMultiplier)},${formatCurrency(calc.installationTotal)}\n`;
    }
  });

  csv += `\n`;
  csv += `Välisumma:,,,${formatCurrency(calculation.subtotal)}\n`;
  csv += `ALV (${quote.vatPercent}%):,,,${formatCurrency(calculation.vat)}\n`;
  csv += `Yhteensä:,,,${formatCurrency(calculation.total)}\n`;

  if (terms) {
    csv += `\n`;
    csv += `Sopimusehdot: ${terms.name}\n`;
    csv += `${terms.content}\n`;
  }

  downloadTextFile(
    `tarjous_${quote.title}_asiakas.csv`,
    csv,
    'text/csv;charset=utf-8;'
  );
}

export function exportQuoteToInternalExcel(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  settings: Settings
) {
  const calculation = calculateQuote(quote, rows);
  const date = new Date().toLocaleDateString('fi-FI');

  let csv = 'Sisäinen tarjouslaskelma\n';
  csv += `Tarjous:,${quote.title}\n`;
  csv += `Revisio:,${quote.revisionNumber}\n`;
  csv += `Päivämäärä:,${date}\n`;
  csv += `Asiakas:,${customer.name}\n`;
  csv += `Projekti:,${project.name}\n`;
  csv += `Työmaa:,${project.site}\n`;
  csv += `Alue:,${project.region} (kerroin: ${project.regionCoefficient})\n`;
  csv += `\n`;

  csv += `Tuotekoodi,Tuote,Tyyppi,Määrä,Yks.,Ostohinta,Myyntihinta,Asennushinta,Kate-%,Ylikirjoitus,Tuote €,Asennus €,Rivi yhteensä €\n`;

  rows.forEach((row) => {
    const calc = calculateQuoteRow(row);
    const marginPercent = row.purchasePrice > 0 
      ? ((calc.effectivePrice - row.purchasePrice) / row.purchasePrice * 100)
      : 0;
    
    csv += `${row.productCode || ''},`;
    csv += `${row.productName},`;
    csv += `${row.mode === 'product' ? 'Tuote' : row.mode === 'installation' ? 'Asennus' : 'Tuote+Asennus'},`;
    csv += `${formatNumber(row.quantity, 2)},`;
    csv += `${row.unit},`;
    csv += `${formatCurrency(row.purchasePrice)},`;
    csv += `${formatCurrency(row.salesPrice)},`;
    csv += `${formatCurrency(row.installationPrice)},`;
    csv += `${formatNumber(marginPercent, 1)}%,`;
    csv += `${row.overridePrice ? formatCurrency(row.overridePrice) : ''},`;
    csv += `${formatCurrency(calc.productTotal)},`;
    csv += `${formatCurrency(calc.installationTotal)},`;
    csv += `${formatCurrency(calc.rowTotal)}\n`;
  });

  csv += `\n`;
  csv += `Välisumma:,,,,,,,,,,,${formatCurrency(calculation.subtotal)}\n`;
  csv += `Ostokustannukset:,,,,,,,,,,,${formatCurrency(calculation.totalPurchaseCost)}\n`;
  csv += `Kate:,,,,,,,,,,,${formatCurrency(calculation.totalMargin)}\n`;
  csv += `Kate-%:,,,,,,,,,,,${formatNumber(calculation.marginPercent, 1)}%\n`;
  csv += `ALV (${quote.vatPercent}%):,,,,,,,,,,,${formatCurrency(calculation.vat)}\n`;
  csv += `Yhteensä:,,,,,,,,,,,${formatCurrency(calculation.total)}\n`;

  downloadTextFile(
    `tarjous_${quote.title}_sisainen.csv`,
    csv,
    'text/csv;charset=utf-8;'
  );
}
