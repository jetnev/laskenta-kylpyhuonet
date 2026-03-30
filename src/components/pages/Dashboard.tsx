import { Card } from '../ui/card';
import {
  useProjects,
  useQuotes,
  useQuoteRows,
  useProducts,
  useInstallationGroups,
  useCustomers,
} from '../../hooks/use-data';
import { calculateQuote, formatCurrency, formatNumber } from '../../lib/calculations';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '../ui/button';

export default function Dashboard() {
  const { projects } = useProjects();
  const { quotes } = useQuotes();
  const { getRowsForQuote } = useQuoteRows();
  const { products } = useProducts();
  const { groups } = useInstallationGroups();
  const { customers } = useCustomers();

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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Etusivu</h1>
        <p className="mt-2 text-muted-foreground">
          Tervetuloa Laskenta-järjestelmään
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Projektit</div>
          <div className="mt-2 text-3xl font-semibold">{projects.length}</div>
          <p className="mt-2 text-xs text-muted-foreground">
            Aktiiviset projektit
          </p>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">Tarjoukset</div>
          <div className="mt-2 text-3xl font-semibold">{quotes.length}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {draftCount} luonnos • {sentCount} lähetetty • {acceptedCount} hyväksytty
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Pika-aloitus</h2>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aloita uuden tarjouksen luominen tai hallinnoi tuotteita.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="gap-2">
                <a href="/projects">
                  <ArrowRight />
                  Luo uusi projekti
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href="/products">
                  <ArrowRight />
                  Hallinnoi tuotteita
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href="/reports">
                  <ArrowRight />
                  Näytä raportit
                </a>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Järjestelmän tila</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tuotteita rekisterissä</span>
              <span className="text-sm font-medium">{products.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Hintaryhmiä</span>
              <span className="text-sm font-medium">{groups.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Asiakkaita</span>
              <span className="text-sm font-medium">{customers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Luonnos-tarjouksia</span>
              <span className="text-sm font-medium">{draftCount}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
