import { Quote, QuoteRow, Customer, Project, QuoteTerms, Settings } from './types';
import { calculateQuote, calculateQuoteRow, formatCurrency } from './calculations';

export function exportQuoteToPDF(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  terms?: QuoteTerms,
  settings?: Settings
) {
  const calculation = calculateQuote(quote, rows);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tarjous ${quote.title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
        .total { font-weight: bold; font-size: 1.2em; }
      </style>
    </head>
    <body>
      <h1>${settings?.companyName || 'Yritys'}</h1>
      <h2>Tarjous: ${quote.title}</h2>
      <p><strong>Asiakas:</strong> ${customer.name}</p>
      <p><strong>Projekti:</strong> ${project.name} - ${project.site}</p>
      <p><strong>Päivämäärä:</strong> ${new Date().toLocaleDateString('fi-FI')}</p>
      
      <table>
        <thead>
          <tr>
            <th>Tuote</th>
            <th>Määrä</th>
            <th>Yks.</th>
            <th>á-hinta</th>
            <th>Yhteensä</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => {
            const calc = calculateQuoteRow(row);
            return `
              <tr>
                <td>${row.productCode ? row.productCode + ' - ' : ''}${row.productName}</td>
                <td>${row.quantity}</td>
                <td>${row.unit}</td>
                <td>${formatCurrency(row.salesPrice)}</td>
                <td>${formatCurrency(calc.rowTotal)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <p><strong>Välisumma:</strong> ${formatCurrency(calculation.subtotal)}</p>
      <p><strong>ALV ${quote.vatPercent}%:</strong> ${formatCurrency(calculation.vat)}</p>
      <p class="total"><strong>Yhteensä:</strong> ${formatCurrency(calculation.total)}</p>
      
      ${quote.notes ? `<p><strong>Huomautukset:</strong> ${quote.notes}</p>` : ''}
      ${terms ? `<div><h3>Ehdot</h3><p>${terms.content}</p></div>` : ''}
    </body>
    </html>
  `;
  
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
  
  let csv = 'Tarjous\n';
  csv += `Asiakas,${customer.name}\n`;
  csv += `Projekti,${project.name}\n`;
  csv += `\n`;
  csv += 'Tuote,Määrä,Yksikkö,á-hinta,Yhteensä\n';
  
  rows.forEach(row => {
    const calc = calculateQuoteRow(row);
    csv += `"${row.productName}",${row.quantity},${row.unit},${row.salesPrice},${calc.rowTotal}\n`;
  });
  
  csv += `\n`;
  csv += `Välisumma,,,,${calculation.subtotal}\n`;
  csv += `ALV ${quote.vatPercent}%,,,,${calculation.vat}\n`;
  csv += `Yhteensä,,,,${calculation.total}\n`;
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tarjous-${quote.id}.csv`;
  link.click();
}

export function exportQuoteToInternalExcel(
  quote: Quote,
  rows: QuoteRow[],
  customer: Customer,
  project: Project,
  settings?: Settings
) {
  const calculation = calculateQuote(quote, rows);
  
  let csv = 'Sisäinen tarjous\n';
  csv += `Asiakas,${customer.name}\n`;
  csv += `Projekti,${project.name}\n`;
  csv += `\n`;
  csv += 'Tuote,Määrä,Yksikkö,Ostohinta,Myyntihinta,Asennus,Kate-%,Yhteensä\n';
  
  rows.forEach(row => {
    const calc = calculateQuoteRow(row);
    csv += `"${row.productName}",${row.quantity},${row.unit},${row.purchasePrice},${row.salesPrice},${row.installationPrice},${row.marginPercent},${calc.rowTotal}\n`;
  });
  
  csv += `\n`;
  csv += `Välisumma,,,,,,,${calculation.subtotal}\n`;
  csv += `ALV ${quote.vatPercent}%,,,,,,,${calculation.vat}\n`;
  csv += `Yhteensä,,,,,,,${calculation.total}\n`;
  csv += `Kate,,,,,,,${calculation.totalMargin} (${calculation.marginPercent.toFixed(1)}%)\n`;
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tarjous-sisainen-${quote.id}.csv`;
  link.click();
}
