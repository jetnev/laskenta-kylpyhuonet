import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import {
  useProjects,
  useQuotes,
  useCustomers,
  useQuoteRows,
  useProducts,
} from '../../hooks/use-data';
import { calculateQuote, formatCurrency, formatNumber } from '../../lib/calculations';

export default function ReportsPage() {
  const { projects } = useProjects();
  const { quotes } = useQuotes();
  const { customers } = useCustomers();
  const { getRowsForQuote } = useQuoteRows();
  const { getProduct } = useProducts();

  const draftCount = quotes.filter((q) => q.status === 'draft').length;
  const sentCount = quotes.filter((q) => q.status === 'sent').length;
  const acceptedCount = quotes.filter((q) => q.status === 'accepted').length;
  const rejectedCount = quotes.filter((q) => q.status === 'rejected').length;

  let totalSales = 0;
  let totalMargin = 0;
  let totalPurchaseCost = 0;

  quotes.forEach((quote) => {
    if (quote.status === 'accepted') {
      const rows = getRowsForQuote(quote.id);
      const calc = calculateQuote(quote, rows);
      totalSales += calc.total;
      totalMargin += calc.totalMargin;
      totalPurchaseCost += calc.totalPurchaseCost;
    }
  });

  const avgMarginPercent = totalPurchaseCost > 0 ? (totalMargin / totalPurchaseCost) * 100 : 0;

  const productCounts = new Map<string, { code: string; name: string; count: number; unit: string }>();

  quotes.forEach((quote) => {
    if (quote.status === 'sent' || quote.status === 'accepted') {
      const rows = getRowsForQuote(quote.id);
      rows.forEach((row) => {
        if (row.productId) {
          const existing = productCounts.get(row.productId);
          if (existing) {
            existing.count += row.quantity;
          } else {
            const product = getProduct(row.productId);
            productCounts.set(row.productId, {
              code: row.productCode || '',
              name: row.productName,
              count: row.quantity,
              unit: row.unit,
            });
          }
        }
      });
    }
  });

  const topProducts = Array.from(productCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const latestProjects = projects
    .map((project) => {
      const projectQuotes = quotes.filter((q) => q.projectId === project.id);
      const customer = customers.find((c) => c.id === project.customerId);

      let totalValue = 0;
      projectQuotes.forEach((quote) => {
        if (quote.status === 'accepted') {
          const rows = getRowsForQuote(quote.id);
          const calc = calculateQuote(quote, rows);
          totalValue += calc.total;
        }
      });

      const latestQuote = projectQuotes.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return {
        projectId: project.id,
        projectName: project.name,
        customerName: customer?.name || '—',
        quoteCount: projectQuotes.length,
        totalValue,
        latestQuoteDate: latestQuote?.createdAt || project.createdAt,
        status: latestQuote?.status || 'draft',
      };
    })
    .sort((a, b) => new Date(b.latestQuoteDate).getTime() - new Date(a.latestQuoteDate).getTime())
    .slice(0, 10);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-semibold">Raportointi</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Projektit</div>
          <div className="mt-2 text-3xl font-semibold">{projects.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Tarjoukset</div>
          <div className="mt-2 text-3xl font-semibold">{quotes.length}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {draftCount} luonnos • {sentCount} lähetetty • {acceptedCount} hyväksytty • {rejectedCount} hylätty
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Kokonaismyynti</div>
          <div className="mt-2 text-3xl font-semibold">{formatCurrency(totalSales)}</div>
          <div className="mt-2 text-xs text-muted-foreground">Hyväksytyt tarjoukset</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Kate</div>
          <div className="mt-2 text-3xl font-semibold">{formatCurrency(totalMargin)}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {formatNumber(avgMarginPercent, 1)}% keskiarvo
          </div>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Top 15 tarjotut tuotteet</h2>
          {topProducts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Ei tarjottuja tuotteita
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tuotekoodi</TableHead>
                    <TableHead>Nimi</TableHead>
                    <TableHead className="text-right">Määrä</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{product.code}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(product.count, 2)} {product.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Viimeisimmät projektit</h2>
          {latestProjects.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Ei projekteja
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projekti</TableHead>
                    <TableHead>Asiakas</TableHead>
                    <TableHead className="text-right">Arvo</TableHead>
                    <TableHead>Tila</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestProjects.map((project) => (
                    <TableRow key={project.projectId}>
                      <TableCell className="font-medium">{project.projectName}</TableCell>
                      <TableCell>{project.customerName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(project.totalValue)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            project.status === 'draft'
                              ? 'secondary'
                              : project.status === 'sent'
                                ? 'default'
                                : project.status === 'accepted'
                                  ? 'default'
                                  : 'destructive'
                          }
                        >
                          {project.status === 'draft' && 'Luonnos'}
                          {project.status === 'sent' && 'Lähetetty'}
                          {project.status === 'accepted' && 'Hyväksytty'}
                          {project.status === 'rejected' && 'Hylätty'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
