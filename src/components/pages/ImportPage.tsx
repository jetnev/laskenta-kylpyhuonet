import { useMemo, useState, type ChangeEvent } from 'react';
import { CloudArrowUp, DownloadSimple, FileArrowUp, FloppyDisk, Flask, ListChecks } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useCatalog } from '../../hooks/use-catalog';
import { useAuth } from '../../hooks/use-auth';
import { ReadOnlyAlert } from '../ReadOnlyAlert';
import { CatalogImportPreviewRow, CatalogImportType } from '../../lib/catalog';

type MappingFormState = {
  sourceName: string;
  sourceCategoryPath: string;
  categoryId: string;
  subcategoryId: string;
};

const TEMPLATE_HEADERS = [
  'source_product_id',
  'name',
  'description',
  'brand',
  'category_path',
  'price',
  'sale_price',
  'install_price',
  'margin_percent',
  'unit',
  'package_size',
  'ean',
  'manufacturer_sku',
];

function csvEscape(value: unknown) {
  return `"${`${value ?? ''}`.replace(/"/g, '""')}"`;
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

function previewToCsv(previewRows: CatalogImportPreviewRow[]) {
  return [
    ['Tila', 'Lähde-ID', 'Nimi', 'Brändi', 'Kategoria', 'Toiminto', 'Huomio']
      .map(csvEscape)
      .join(';'),
    ...previewRows.map((row) =>
      [
        row.action,
        row.sourceRecord.sourceProductId,
        row.sourceRecord.sourceNameRaw,
        row.sourceRecord.sourceBrand || '',
        row.normalized?.normalizedCategoryPath || row.sourceRecord.sourceCategoryPath || '',
        row.match ? row.match.matchType : 'create',
        row.reason,
      ]
        .map(csvEscape)
        .join(';')
    ),
  ].join('\n');
}

export default function ImportPage() {
  const { canManageSharedData } = useAuth();
  const catalog = useCatalog();
  const [sourceName, setSourceName] = useState('generic');
  const [previewRows, setPreviewRows] = useState<CatalogImportPreviewRow[]>([]);
  const [importType, setImportType] = useState<CatalogImportType>('csv');
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [demoCount, setDemoCount] = useState('600');
  const [mapping, setMapping] = useState<MappingFormState>({
    sourceName: 'generic',
    sourceCategoryPath: '',
    categoryId: '',
    subcategoryId: '',
  });

  const categories = catalog.categories.filter((category) => category.active);
  const mainCategories = categories.filter((category) => !category.parentId);
  const subcategories = categories.filter((category) => category.parentId === mapping.categoryId);
  const adapters = useMemo(
    () => ['generic', 'k_rauta', 'stark', 'k_rauta_demo', 'stark_demo'],
    []
  );
  const selectedRun = catalog.importRuns.find((run) => run.id === selectedRunId);
  const selectedRunErrors = selectedRun
    ? catalog.rawImportRecords.filter((record) => record.importRunId === selectedRun.id && !record.parsedOk)
    : [];

  const handleDownloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS, ['K-001', 'Tuote', 'Kuvaus', 'Brändi', 'Laatat > Seinälaatat', '25.50', '32.00', '0', '28', 'kpl', '1', '6400000000000', 'ABC-001']]
      .map((row) => row.map(csvEscape).join(';'))
      .join('\n');
    downloadTextFile(csv, 'tuontipohja.csv', 'text/csv;charset=utf-8;');
    toast.success('Tuontipohja ladattu.');
  };

  const handleFilePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    try {
      const rows = await catalog.previewImportFile(file, sourceName);
      setPreviewRows(rows);
      setImportType(file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') ? 'xlsx' : file.name.toLowerCase().endsWith('.json') ? 'json' : file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm') ? 'html' : 'csv');
      toast.success(`Esikatselu valmis: ${rows.length} riviä.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tiedoston esikatselu epäonnistui.');
    }
    event.target.value = '';
  };

  const handleImport = () => {
    if (previewRows.length === 0) {
      toast.error('Esikatsele tiedosto ensin.');
      return;
    }
    const result = catalog.commitImportPreview(previewRows, sourceName, importType);
    setPreviewRows([]);
    setSelectedFileName('');
    toast.success(
      `Tuonti valmis: ${result.createdProducts} uutta, ${result.updatedProducts} päivitettyä, ${result.skippedProducts} ohitettua.`
    );
  };

  const handleDemoImport = (demoSource: 'k_rauta_demo' | 'stark_demo') => {
    const count = Number.parseInt(demoCount, 10) || 600;
    const rows = catalog.previewDemoImport(demoSource, count);
    setSourceName(demoSource);
    setImportType('demo');
    setPreviewRows(rows);
    setSelectedFileName(`${demoSource}-${count}.demo`);
    toast.success(`Demoesikatselu valmis (${rows.length} riviä).`);
  };

  const handlePreviewExport = () => {
    if (previewRows.length === 0) {
      toast.error('Ei esikatseltavaa.');
      return;
    }
    downloadTextFile(previewToCsv(previewRows), `import-preview-${sourceName}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleSaveMapping = () => {
    if (!mapping.sourceName.trim() || !mapping.sourceCategoryPath.trim()) {
      toast.error('Syötä lähde ja lähdekategorian polku.');
      return;
    }
    catalog.upsertSourceCategoryMapping({
      sourceName: mapping.sourceName.trim(),
      sourceCategoryPath: mapping.sourceCategoryPath.trim(),
      categoryId: mapping.categoryId || undefined,
      subcategoryId: mapping.subcategoryId || undefined,
    });
    toast.success('Lähdekategoriamappaus tallennettu.');
    setMapping({ sourceName: mapping.sourceName, sourceCategoryPath: '', categoryId: '', subcategoryId: '' });
  };

  const importStats = previewRows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.action === 'create') acc.create += 1;
      else if (row.action === 'update') acc.update += 1;
      else if (row.action === 'skip') acc.skip += 1;
      else acc.error += 1;
      return acc;
    },
    { total: 0, create: 0, update: 0, skip: 0, error: 0 }
  );

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Tuonti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tuo tuotteita CSV-, XLSX-, JSON- tai HTML-lähteistä. Sama putki tukee K-Rautaa, STARKia ja muita lähteitä.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
            <DownloadSimple />
            Lataa pohja
          </Button>
          <Button variant="secondary" onClick={() => handleDemoImport('k_rauta_demo')} className="gap-2">
            <Flask />
            K-Rauta demo
          </Button>
          <Button variant="secondary" onClick={() => handleDemoImport('stark_demo')} className="gap-2">
            <Flask />
            STARK demo
          </Button>
          <Button onClick={handleImport} disabled={previewRows.length === 0} className="gap-2">
            <FileArrowUp />
            Tuo esikatselu
          </Button>
        </div>
      </div>

      {!canManageSharedData && <ReadOnlyAlert />}

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tuotteita</div>
          <div className="mt-1 text-2xl font-semibold">{catalog.products.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tuontiajoja</div>
          <div className="mt-1 text-2xl font-semibold">{catalog.importRuns.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Esikatselussa</div>
          <div className="mt-1 text-2xl font-semibold">{previewRows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Lähteitä</div>
          <div className="mt-1 text-2xl font-semibold">{adapters.length}</div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Tiedostotuonti</h2>
              <p className="text-sm text-muted-foreground">Valitse lähde, esikatsele tiedosto ja vahvista tallennus.</p>
            </div>
            <Badge variant="outline">{sourceName}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Lähde</Label>
              <Select value={sourceName} onValueChange={setSourceName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {adapters.map((adapter) => (
                    <SelectItem key={adapter} value={adapter}>{adapter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Demo-rivejä</Label>
              <Input value={demoCount} onChange={(event) => setDemoCount(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => document.getElementById('catalog-import-file')?.click()}>
              <CloudArrowUp />
              Valitse tiedosto
            </Button>
            <Button variant="outline" className="gap-2" onClick={handlePreviewExport} disabled={previewRows.length === 0}>
              <DownloadSimple />
              Vie esikatselu
            </Button>
            <input
              id="catalog-import-file"
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls,.json,.html,.htm"
              onChange={handleFilePick}
              className="hidden"
            />
          </div>

          <div className="rounded-xl border bg-muted/20 p-4 text-sm">
            <div className="font-medium">Valittu tiedosto</div>
            <div className="mt-1 text-muted-foreground">{selectedFileName || 'Ei tiedostoa valittuna'}</div>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Lähdekategoriamappaus</h2>
              <p className="text-sm text-muted-foreground">Tee lähdekategorioista sisäisiä kategorioita.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveMapping} className="gap-2">
              <FloppyDisk />
              Tallenna
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Lähde</Label>
              <Select value={mapping.sourceName} onValueChange={(value) => setMapping((current) => ({ ...current, sourceName: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {adapters.map((adapter) => (
                    <SelectItem key={adapter} value={adapter}>{adapter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lähdekategorian polku</Label>
              <Input value={mapping.sourceCategoryPath} onChange={(event) => setMapping((current) => ({ ...current, sourceCategoryPath: event.target.value }))} placeholder="Esim. Laatat > Seinälaatat" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Pääkategoria</Label>
                <Select value={mapping.categoryId || 'none'} onValueChange={(value) => setMapping((current) => ({ ...current, categoryId: value === 'none' ? '' : value, subcategoryId: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ei kategoriaa</SelectItem>
                    {mainCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alakategoria</Label>
                <Select value={mapping.subcategoryId || 'none'} onValueChange={(value) => setMapping((current) => ({ ...current, subcategoryId: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ei alakategoriaa</SelectItem>
                    {subcategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Tuonnin esikatselu</h2>
              <p className="text-sm text-muted-foreground">Vasta vahvistuksen jälkeen tiedot tallennetaan lopullisesti.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Yhteensä {importStats.total}</Badge>
              <Badge variant="secondary">Uusia {importStats.create}</Badge>
              <Badge variant="secondary">Päivityksiä {importStats.update}</Badge>
              <Badge variant="outline">Ohitettu {importStats.skip}</Badge>
              <Badge variant="destructive">Virheitä {importStats.error}</Badge>
            </div>
          </div>

          {previewRows.length === 0 ? (
            <Card className="border-dashed p-10 text-center text-muted-foreground">
              Valitse tiedosto tai avaa demo-lähde.
            </Card>
          ) : (
            <ScrollArea className="h-[540px] rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tila</TableHead>
                    <TableHead>Nimi</TableHead>
                    <TableHead>Brändi</TableHead>
                    <TableHead>Kategoria</TableHead>
                    <TableHead>Toiminto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, index) => (
                    <TableRow key={`${row.rawHash}-${index}`}>
                      <TableCell>
                        {row.action === 'error' ? <Badge variant="destructive">Virhe</Badge> : row.action === 'skip' ? <Badge variant="outline">Ohitettu</Badge> : row.action === 'update' ? <Badge variant="secondary">Päivitetään</Badge> : <Badge variant="secondary">Uusi</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.sourceRecord.sourceNameRaw}</div>
                        <div className="text-xs text-muted-foreground">{row.sourceRecord.sourceProductId}</div>
                      </TableCell>
                      <TableCell>{row.sourceRecord.sourceBrand || '-'}</TableCell>
                      <TableCell>{row.normalized?.normalizedCategoryPath || row.sourceRecord.sourceCategoryPath || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div>{row.reason}</div>
                          {row.warnings.length > 0 && <div className="text-xs text-muted-foreground">{row.warnings.join(' • ')}</div>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleImport} disabled={previewRows.length === 0} className="gap-2">
              <FileArrowUp />
              Tuo esikatselu
            </Button>
            <Button variant="secondary" onClick={() => handleDemoImport('k_rauta_demo')} className="gap-2">
              <ListChecks />
              Esikatsele K-Rauta demo
            </Button>
            <Button variant="secondary" onClick={() => handleDemoImport('stark_demo')} className="gap-2">
              <ListChecks />
              Esikatsele STARK demo
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Tuontihistoria</h2>
            <p className="text-sm text-muted-foreground">Viimeisimmät ajot, virheet ja yhteenveto.</p>
          </div>
          <ScrollArea className="h-[540px] rounded-xl border">
            <div className="divide-y">
              {catalog.importRuns.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Ei vielä tuontiajoja.</div>
              ) : (
                catalog.importRuns
                  .slice()
                  .reverse()
                  .map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => setSelectedRunId(run.id)}
                      className={`block w-full text-left p-4 hover:bg-muted/40 transition-colors ${selectedRunId === run.id ? 'bg-muted/30' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{run.sourceName}</div>
                          <div className="text-xs text-muted-foreground">{new Date(run.startedAt).toLocaleString('fi-FI')}</div>
                        </div>
                        <Badge variant={run.status === 'failed' ? 'destructive' : run.status === 'completed_with_errors' ? 'outline' : 'secondary'}>
                          {run.status}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Uusia {run.createdProducts} · Päivityksiä {run.updatedProducts} · Ohitettu {run.skippedProducts} · Virheitä {run.failedProducts}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </ScrollArea>

          {selectedRun && (
            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Ajon virheet</div>
                  <div className="text-xs text-muted-foreground">{selectedRun.logSummary}</div>
                </div>
                <Badge variant="outline">{selectedRunErrors.length}</Badge>
              </div>
              {selectedRunErrors.length === 0 ? (
                <div className="text-sm text-muted-foreground">Ei virherivejä.</div>
              ) : (
                <div className="space-y-2">
                  {selectedRunErrors.slice(0, 10).map((record) => (
                    <div key={record.id} className="rounded-lg border bg-background p-3 text-sm">
                      <div className="font-medium">{record.sourceProductId}</div>
                      <div className="text-muted-foreground">{record.parseError || 'Parse error'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
