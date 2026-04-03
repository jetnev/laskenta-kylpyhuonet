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
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import { fi } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { calculateQuote, calculateQuoteRow } from '../../lib/calculations';
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
  const { projects } = useProjects();
  const { quotes } = useQuotes();
  const { rows } = useQuoteRows();
  const { customers } = useCustomers();
  const { documentSettings } = useDocumentSettings();

  const filteredQuotes = useMemo(() => {
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

  const kpiData = useMemo(() => {
    const totalProjects = projects.length;
    const totalQuotes = filteredQuotes.length;
    const sentQuotes = filteredQuotes.filter(q => q.status === 'sent').length;
    const acceptedQuotes = filteredQuotes.filter(q => q.status === 'accepted').length;
    const rejectedQuotes = filteredQuotes.filter(q => q.status === 'rejected').length;
    const draftQuotes = filteredQuotes.filter(q => q.status === 'draft').length;
    
    const acceptanceRate = sentQuotes > 0 ? (acceptedQuotes / sentQuotes) * 100 : 0;
    
    let totalValue = 0;
    let totalMargin = 0;

    filteredQuotes.forEach(quote => {
      const quoteRows = rows.filter(r => r.quoteId === quote.id);
      const calculation = calculateQuote(quote, quoteRows);
      totalValue += calculation.subtotal;
      totalMargin += calculation.totalMargin;
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
  }, [projects, filteredQuotes, rows]);

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
      
      const quoteRows = rows.filter(r => r.quoteId === quote.id);
      const calculation = calculateQuote(quote, quoteRows);
      months[monthKey].value += calculation.subtotal;
      months[monthKey].margin += calculation.totalMargin;
    });

    return Object.keys(months)
      .sort()
      .map(key => ({
        month: format(new Date(key + '-01'), 'MMM yyyy', { locale: fi }),
        quotes: months[key].quotes,
        value: Math.round(months[key].value),
        margin: Math.round(months[key].margin),
      }));
  }, [filteredQuotes, rows]);

  const topProducts = useMemo(() => {
    const productStats: { [key: string]: { name: string; code: string; quantity: number; value: number; count: number } } = {};
    
    filteredQuotes.forEach(quote => {
      const quoteRows = rows.filter(r => r.quoteId === quote.id);
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
  }, [filteredQuotes, rows]);

  const customerAnalysis = useMemo(() => {
    const customerStats: { 
      [key: string]: { 
        name: string; 
        projectCount: number; 
        quoteCount: number; 
        totalValue: number; 
        acceptedValue: number; 
        acceptedCount: number;
        sentCount: number;
      } 
    } = {};
    
    projects.forEach(project => {
      if (!project.customerId) return;
      
      const customer = customers.find(c => c.id === project.customerId);
      if (!customer) return;
      
      if (!customerStats[project.customerId]) {
        customerStats[project.customerId] = {
          name: customer.name,
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
        const quoteRows = rows.filter(r => r.quoteId === quote.id);
        const quoteValue = calculateQuote(quote, quoteRows).subtotal;
        
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
        acceptanceRate: stat.sentCount > 0 ? (stat.acceptedCount / stat.sentCount) * 100 : 0,
      }));
  }, [projects, customers, filteredQuotes, rows]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(project => {
        const customer = customers.find(c => c.id === project.customerId);
        const projectQuotes = quotes.filter(q => q.projectId === project.id);
        const latestQuote = projectQuotes.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        return {
          ...project,
          customerName: customer?.name || 'Ei asiakasta',
          quoteCount: projectQuotes.length,
          latestStatus: latestQuote?.status,
        };
      });
  }, [projects, customers, quotes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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

  const exportToPDF = () => {
    if (timeRange === 'custom' && (!dateRange.from || !dateRange.to)) {
      toast.error('Valitse päivämääräväli ennen PDF-vientiä');
      return;
    }

    try {
      exportReportsToPDF({
        periodLabel,
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
            <CardHeader>
              <CardTitle>Kuukausittainen kehitys</CardTitle>
              <CardDescription>Tarjousten arvo ja kate kuukausittain</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.005 250)" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k €`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.005 250)' }}
                    />
                    <Legend />
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
            <CardHeader>
              <CardTitle>Tarjousmäärät kuukausittain</CardTitle>
              <CardDescription>Luotujen tarjousten lukumäärä</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.005 250)" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.005 250)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="quotes" name="Tarjoukset" stroke="oklch(0.65 0.15 200)" strokeWidth={2} />
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
