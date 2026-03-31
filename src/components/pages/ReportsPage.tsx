import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { TrendUp, TrendDown, FileText, Folder, CheckCircle, XCircle, Clock, Package, ChartBar, CalendarBlank } from '@phosphor-icons/react';
import { useProjects } from '../../hooks/use-data';
import { useQuotes } from '../../hooks/use-data';
import { useQuoteRows } from '../../hooks/use-data';
import { useProducts } from '../../hooks/use-data';
import { useCustomers } from '../../hooks/use-data';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { fi } from 'date-fns/locale';

type TimeRange = '1m' | '3m' | '6m' | '12m' | 'all';

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const { projects } = useProjects();
  const { quotes } = useQuotes();
  const { rows } = useQuoteRows();
  const { products } = useProducts();
  const { customers } = useCustomers();

  const filteredQuotes = useMemo(() => {
    if (timeRange === 'all') return quotes;
    
    const now = new Date();
    const monthsAgo = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '12m': 12,
    }[timeRange] || 3;
    
    const startDate = subMonths(now, monthsAgo);
    
    return quotes.filter(q => new Date(q.createdAt) >= startDate);
  }, [quotes, timeRange]);

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
    let totalCost = 0;

    filteredQuotes.forEach(quote => {
      const quoteRows = rows.filter(r => r.quoteId === quote.id);
      quoteRows.forEach(row => {
        const salesPrice = row.overridePrice !== undefined ? row.overridePrice : row.salesPrice;
        const installPrice = row.mode === 'installation' || row.mode === 'product_installation' ? row.installationPrice : 0;
        const rowTotal = (salesPrice + installPrice) * row.quantity * row.regionMultiplier;
        const rowCost = row.purchasePrice * row.quantity;
        
        totalValue += rowTotal;
        totalCost += rowCost;
      });
    });
    
    totalMargin = totalValue - totalCost;
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
      quoteRows.forEach(row => {
        const salesPrice = row.overridePrice !== undefined ? row.overridePrice : row.salesPrice;
        const installPrice = row.mode === 'installation' || row.mode === 'product_installation' ? row.installationPrice : 0;
        const rowTotal = (salesPrice + installPrice) * row.quantity * row.regionMultiplier;
        const rowCost = row.purchasePrice * row.quantity;
        
        months[monthKey].value += rowTotal;
        months[monthKey].margin += (rowTotal - rowCost);
      });
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
        
        const salesPrice = row.overridePrice !== undefined ? row.overridePrice : row.salesPrice;
        const installPrice = row.mode === 'installation' || row.mode === 'product_installation' ? row.installationPrice : 0;
        const rowTotal = (salesPrice + installPrice) * row.quantity * row.regionMultiplier;
        
        productStats[row.productId].quantity += row.quantity;
        productStats[row.productId].value += rowTotal;
        productStats[row.productId].count += 1;
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [filteredQuotes, rows]);

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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Raportointi</h1>
          <p className="text-muted-foreground mt-1">Liiketoiminnan analytiikka ja tilastot</p>
        </div>
        
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">Viimeinen kuukausi</SelectItem>
            <SelectItem value="3m">Viimeiset 3 kk</SelectItem>
            <SelectItem value="6m">Viimeiset 6 kk</SelectItem>
            <SelectItem value="12m">Viimeinen vuosi</SelectItem>
            <SelectItem value="all">Kaikki</SelectItem>
          </SelectContent>
        </Select>
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
