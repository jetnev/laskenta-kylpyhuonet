import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { CheckCircle, XCircle, Clock, ChartBar, CalendarBlank, FilePdf, FileText, FileXls, Folder, Users } from '@phosphor-icons/react';
import { useProjects, useQuotes, useQuoteRows, useCustomers } from '../../hooks/use-data';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import { fi } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { calculateQuote, calculateQuoteRow } from '../../lib/calculations';
import { useAuth } from '../../hooks/use-auth';
import { buildSalesOwnershipSummary, filterOwnedRecords, getResponsibleUserLabel } from '../../lib/ownership';
import { exportReportsToPDF } from '../../lib/export';
import { useDocumentSettings } from '../../hooks/use-data';

type TimeRange = '1m' | '3m' | '6m' | '12m' | 'all' | 'custom';
type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [ownerFilter, setOwnerFilter] = useState('all');
  const { user, users, canManageUsers } = useAuth();
  const { projects } = useProjects();
  const { quotes } = useQuotes();
  const { rows } = useQuoteRows();
  const { customers } = useCustomers();
  const { documentSettings } = useDocumentSettings();

  const responsibleUsers = useMemo(
    () =>
      [user, ...users]
        .filter((candidate): candidate is NonNullable<typeof user> => Boolean(candidate))
        .filter((candidate, index, collection) => collection.findIndex((item) => item.id === candidate.id) === index)
        .map((candidate) => ({ id: candidate.id, displayName: candidate.displayName }))
        .sort((left, right) => left.displayName.localeCompare(right.displayName, 'fi')),
    [user, users]
  );

  const filteredProjects = useMemo(
    () => filterOwnedRecords(projects, ownerFilter),
    [ownerFilter, projects]
  );

  const filteredCustomers = useMemo(
    () => filterOwnedRecords(customers, ownerFilter),
    [customers, ownerFilter]
  );

  const ownerScopedQuotes = useMemo(
    () => filterOwnedRecords(quotes, ownerFilter),
    [ownerFilter, quotes]
  );

  const timeFilteredQuotes = useMemo(() => {
    if (timeRange === 'custom' && dateRange.from && dateRange.to) {
      return quotes.filter(q => {
        const date = new Date(q.createdAt);
        return date >= dateRange.from! && date <= dateRange.to!;
      });
    }
    
    if (timeRange === 'all') return quotes;
    
    const now = new Date();
    let monthsAgo = 3;
    
    switch (timeRange) {
      case '1m': monthsAgo = 1; break;
      case '3m': monthsAgo = 3; break;
      case '6m': monthsAgo = 6; break;
      case '12m': monthsAgo = 12; break;
    }
    
    const startDate = subMonths(now, monthsAgo);
    
    return quotes.filter(q => new Date(q.createdAt) >= startDate);
  }, [quotes, timeRange, dateRange]);

  const filteredQuotes = useMemo(
    () => filterOwnedRecords(timeFilteredQuotes, ownerFilter),
    [ownerFilter, timeFilteredQuotes]
  );

  const quoteAnalytics = useMemo(() => {
    const analytics = new Map<string, { rows: typeof rows; subtotal: number; margin: number }>();

    filteredQuotes.forEach((quote) => {
      const quoteRows = rows.filter((row) => row.quoteId === quote.id);
      const calculation = calculateQuote(quote, quoteRows);
      analytics.set(quote.id, {
        rows: quoteRows,
        subtotal: calculation.subtotal,
        margin: calculation.totalMargin,
      });
    });

    return analytics;
  }, [filteredQuotes, rows]);

  const kpiData = useMemo(() => {
    const totalProjects = filteredProjects.length;
    const totalQuotes = filteredQuotes.length;
    const sentQuotes = filteredQuotes.filter(q => q.status === 'sent').length;
    const acceptedQuotes = filteredQuotes.filter(q => q.status === 'accepted').length;
    const rejectedQuotes = filteredQuotes.filter(q => q.status === 'rejected').length;
    const draftQuotes = filteredQuotes.filter(q => q.status === 'draft').length;
    
    const acceptanceRate = sentQuotes > 0 ? (acceptedQuotes / sentQuotes) * 100 : 0;
    
    let totalValue = 0;
    let totalMargin = 0;

    filteredQuotes.forEach(quote => {
      totalValue += quoteAnalytics.get(quote.id)?.subtotal || 0;
      totalMargin += quoteAnalytics.get(quote.id)?.margin || 0;
    });
    
    const marginPercent = totalValue > 0 ? (totalMargin / totalValue) * 100 : 0;

    return {
      totalProjects,
      totalQuotes,
      sentQuotes,
      acceptedQuotes,
      rejectedQuotes,
      draftQuotes,
      acceptanceRate,
      totalValue,
      totalMargin,
      marginPercent,
    };
  }, [filteredProjects.length, filteredQuotes, quoteAnalytics]);

  const statusData = useMemo(() => [
    { name: 'Luonnos', value: kpiData.draftQuotes, color: 'oklch(0.65 0.02 250)' },
    { name: 'Lähetetty', value: kpiData.sentQuotes, color: 'oklch(0.65 0.15 200)' },
    { name: 'Hyväksytty', value: kpiData.acceptedQuotes, color: 'oklch(0.65 0.15 140)' },
    { name: 'Hylätty', value: kpiData.rejectedQuotes, color: 'oklch(0.55 0.22 25)' },
  ].filter(d => d.value > 0), [kpiData]);

  const monthlyData = useMemo(() => {
    const months: { [key: string]: { quotes: number; value: number; margin: number } } = {};
    
    filteredQuotes.forEach(quote => {
      const monthKey = format(new Date(quote.createdAt), 'yyyy-MM');
      if (!months[monthKey]) {
        months[monthKey] = { quotes: 0, value: 0, margin: 0 };
      }
      months[monthKey].quotes += 1;

      months[monthKey].value += quoteAnalytics.get(quote.id)?.subtotal || 0;
      months[monthKey].margin += quoteAnalytics.get(quote.id)?.margin || 0;
    });

    return Object.keys(months)
      .sort()
      .map(key => ({
        month: format(new Date(key + '-01'), 'MMM yyyy', { locale: fi }),
        quotes: months[key].quotes,
        value: Math.round(months[key].value),
        margin: Math.round(months[key].margin),
      }));
  }, [filteredQuotes, quoteAnalytics]);

  const topProducts = useMemo(() => {
    const productStats: { [key: string]: { name: string; code: string; quantity: number; value: number; count: number } } = {};
    
    filteredQuotes.forEach(quote => {
      const quoteRows = quoteAnalytics.get(quote.id)?.rows || [];
      quoteRows.forEach(row => {
        if (!row.productId) return;
        
        if (!productStats[row.productId]) {
          productStats[row.productId] = {
            name: row.productName,
            code: row.productCode || '',
            quantity: 0,
            value: 0,
            count: 0,
          };
        }
        
        const rowTotal = calculateQuoteRow(row).rowTotal;
        
        productStats[row.productId].quantity += row.quantity;
        productStats[row.productId].value += rowTotal;
        productStats[row.productId].count += 1;
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [filteredQuotes, quoteAnalytics]);

  const customerAnalysis = useMemo(() => {
    const customerById = new Map(filteredCustomers.map((customer) => [customer.id, customer]));
    const customerStats: { 
      [key: string]: { 
        id: string;
        name: string; 
        ownerUserId?: string | null;
        projectCount: number; 
        quoteCount: number; 
        totalValue: number; 
        acceptedValue: number; 
        acceptedCount: number;
        sentCount: number;
      } 
    } = {};
    
    filteredProjects.forEach(project => {
      if (!project.customerId) return;
      
      const customer = customerById.get(project.customerId);
      if (!customer) return;
      
      if (!customerStats[project.customerId]) {
        customerStats[project.customerId] = {
          id: customer.id,
          name: customer.name,
          ownerUserId: customer.ownerUserId,
          projectCount: 0,
          quoteCount: 0,
          totalValue: 0,
          acceptedValue: 0,
          acceptedCount: 0,
          sentCount: 0,
        };
      }
      
      customerStats[project.customerId].projectCount += 1;
      
      const projectQuotes = filteredQuotes.filter(q => q.projectId === project.id);
      customerStats[project.customerId].quoteCount += projectQuotes.length;
      
      projectQuotes.forEach(quote => {
        const quoteValue = quoteAnalytics.get(quote.id)?.subtotal || 0;
        
        customerStats[project.customerId].totalValue += quoteValue;
        
        if (quote.status === 'accepted') {
          customerStats[project.customerId].acceptedValue += quoteValue;
          customerStats[project.customerId].acceptedCount += 1;
        }
        
        if (quote.status === 'sent') {
          customerStats[project.customerId].sentCount += 1;
        }
      });
    });

    return Object.values(customerStats)
      .sort((a, b) => b.totalValue - a.totalValue)
      .map(stat => ({
        ...stat,
        responsibleUserLabel: getResponsibleUserLabel(stat.ownerUserId, responsibleUsers),
        acceptanceRate: stat.sentCount > 0 ? (stat.acceptedCount / stat.sentCount) * 100 : 0,
      }));
  }, [filteredCustomers, filteredProjects, filteredQuotes, quoteAnalytics, responsibleUsers]);

  const recentProjects = useMemo(() => {
    return [...filteredProjects]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(project => {
        const customer = filteredCustomers.find(c => c.id === project.customerId) || customers.find(c => c.id === project.customerId);
        const projectQuotes = ownerScopedQuotes.filter(q => q.projectId === project.id);
        const latestQuote = [...projectQuotes].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        return {
          ...project,
          customerName: customer?.name || 'Ei asiakasta',
          responsibleUserLabel: getResponsibleUserLabel(project.ownerUserId || customer?.ownerUserId, responsibleUsers),
          quoteCount: projectQuotes.length,
          latestStatus: latestQuote?.status,
        };
      });
  }, [customers, filteredCustomers, filteredProjects, ownerScopedQuotes, responsibleUsers]);

  const ownershipSummary = useMemo(
    () =>
      buildSalesOwnershipSummary({
        customers: filteredCustomers,
        projects: filteredProjects,
        quotes: filteredQuotes.map((quote) => ({
          ownerUserId: quote.ownerUserId,
          subtotal: quoteAnalytics.get(quote.id)?.subtotal || 0,
        })),
        users: responsibleUsers,
      }),
    [filteredCustomers, filteredProjects, filteredQuotes, quoteAnalytics, responsibleUsers]
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyAxisTick = (value: number) => {
    const absoluteValue = Math.abs(value);

    if (absoluteValue >= 1000) {
      const compactValue = absoluteValue >= 10000 ? Math.round(value / 1000) : Math.round(value / 100) / 10;
      return `${new Intl.NumberFormat('fi-FI', {
        minimumFractionDigits: Number.isInteger(compactValue) ? 0 : 1,
        maximumFractionDigits: 1,
      }).format(compactValue)} k€`;
    }

    return formatCurrency(value);
  };

  const periodLabel =
    timeRange === 'custom'
      ? dateRange.from && dateRange.to
        ? `${format(dateRange.from, 'dd.MM.yyyy')} - ${format(dateRange.to, 'dd.MM.yyyy')}`
        : 'Mukautettu aikaväli'
      : timeRange === 'all'
        ? 'Kaikki'
        : timeRange === '1m'
          ? 'Viimeinen kuukausi'
          : timeRange === '3m'
            ? 'Viimeiset 3 kk'
            : timeRange === '6m'
              ? 'Viimeiset 6 kk'
              : 'Viimeinen vuosi';

  const ownerFilterLabel = ownerFilter === 'all'
    ? 'Kaikki vastuuhenkilöt'
    : getResponsibleUserLabel(ownerFilter, responsibleUsers);

  const exportScopeLabel = ownerFilter === 'all'
    ? periodLabel
    : `${periodLabel} • ${ownerFilterLabel}`;

  const exportToPDF = () => {
    if (timeRange === 'custom' && (!dateRange.from || !dateRange.to)) {
      toast.error('Valitse päivämääräväli ennen PDF-vientiä');
      return;
    }

    try {
      exportReportsToPDF({
        periodLabel: exportScopeLabel,
        generatedAt: format(new Date(), 'dd.MM.yyyy HH:mm', { locale: fi }),
        kpiData,
        statusData,
        monthlyData,
        topProducts,
        customerAnalysis,
        recentProjects,
        settings: documentSettings,
      });
      toast.success('Raportin PDF-näkymä avattu', {
        description: 'Voit tallentaa raportin PDF-muotoon selaimen tulostusikkunasta.',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'PDF-vienti epäonnistui.');
    }
  };

  const exportToExcel = () => {
    if (timeRange === 'custom' && (!dateRange.from || !dateRange.to)) {
      toast.error('Valitse päivämääräväli ennen vientiä');
      return;
    }

    const data = [
      ['Raportti', 'Laskenta Tarjouslaskenta'],
      ['Luontipäivä', format(new Date(), 'dd.MM.yyyy HH:mm', { locale: fi })],
      ['Aikaväli', periodLabel],
      ['Vastuuhenkilö', ownerFilterLabel],
      [],
      ['Avainluvut'],
      ['Projektit yhteensä', kpiData.totalProjects],
      ['Tarjoukset yhteensä', kpiData.totalQuotes],
      ['Hyväksymisaste', `${kpiData.acceptanceRate.toFixed(1)}%`],
      ['Kokonaisarvo', formatCurrency(kpiData.totalValue)],
      ['Kate', formatCurrency(kpiData.totalMargin)],
      ['Kate-%', `${kpiData.marginPercent.toFixed(1)}%`],
      [],
      ['Top tuotteet'],
      ['#', 'Koodi', 'Tuote', 'Määrä', 'Esiintymät', 'Arvo'],
      ...topProducts.map((p, i) => [i + 1, p.code, p.name, p.quantity.toFixed(2), p.count, formatCurrency(p.value)]),
    ];

    const csv = data.map(row => row.join('\t')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raportti_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    link.click();
    
    toast.success('Raportti viety onnistuneesti', {
      description: 'CSV-tiedosto ladattu',
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Raportointi</h1>
          <p className="text-muted-foreground mt-1">Liiketoiminnan analytiikka ja tilastot</p>
        </div>
        
        <div className="flex gap-3">
          {canManageUsers && responsibleUsers.length > 0 && (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Vastuuhenkilö" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kaikki vastuuhenkilöt</SelectItem>
                {responsibleUsers.map((responsibleUser) => (
                  <SelectItem key={responsibleUser.id} value={responsibleUser.id}>{responsibleUser.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(timeRange === 'custom' && 'border-primary')}>
                <CalendarBlank className="mr-2 h-4 w-4" />
                {timeRange === 'custom' && dateRange.from && dateRange.to 
                  ? `${format(dateRange.from, 'dd.MM.')} - ${format(dateRange.to, 'dd.MM.yyyy')}`
                  : 'Aikaväli'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setTimeRange('custom');
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
          <Select value={timeRange} onValueChange={(v) => {
            setTimeRange(v as TimeRange);
            if (v !== 'custom') {
              setDateRange({ from: undefined, to: undefined });
            }
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Viimeinen kuukausi</SelectItem>
              <SelectItem value="3m">Viimeiset 3 kk</SelectItem>
              <SelectItem value="6m">Viimeiset 6 kk</SelectItem>
              <SelectItem value="12m">Viimeinen vuosi</SelectItem>
              <SelectItem value="all">Kaikki</SelectItem>
              <SelectItem value="custom">Mukautettu...</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportToExcel}>
            <FileXls className="mr-2 h-4 w-4" />
            Excel
          </Button>
          
          <Button variant="outline" onClick={exportToPDF}>
            <FilePdf className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projektit</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktiiviset projektit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarjoukset</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalQuotes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Yhteensä tarjouksia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hyväksymisaste</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.acceptanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpiData.acceptedQuotes} / {kpiData.sentQuotes} lähetetyistä
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kokonaisarvo</CardTitle>
            <ChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Kate {kpiData.marginPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {canManageUsers && ownershipSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vastuuhenkilöittäin</CardTitle>
            <CardDescription>Asiakkaat, projektit ja tarjousten arvo vastuuhenkilön mukaan</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vastuuhenkilö</TableHead>
                  <TableHead className="text-right">Asiakkaat</TableHead>
                  <TableHead className="text-right">Projektit</TableHead>
                  <TableHead className="text-right">Tarjoukset</TableHead>
                  <TableHead className="text-right">Tarjousarvo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ownershipSummary.map((summary) => (
                  <TableRow key={summary.userId}>
                    <TableCell className="font-medium">{summary.displayName}</TableCell>
                    <TableCell className="text-right">{summary.customerCount}</TableCell>
                    <TableCell className="text-right">{summary.projectCount}</TableCell>
                    <TableCell className="text-right">{summary.quoteCount}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(summary.totalQuoteValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Yleiskatsaus</TabsTrigger>
          <TabsTrigger value="products">Tuotteet</TabsTrigger>
          <TabsTrigger value="customers">Asiakkaat</TabsTrigger>
          <TabsTrigger value="projects">Projektit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tarjousten jakauma</CardTitle>
                <CardDescription>Tarjousten tilat valitulla ajanjaksolla</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Ei dataa valitulla ajanjaksolla
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tilastoyhteenveto</CardTitle>
                <CardDescription>Tarjousten lukumäärät tiloittain</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">Luonnos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{kpiData.draftQuotes}</span>
                      <Badge variant="secondary">
                        {kpiData.totalQuotes > 0 ? ((kpiData.draftQuotes / kpiData.totalQuotes) * 100).toFixed(0) : 0}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-accent" />
                      <span className="text-sm">Lähetetty</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{kpiData.sentQuotes}</span>
                      <Badge variant="secondary">
                        {kpiData.totalQuotes > 0 ? ((kpiData.sentQuotes / kpiData.totalQuotes) * 100).toFixed(0) : 0}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm">Hyväksytty</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{kpiData.acceptedQuotes}</span>
                      <Badge variant="secondary">
                        {kpiData.totalQuotes > 0 ? ((kpiData.acceptedQuotes / kpiData.totalQuotes) * 100).toFixed(0) : 0}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span className="text-sm">Hylätty</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{kpiData.rejectedQuotes}</span>
                      <Badge variant="secondary">
                        {kpiData.totalQuotes > 0 ? ((kpiData.rejectedQuotes / kpiData.totalQuotes) * 100).toFixed(0) : 0}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Kuukausittainen kehitys</CardTitle>
                <CardDescription>Tarjousten arvo ja kate kuukausittain</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-2 px-3 py-1 text-xs font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.45_0.12_250)]" />
                  Arvo
                </Badge>
                <Badge variant="secondary" className="gap-2 px-3 py-1 text-xs font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.15_200)]" />
                  Kate
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.005 250)" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={formatCurrencyAxisTick} width={72} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.005 250)' }}
                    />
                    <Bar dataKey="value" name="Arvo" fill="oklch(0.45 0.12 250)" />
                    <Bar dataKey="margin" name="Kate" fill="oklch(0.65 0.15 200)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Ei dataa valitulla ajanjaksolla
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Tarjousmäärät kuukausittain</CardTitle>
                <CardDescription>Luotujen tarjousten lukumäärä</CardDescription>
              </div>
              <Badge variant="secondary" className="gap-2 self-start px-3 py-1 text-xs font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.15_200)]" />
                Tarjousten määrä
              </Badge>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.005 250)" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Tarjousten määrä']}
                      contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.005 250)' }}
                    />
                    <Line type="monotone" dataKey="quotes" name="Tarjousten määrä" stroke="oklch(0.65 0.15 200)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Ei dataa valitulla ajanjaksolla
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top 15 tuotteet</CardTitle>
              <CardDescription>Eniten myydyt tuotteet arvon mukaan</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Koodi</TableHead>
                      <TableHead>Tuote</TableHead>
                      <TableHead className="text-right">Määrä</TableHead>
                      <TableHead className="text-right">Esiintymät</TableHead>
                      <TableHead className="text-right">Arvo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{product.code}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell className="text-right font-mono">{product.quantity.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{product.count}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatCurrency(product.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Ei tuotedata saatavilla
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asiakasanalyysi</CardTitle>
              <CardDescription>Asiakkaiden projektit ja tarjousten arvot</CardDescription>
            </CardHeader>
            <CardContent>
              {customerAnalysis.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asiakas</TableHead>
                      <TableHead>Vastuuhenkilö</TableHead>
                      <TableHead className="text-right">Projektit</TableHead>
                      <TableHead className="text-right">Tarjoukset</TableHead>
                      <TableHead className="text-right">Kokonaisarvo</TableHead>
                      <TableHead className="text-right">Hyväksytty arvo</TableHead>
                      <TableHead className="text-right">Hyväksymisaste</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerAnalysis.map((customer, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.responsibleUserLabel}</TableCell>
                        <TableCell className="text-right">{customer.projectCount}</TableCell>
                        <TableCell className="text-right">{customer.quoteCount}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(customer.totalValue)}</TableCell>
                        <TableCell className="text-right font-mono font-medium text-green-600">
                          {formatCurrency(customer.acceptedValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={customer.acceptanceRate >= 50 ? "default" : "secondary"}>
                            {customer.acceptanceRate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  Ei asiakasdata saatavilla
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Viimeisimmät projektit</CardTitle>
              <CardDescription>10 uusinta projektia ja niiden tilanne</CardDescription>
            </CardHeader>
            <CardContent>
              {recentProjects.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projekti</TableHead>
                      <TableHead>Asiakas</TableHead>
                      <TableHead>Vastuuhenkilö</TableHead>
                      <TableHead>Alue</TableHead>
                      <TableHead className="text-right">Tarjouksia</TableHead>
                      <TableHead>Viimeisin tila</TableHead>
                      <TableHead>Luotu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>{project.customerName}</TableCell>
                        <TableCell>{project.responsibleUserLabel}</TableCell>
                        <TableCell>{project.region || '-'}</TableCell>
                        <TableCell className="text-right">{project.quoteCount}</TableCell>
                        <TableCell>
                          {project.latestStatus ? (
                            <Badge 
                              variant={
                                project.latestStatus === 'accepted' ? 'default' :
                                project.latestStatus === 'sent' ? 'secondary' :
                                project.latestStatus === 'rejected' ? 'destructive' :
                                'outline'
                              }
                            >
                              {project.latestStatus === 'draft' && 'Luonnos'}
                              {project.latestStatus === 'sent' && 'Lähetetty'}
                              {project.latestStatus === 'accepted' && 'Hyväksytty'}
                              {project.latestStatus === 'rejected' && 'Hylätty'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Ei tarjouksia</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(project.createdAt), 'dd.MM.yyyy', { locale: fi })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Ei projekteja
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
