import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Archive,
  Copy,
  FileXls,
  Flask,
  Lock,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  SquaresFour,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { useAuth } from '../../hooks/use-auth';
import { useCatalog } from '../../hooks/use-catalog';
import { useInstallationGroups } from '../../hooks/use-data';
import { CatalogProductView } from '../../lib/catalog';
import { formatCurrency, formatNumber } from '../../lib/calculations';
import { ReadOnlyAlert } from '../ReadOnlyAlert';

type ProductFormState = {
  id?: string;
  internalCode: string;
  name: string;
  description: string;
  brand: string;
  manufacturer: string;
  manufacturerSku: string;
  ean: string;
  unit: string;
  salesUnit: string;
  baseUnit: string;
  categoryId: string;
  subcategoryId: string;
  defaultCostPrice: string;
  defaultSalePrice: string;
  defaultMarginPercent: string;
  defaultInstallPrice: string;
  installationGroupId: string;
  active: boolean;
};

const EMPTY_FORM: ProductFormState = {
  internalCode: '',
  name: '',
  description: '',
  brand: '',
  manufacturer: '',
  manufacturerSku: '',
  ean: '',
  unit: 'kpl',
  salesUnit: 'kpl',
  baseUnit: 'kpl',
  categoryId: '',
  subcategoryId: '',
  defaultCostPrice: '',
  defaultSalePrice: '',
  defaultMarginPercent: '',
  defaultInstallPrice: '',
  installationGroupId: 'none',
  active: true,
};

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

function buildFormFromProduct(product?: CatalogProductView): ProductFormState {
  if (!product) return { ...EMPTY_FORM };
  return {
    id: product.id,
    internalCode: product.internalCode,
    name: product.name,
    description: product.description || '',
    brand: product.brand || '',
    manufacturer: product.manufacturer || '',
    manufacturerSku: product.manufacturerSku || '',
    ean: product.ean || '',
    unit: product.salesUnit || product.baseUnit || 'kpl',
    salesUnit: product.salesUnit || product.baseUnit || 'kpl',
    baseUnit: product.baseUnit || product.salesUnit || 'kpl',
    categoryId: product.categoryId || '',
    subcategoryId: product.subcategoryId || '',
    defaultCostPrice: String(product.defaultCostPrice ?? ''),
    defaultSalePrice: String(product.defaultSalePrice ?? ''),
    defaultMarginPercent: String(product.defaultMarginPercent ?? ''),
    defaultInstallPrice: String(product.defaultInstallPrice ?? ''),
    installationGroupId: product.installationGroupId || 'none',
    active: product.active,
  };
}

function parseNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function ProductsPage() {
  const { canManageSharedData } = useAuth();
  const catalog = useCatalog();
  const { groups } = useInstallationGroups();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'brand' | 'updatedAt' | 'defaultCostPrice' | 'defaultSalePrice' | 'sourceCount' | 'internalCode'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>({ ...EMPTY_FORM });
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkGroupOpen, setBulkGroupOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState('');
  const [bulkGroupId, setBulkGroupId] = useState('none');

  useEffect(() => {
    setPage(1);
  }, [activeFilter, brandFilter, categoryFilter, pageSize, search, sourceFilter, sortBy, sortDirection, subcategoryFilter]);

  const query = useMemo(
    () =>
      catalog.queryProducts({
        search,
        sourceName: sourceFilter,
        categoryId: categoryFilter,
        subcategoryId: subcategoryFilter,
        brand: brandFilter,
        active: activeFilter,
        sortBy,
        sortDirection,
        page,
        pageSize,
      }),
    [activeFilter, brandFilter, catalog, categoryFilter, page, pageSize, search, sortBy, sortDirection, sourceFilter, subcategoryFilter]
  );

  const products = query.items;
  const categories = catalog.categories.filter((category) => category.active);
  const mainCategories = categories.filter((category) => !category.parentId);
  const categoryChildren = categories.filter((category) => category.parentId === categoryFilter);
  const bulkCategoryChildren = categories.filter((category) => category.parentId === bulkCategoryId);
  const sourceOptions = Array.from(new Set(catalog.productSources.map((source) => source.sourceName))).sort((left, right) => left.localeCompare(right, 'fi'));
  const brandOptions = Array.from(new Set(catalog.products.map((product) => product.brand || product.manufacturer).filter(Boolean) as string[])).sort((left, right) =>
    left.localeCompare(right, 'fi')
  );
  const selectedCount = selectedIds.size;
  const activeCount = catalog.products.filter((product) => product.active && !product.archivedAt).length;
  const inactiveCount = catalog.products.length - activeCount;

  const openEditor = (product?: CatalogProductView) => {
    if (!canManageSharedData) {
      toast.error('Vain admin voi muokata tuoterekisteriä.');
      return;
    }
    setEditingProductId(product?.id ?? null);
    setForm(buildFormFromProduct(product));
    setEditorOpen(true);
  };

  const saveProduct = () => {
    if (!form.internalCode.trim() || !form.name.trim()) {
      toast.error('Anna sisäinen koodi ja nimi.');
      return;
    }

    const cost = parseNumber(form.defaultCostPrice) ?? 0;
    const saleInput = parseNumber(form.defaultSalePrice);
    const marginInput = parseNumber(form.defaultMarginPercent);
    const sale = saleInput ?? (marginInput !== undefined ? cost * (1 + marginInput / 100) : cost);
    const margin = marginInput ?? (sale > 0 ? ((sale - cost) / sale) * 100 : 0);

    catalog.saveCatalogProduct({
      id: form.id,
      internalCode: form.internalCode.trim(),
      name: form.name.trim(),
      normalizedName: form.name.trim(),
      description: form.description.trim(),
      brand: form.brand.trim(),
      manufacturer: form.manufacturer.trim(),
      manufacturerSku: form.manufacturerSku.trim(),
      ean: form.ean.trim(),
      unit: form.unit.trim(),
      salesUnit: form.salesUnit.trim(),
      baseUnit: form.baseUnit.trim(),
      categoryId: form.categoryId || undefined,
      subcategoryId: form.subcategoryId || undefined,
      defaultCostPrice: cost,
      defaultSalePrice: sale,
      defaultMarginPercent: margin,
      defaultInstallPrice: parseNumber(form.defaultInstallPrice) ?? 0,
      installationGroupId: form.installationGroupId === 'none' ? undefined : form.installationGroupId,
      active: form.active,
    });

    toast.success(form.id ? 'Tuote päivitetty.' : 'Tuote lisätty.');
    setEditorOpen(false);
    setEditingProductId(null);
    setForm({ ...EMPTY_FORM });
  };

  const archiveProduct = (product: CatalogProductView) => {
    if (!window.confirm(`Arkistoidaanko tuote "${product.name}"?`)) return;
    catalog.archiveCatalogProduct(product.id);
    toast.success('Tuote arkistoitu.');
  };

  const copyProduct = (product: CatalogProductView) => {
    const raw = catalog.getProductById(product.id);
    if (!raw) return;
    catalog.saveCatalogProduct({
      ...raw,
      id: undefined,
      internalCode: `${raw.internalCode}-COPY`,
      name: `${raw.name} (kopio)`,
      normalizedName: `${raw.normalizedName} copy`,
    });
    toast.success('Tuote kopioitu.');
  };

  const toggleSelection = (productId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      products.forEach((product) => next.add(product.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exportSelected = () => {
    const selected = catalog
      .queryProducts({ active: 'all', pageSize: 999999 })
      .items.filter((product) => selectedIds.has(product.id));

    if (selected.length === 0) {
      toast.error('Valitse ensin tuotteita.');
      return;
    }

    const csv = [
      ['Sisäinen koodi', 'Nimi', 'Brändi', 'Kategoria', 'Alakategoria', 'Lähteet', 'Yksikkö', 'Ostohinta', 'Myyntihinta', 'Kate %', 'Tila']
        .map(csvEscape)
        .join(';'),
      ...selected.map((product) =>
        [
          product.internalCode,
          product.name,
          product.brand || product.manufacturer || '',
          product.categoryName,
          product.subcategoryName,
          product.sourceNames.join(', '),
          product.salesUnit || product.baseUnit || 'kpl',
          formatCurrency(product.defaultCostPrice),
          formatCurrency(product.defaultSalePrice),
          formatNumber(product.defaultMarginPercent, 1),
          product.active ? 'Aktiivinen' : 'Inaktiivinen',
        ]
          .map(csvEscape)
          .join(';')
      ),
    ].join('\n');

    downloadTextFile(csv, `tuoterekisteri-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    toast.success(`Vietiin ${selected.length} tuotetta.`);
  };

  const bulkInactive = () => {
    if (selectedIds.size === 0) return;
    catalog.bulkUpdateProducts(Array.from(selectedIds), { active: false });
    toast.success(`${selectedIds.size} tuotetta merkitty inaktiiviseksi.`);
    clearSelection();
  };

  const bulkCategory = () => {
    if (selectedIds.size === 0 || !bulkCategoryId) return;
    catalog.bulkUpdateProducts(Array.from(selectedIds), {
      categoryId: bulkCategoryId,
      subcategoryId: bulkSubcategoryId || undefined,
    });
    toast.success('Kategoria päivitetty.');
    setBulkCategoryOpen(false);
    clearSelection();
  };

  const bulkGroup = () => {
    if (selectedIds.size === 0) return;
    catalog.bulkUpdateProducts(Array.from(selectedIds), {
      installationGroupId: bulkGroupId === 'none' ? undefined : bulkGroupId,
    });
    toast.success('Hintaryhmä päivitetty.');
    setBulkGroupOpen(false);
    clearSelection();
  };

  const seedDemo = () => {
    const result = catalog.seedDemoSources(1200);
    toast.success(`Demoaineisto luotu. Uusia tuotteita: ${result.createdProducts}`);
  };

  const currentGroup = groups.find((group) => group.id === form.installationGroupId);

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Tuoterekisteri</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suuri lähdepohjainen rekisteri. Haku, sivutus, massatoiminnot ja importtiketju ovat valmiina.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageSharedData && (
            <Button variant="secondary" onClick={seedDemo} className="gap-2">
              <Flask weight="bold" />
              Luo demo-lähteet
            </Button>
          )}
          <Button variant="outline" onClick={exportSelected} className="gap-2" disabled={selectedCount === 0}>
            <FileXls weight="bold" />
            Vie valitut Exceliin
          </Button>
          {canManageSharedData ? (
            <Button onClick={() => openEditor()} className="gap-2">
              <Plus weight="bold" />
              Lisää tuote
            </Button>
          ) : (
            <Button disabled className="gap-2">
              <Lock weight="bold" />
              Vain luku
            </Button>
          )}
        </div>
      </div>

      {!canManageSharedData && <ReadOnlyAlert />}

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">Tuotteita</div><div className="mt-1 text-2xl font-semibold">{catalog.products.length}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">Aktiivisia</div><div className="mt-1 text-2xl font-semibold">{activeCount}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">Inaktiivisia</div><div className="mt-1 text-2xl font-semibold">{inactiveCount}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">Lähteitä</div><div className="mt-1 text-2xl font-semibold">{sourceOptions.length}</div></Card>
      </div>

      {selectedCount > 0 && (
        <Card className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm">{selectedCount} tuotetta valittuna</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectVisible}>Valitse sivun tuotteet</Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>Tyhjennä</Button>
            <Button variant="outline" size="sm" onClick={() => setBulkCategoryOpen(true)}>Vaihda kategoria</Button>
            <Button variant="outline" size="sm" onClick={() => setBulkGroupOpen(true)}>Vaihda hintaryhmä</Button>
            <Button variant="secondary" size="sm" onClick={bulkInactive}>Merkitse inaktiiviseksi</Button>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1fr]">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hae koodilla, nimellä, brändillä tai kuvauksella..." />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger><SelectValue placeholder="Lähde" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki lähteet</SelectItem>
              {sourceOptions.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setSubcategoryFilter('all'); }}>
            <SelectTrigger><SelectValue placeholder="Pääkategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki pääkategoriat</SelectItem>
              {mainCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
            <SelectTrigger><SelectValue placeholder="Alakategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki alakategoriat</SelectItem>
              {(categoryFilter === 'all' ? categories : categoryChildren).map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as typeof activeFilter)}>
            <SelectTrigger><SelectValue placeholder="Tila" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki</SelectItem>
              <SelectItem value="active">Aktiiviset</SelectItem>
              <SelectItem value="inactive">Inaktiiviset</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_160px_180px]">
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger><SelectValue placeholder="Brändi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki brändit</SelectItem>
              {brandOptions.map((brand) => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number.parseInt(value, 10) || 25)}>
            <SelectTrigger><SelectValue placeholder="Sivukoko" /></SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((size) => <SelectItem key={size} value={String(size)}>{size} / sivu</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger><SelectValue placeholder="Lajittelu" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Päivitetty</SelectItem>
              <SelectItem value="name">Nimi</SelectItem>
              <SelectItem value="category">Kategoria</SelectItem>
              <SelectItem value="brand">Brändi</SelectItem>
              <SelectItem value="defaultCostPrice">Ostohinta</SelectItem>
              <SelectItem value="defaultSalePrice">Myyntihinta</SelectItem>
              <SelectItem value="sourceCount">Lähteet</SelectItem>
              <SelectItem value="internalCode">Sisäinen koodi</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}>
            {sortDirection === 'asc' ? <ArrowUp /> : <ArrowDown />}
            {sortDirection === 'asc' ? 'Nouseva' : 'Laskeva'}
          </Button>
          <div className="flex items-center justify-end text-sm text-muted-foreground">{query.total} tulosta</div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <button type="button" onClick={selectVisible} className="text-muted-foreground hover:text-foreground">
                    <SquaresFour className="mx-auto h-4 w-4" />
                  </button>
                </TableHead>
                <TableHead>Nimi</TableHead>
                <TableHead>Koodi</TableHead>
                <TableHead>Brändi</TableHead>
                <TableHead>Kategoria</TableHead>
                <TableHead>Lähteet</TableHead>
                <TableHead>Yksikkö</TableHead>
                <TableHead className="text-right">Hinta</TableHead>
                <TableHead>Tila</TableHead>
                <TableHead className="text-right">Päivitetty</TableHead>
                {canManageSharedData && <TableHead className="w-28" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const isSelected = selectedIds.has(product.id);
                return (
                  <TableRow key={product.id} className={isSelected ? 'bg-muted/40' : undefined}>
                    <TableCell>
                      <Switch checked={isSelected} onCheckedChange={() => toggleSelection(product.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{product.description || product.searchableText}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.internalCode}</TableCell>
                    <TableCell>{product.brand || product.manufacturer || '-'}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>{product.categoryName || '-'}</div>
                        {product.subcategoryName && <div className="text-xs text-muted-foreground">{product.subcategoryName}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.sourceNames.length > 0 ? product.sourceNames.map((source) => <Badge key={source} variant="outline" className="text-[11px]">{source}</Badge>) : <span className="text-sm text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>{product.salesUnit || product.baseUnit || 'kpl'}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">{formatCurrency(product.defaultSalePrice)}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(product.defaultCostPrice)}</div>
                    </TableCell>
                    <TableCell>{product.active ? <Badge variant="secondary">Aktiivinen</Badge> : <Badge variant="outline">Inaktiivinen</Badge>}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{new Date(product.updatedAt).toLocaleDateString('fi-FI')}</TableCell>
                    {canManageSharedData && (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(product)}><PencilSimple /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyProduct(product)}><Copy /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => archiveProduct(product)}><Archive className="text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">Sivu {query.page} / {query.totalPages}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={query.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Edellinen</Button>
            <Button variant="outline" size="sm" disabled={query.page >= query.totalPages} onClick={() => setPage((current) => Math.min(query.totalPages, current + 1))}>Seuraava</Button>
          </div>
        </div>
      </Card>

      <ResponsiveDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={editingProductId ? 'Muokkaa tuotetta' : 'Uusi tuote'}
        maxWidth="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Peruuta</Button>
            <Button onClick={saveProduct}>Tallenna</Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Sinäinen koodi *</Label><Input value={form.internalCode} onChange={(event) => setForm((current) => ({ ...current, internalCode: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Nimi *</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Brändi</Label><Input value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Valmistaja</Label><Input value={form.manufacturer} onChange={(event) => setForm((current) => ({ ...current, manufacturer: event.target.value }))} /></div>
          <div className="space-y-2"><Label>SKU</Label><Input value={form.manufacturerSku} onChange={(event) => setForm((current) => ({ ...current, manufacturerSku: event.target.value }))} /></div>
          <div className="space-y-2"><Label>EAN</Label><Input value={form.ean} onChange={(event) => setForm((current) => ({ ...current, ean: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Yksikkö</Label><Input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value, salesUnit: event.target.value, baseUnit: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Asennushinta</Label><Input type="number" step="0.01" value={form.defaultInstallPrice} onChange={(event) => setForm((current) => ({ ...current, defaultInstallPrice: event.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Kuvaus</Label><Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Pääkategoria</Label>
            <Select value={form.categoryId || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, categoryId: value === 'none' ? '' : value, subcategoryId: '' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ei kategoriaa</SelectItem>
                {mainCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Alakategoria</Label>
            <Select value={form.subcategoryId || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, subcategoryId: value === 'none' ? '' : value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ei alakategoriaa</SelectItem>
                {categories.filter((category) => !category.parentId || category.parentId === form.categoryId).map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Hintaryhmä</Label>
            <Select value={form.installationGroupId} onValueChange={(value) => setForm((current) => ({ ...current, installationGroupId: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ei hintaryhmää</SelectItem>
                {groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Ostohinta</Label><Input type="number" step="0.01" value={form.defaultCostPrice} onChange={(event) => setForm((current) => ({ ...current, defaultCostPrice: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Myyntihinta</Label><Input type="number" step="0.01" value={form.defaultSalePrice} onChange={(event) => setForm((current) => ({ ...current, defaultSalePrice: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Kate %</Label><Input type="number" step="0.1" value={form.defaultMarginPercent} onChange={(event) => setForm((current) => ({ ...current, defaultMarginPercent: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Pakkauskoko</Label><Input value={form.packageSize ?? ''} onChange={(event) => setForm((current) => ({ ...current, packageSize: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Pakkausyksikkö</Label><Input value={form.packageUnit ?? ''} onChange={(event) => setForm((current) => ({ ...current, packageUnit: event.target.value }))} /></div>
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 md:col-span-2">
            <div>
              <div className="text-sm font-medium">Aktiivinen</div>
              <div className="text-xs text-muted-foreground">Inaktiiviset tuotteet eivät oletuksena tule tarjoushaussa.</div>
            </div>
            <Switch checked={form.active} onCheckedChange={(checked) => setForm((current) => ({ ...current, active: checked }))} />
          </div>
          <div className="rounded-xl border bg-muted/20 p-4 text-sm space-y-1 md:col-span-2">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Hintaryhmä</span><span className="font-medium">{currentGroup?.name || 'Ei hintaryhmää'}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Kate</span><span className="font-medium">{form.defaultMarginPercent || '-'}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Ostohinta</span><span className="font-medium">{form.defaultCostPrice || '-'}</span></div>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={bulkCategoryOpen}
        onOpenChange={setBulkCategoryOpen}
        title="Vaihda kategoria"
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkCategoryOpen(false)}>Peruuta</Button>
            <Button onClick={bulkCategory}>Tallenna</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pääkategoria</Label>
            <Select value={bulkCategoryId || 'none'} onValueChange={(value) => setBulkCategoryId(value === 'none' ? '' : value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Valitse kategoria</SelectItem>
                {mainCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Alakategoria</Label>
            <Select value={bulkSubcategoryId || 'none'} onValueChange={(value) => setBulkSubcategoryId(value === 'none' ? '' : value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ei alakategoriaa</SelectItem>
                {bulkCategoryChildren.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={bulkGroupOpen}
        onOpenChange={setBulkGroupOpen}
        title="Vaihda hintaryhmä"
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkGroupOpen(false)}>Peruuta</Button>
            <Button onClick={bulkGroup}>Tallenna</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Hintaryhmä</Label>
            <Select value={bulkGroupId} onValueChange={setBulkGroupId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ei hintaryhmää</SelectItem>
                {groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
