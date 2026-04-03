import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  DownloadSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { useAuth } from '../../hooks/use-auth';
import { useInstallationGroups, useProducts } from '../../hooks/use-data';
import { Product } from '../../lib/types';
import { formatCurrency } from '../../lib/calculations';
import { ReadOnlyAlert } from '../ReadOnlyAlert';

type ProductFormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  manufacturer: string;
  manufacturerSku: string;
  ean: string;
  unit: string;
  purchasePrice: string;
  defaultSalePrice: string;
  defaultMarginPercent: string;
  defaultInstallPrice: string;
  installationGroupId: string;
  active: boolean;
};

const EMPTY_FORM: ProductFormState = {
  code: '',
  name: '',
  description: '',
  category: '',
  brand: '',
  manufacturer: '',
  manufacturerSku: '',
  ean: '',
  unit: 'kpl',
  purchasePrice: '',
  defaultSalePrice: '',
  defaultMarginPercent: '',
  defaultInstallPrice: '',
  installationGroupId: 'none',
  active: true,
};

function parseNumber(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

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

function buildForm(product?: Product): ProductFormState {
  if (!product) {
    return { ...EMPTY_FORM };
  }

  return {
    id: product.id,
    code: product.internalCode || product.code,
    name: product.name,
    description: product.description || '',
    category: product.category || '',
    brand: product.brand || '',
    manufacturer: product.manufacturer || '',
    manufacturerSku: product.manufacturerSku || '',
    ean: product.ean || '',
    unit: product.unit || 'kpl',
    purchasePrice: String(product.defaultCostPrice ?? product.purchasePrice ?? 0),
    defaultSalePrice: String(product.defaultSalePrice ?? 0),
    defaultMarginPercent: String(
      product.defaultMarginPercent ?? product.defaultSalesMarginPercent ?? 0
    ),
    defaultInstallPrice: String(
      product.defaultInstallPrice ?? product.defaultInstallationPrice ?? 0
    ),
    installationGroupId: product.installationGroupId || 'none',
    active: product.active ?? product.isActive ?? true,
  };
}

function calculateSalePrice(purchasePrice: number, marginPercent: number, explicitSalePrice: number) {
  if (explicitSalePrice > 0) {
    return explicitSalePrice;
  }
  return Math.round((purchasePrice * (1 + marginPercent / 100) + Number.EPSILON) * 100) / 100;
}

export default function ProductsPage() {
  const { canDelete, canEdit } = useAuth();
  const { groups } = useInstallationGroups();
  const { addProduct, deleteProduct, products, updateProduct } = useProducts();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'name' | 'category' | 'brand' | 'defaultSalePrice'>(
    'updatedAt'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>({ ...EMPTY_FORM });

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category).filter(Boolean) as string[])).sort(
        (left, right) => left.localeCompare(right, 'fi')
      ),
    [products]
  );
  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.brand || product.manufacturer)
            .filter(Boolean) as string[]
        )
      ).sort((left, right) => left.localeCompare(right, 'fi')),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => {
        const active = product.active ?? product.isActive ?? true;
        if (activeFilter === 'active' && !active) return false;
        if (activeFilter === 'inactive' && active) return false;
        if (categoryFilter !== 'all' && (product.category || '') !== categoryFilter) return false;
        if (brandFilter !== 'all' && (product.brand || product.manufacturer || '') !== brandFilter) return false;
        if (!query) return true;
        return [
          product.code,
          product.internalCode,
          product.name,
          product.description,
          product.category,
          product.brand,
          product.manufacturer,
          product.ean,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query));
      })
      .sort((left, right) => {
        const direction = sortDirection === 'asc' ? 1 : -1;
        if (sortBy === 'updatedAt') {
          return (
            (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * direction
          );
        }
        if (sortBy === 'defaultSalePrice') {
          return ((left.defaultSalePrice || 0) - (right.defaultSalePrice || 0)) * direction;
        }
        const leftValue =
          sortBy === 'name'
            ? left.name
            : sortBy === 'category'
              ? left.category || ''
              : left.brand || left.manufacturer || '';
        const rightValue =
          sortBy === 'name'
            ? right.name
            : sortBy === 'category'
              ? right.category || ''
              : right.brand || right.manufacturer || '';
        return leftValue.localeCompare(rightValue, 'fi') * direction;
      });
  }, [activeFilter, brandFilter, categoryFilter, products, search, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pagedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const activeCount = products.filter((product) => product.active ?? product.isActive ?? true).length;
  const inactiveCount = products.length - activeCount;

  useEffect(() => {
    setPage(1);
  }, [activeFilter, brandFilter, categoryFilter, pageSize, search, sortBy, sortDirection]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const visibleIds = new Set(products.map((product) => product.id));
    setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [products]);

  const openEditor = (product?: Product) => {
    if (!canEdit) {
      toast.error('Sinulla ei ole oikeuksia lisätä tai muokata tuotteita.');
      return;
    }
    setForm(buildForm(product));
    setEditorOpen(true);
  };

  const saveProduct = () => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name) {
      toast.error('Anna tuotteelle vähintään tuotekoodi ja nimi.');
      return;
    }

    const purchasePrice = parseNumber(form.purchasePrice);
    const marginPercent = parseNumber(form.defaultMarginPercent);
    const salePrice = calculateSalePrice(
      purchasePrice,
      marginPercent,
      parseNumber(form.defaultSalePrice)
    );
    const payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'createdByUserId' | 'updatedByUserId'> = {
      code,
      internalCode: code,
      name,
      description: form.description.trim(),
      category: form.category.trim(),
      brand: form.brand.trim(),
      manufacturer: form.manufacturer.trim(),
      manufacturerSku: form.manufacturerSku.trim(),
      ean: form.ean.trim(),
      normalizedName: name,
      unit: form.unit.trim() || 'kpl',
      salesUnit: form.unit.trim() || 'kpl',
      baseUnit: form.unit.trim() || 'kpl',
      purchasePrice,
      defaultCostPrice: purchasePrice,
      defaultSalePrice: salePrice,
      defaultSalesMarginPercent: marginPercent,
      defaultInstallationPrice: parseNumber(form.defaultInstallPrice),
      defaultMarginPercent: marginPercent,
      defaultInstallPrice: parseNumber(form.defaultInstallPrice),
      installationGroupId: form.installationGroupId === 'none' ? undefined : form.installationGroupId,
      isActive: form.active,
      active: form.active,
      searchableText: [
        code,
        name,
        form.description,
        form.category,
        form.brand,
        form.manufacturer,
        form.ean,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };

    try {
      if (form.id) {
        updateProduct(form.id, payload);
        toast.success('Tuote päivitetty.');
      } else {
        addProduct(payload);
        toast.success('Tuote lisätty.');
      }
      setEditorOpen(false);
      setForm({ ...EMPTY_FORM });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tuotteen tallennus epäonnistui.');
    }
  };

  const toggleSelection = (productId: string) => {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  };

  const selectVisible = () => {
    setSelectedIds((current) => Array.from(new Set([...current, ...pagedProducts.map((item) => item.id)])));
  };

  const clearSelection = () => setSelectedIds([]);

  const removeProduct = (product: Product) => {
    if (!canDelete) {
      toast.error('Sinulla ei ole oikeuksia poistaa tuotteita.');
      return;
    }
    if (!window.confirm(`Poistetaanko tuote "${product.name}"?`)) {
      return;
    }
    deleteProduct(product.id);
    toast.success('Tuote poistettu.');
  };

  const updateSelectedProducts = (updates: Partial<Product>, successMessage: string) => {
    if (!canEdit || selectedIds.length === 0) return;
    selectedIds.forEach((id) => updateProduct(id, updates));
    toast.success(successMessage);
    clearSelection();
  };

  const deleteSelectedProducts = () => {
    if (!canDelete || selectedIds.length === 0) return;
    if (!window.confirm(`Poistetaanko ${selectedIds.length} valittua tuotetta?`)) {
      return;
    }
    selectedIds.forEach((id) => deleteProduct(id));
    toast.success(
      selectedIds.length === 1
        ? '1 tuote poistettu.'
        : `${selectedIds.length} tuotetta poistettu.`
    );
    clearSelection();
  };

  const exportSelected = () => {
    const selectedProducts = products.filter((product) => selectedIdSet.has(product.id));
    if (selectedProducts.length === 0) {
      toast.error('Valitse ensin tuotteita.');
      return;
    }

    const rows = [
      ['Tuotekoodi', 'Nimi', 'Kategoria', 'Brändi', 'Yksikkö', 'Ostohinta', 'Myyntihinta', 'Asennushinta', 'Hintaryhmä', 'Tila']
        .map(csvEscape)
        .join(';'),
      ...selectedProducts.map((product) =>
        [
          product.code,
          product.name,
          product.category || '',
          product.brand || product.manufacturer || '',
          product.unit,
          product.defaultCostPrice ?? product.purchasePrice,
          product.defaultSalePrice ?? 0,
          product.defaultInstallPrice ?? product.defaultInstallationPrice ?? 0,
          groups.find((group) => group.id === product.installationGroupId)?.name || '',
          product.active ?? product.isActive ? 'Aktiivinen' : 'Inaktiivinen',
        ]
          .map(csvEscape)
          .join(';')
      ),
    ].join('\n');

    downloadTextFile(
      rows,
      `omat-tuotteet-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
    toast.success(`Vietiin ${selectedProducts.length} tuotetta.`);
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Tuoterekisteri</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jokainen käyttäjä hallitsee omaa tuoterekisteriään. Tänne lisätyt tuotteet näkyvät
            vain omassa tarjouslaskennassasi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportSelected} disabled={selectedIds.length === 0} className="gap-2">
            <DownloadSimple />
            Vie valitut CSV
          </Button>
          <Button onClick={() => openEditor()} className="gap-2" disabled={!canEdit}>
            <Plus />
            Lisää tuote
          </Button>
        </div>
      </div>

      {!canEdit && <ReadOnlyAlert />}

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Omat tuotteet</div>
          <div className="mt-1 text-2xl font-semibold">{products.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Aktiivisia</div>
          <div className="mt-1 text-2xl font-semibold">{activeCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Inaktiivisia</div>
          <div className="mt-1 text-2xl font-semibold">{inactiveCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Kategorioita</div>
          <div className="mt-1 text-2xl font-semibold">{categories.length}</div>
        </Card>
      </div>

      {selectedIds.length > 0 && (
        <Card className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm">{selectedIds.length} tuotetta valittuna</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectVisible}>Valitse sivun tuotteet</Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>Tyhjennä</Button>
            <Button variant="outline" size="sm" onClick={() => updateSelectedProducts({ active: true, isActive: true }, 'Valitut tuotteet aktivoitu.')}>
              <Check className="h-4 w-4" />
              Merkitse aktiiviseksi
            </Button>
            <Button variant="outline" size="sm" onClick={() => updateSelectedProducts({ active: false, isActive: false }, 'Valitut tuotteet merkitty inaktiivisiksi.')}>
              Inaktivoi
            </Button>
            <Button variant="secondary" size="sm" onClick={deleteSelectedProducts}>
              <Trash className="h-4 w-4" />
              Poista valitut
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr_1fr_1fr]">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hae koodilla, nimellä, kategorialla tai brändillä..."
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue placeholder="Kategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki kategoriat</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger><SelectValue placeholder="Brändi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki brändit</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
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

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_160px]">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger><SelectValue placeholder="Lajittelu" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Päivitetty</SelectItem>
              <SelectItem value="name">Nimi</SelectItem>
              <SelectItem value="category">Kategoria</SelectItem>
              <SelectItem value="brand">Brändi</SelectItem>
              <SelectItem value="defaultSalePrice">Myyntihinta</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number.parseInt(value, 10) || 25)}>
            <SelectTrigger><SelectValue placeholder="Sivukoko" /></SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>{size} / sivu</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}>
            {sortDirection === 'asc' ? 'Nouseva' : 'Laskeva'}
          </Button>
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            {filteredProducts.length} tulosta
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={pagedProducts.length > 0 && pagedProducts.every((product) => selectedIdSet.has(product.id))}
                    onCheckedChange={() => {
                      const allVisibleSelected = pagedProducts.every((product) => selectedIdSet.has(product.id));
                      if (allVisibleSelected) {
                        setSelectedIds((current) => current.filter((id) => !pagedProducts.some((product) => product.id === id)));
                      } else {
                        selectVisible();
                      }
                    }}
                    aria-label="Valitse kaikki näkyvät tuotteet"
                  />
                </TableHead>
                <TableHead>Nimi</TableHead>
                <TableHead>Koodi</TableHead>
                <TableHead>Brändi</TableHead>
                <TableHead>Kategoria</TableHead>
                <TableHead>Yksikkö</TableHead>
                <TableHead className="text-right">Myyntihinta</TableHead>
                <TableHead>Hintaryhmä</TableHead>
                <TableHead>Tila</TableHead>
                <TableHead className="text-right">Päivitetty</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                    Tuoterekisterisi on tyhjä. Lisää ensimmäinen tuote, niin voit käyttää sitä tarjouksilla.
                  </TableCell>
                </TableRow>
              ) : (
                pagedProducts.map((product) => {
                  const isSelected = selectedIdSet.has(product.id);
                  const isActive = product.active ?? product.isActive ?? true;
                  const groupName =
                    groups.find((group) => group.id === product.installationGroupId)?.name || '-';

                  return (
                    <TableRow key={product.id} className={isSelected ? 'bg-muted/40' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(product.id)}
                          aria-label={`Valitse tuote ${product.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {product.description || 'Ei kuvausta'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.code}</TableCell>
                      <TableCell>{product.brand || product.manufacturer || '-'}</TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatCurrency(product.defaultSalePrice || 0)}</div>
                        <div className="text-xs text-muted-foreground">
                          Osto {formatCurrency(product.defaultCostPrice ?? product.purchasePrice ?? 0)}
                        </div>
                      </TableCell>
                      <TableCell>{groupName}</TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge variant="secondary">Aktiivinen</Badge>
                        ) : (
                          <Badge variant="outline">Inaktiivinen</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(product.updatedAt).toLocaleDateString('fi-FI')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(product)} disabled={!canEdit}>
                            <PencilSimple />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeProduct(product)} disabled={!canDelete}>
                            <Trash className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Sivu {page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Edellinen
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Seuraava
            </Button>
          </div>
        </div>
      </Card>

      <ResponsiveDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={form.id ? 'Muokkaa tuotetta' : 'Uusi tuote'}
        maxWidth="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Peruuta</Button>
            <Button onClick={saveProduct}>Tallenna</Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tuotekoodi *</Label>
            <Input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Nimi *</Label>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Kuvaus</Label>
            <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Kategoria</Label>
            <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Esim. Hanat, Laatat, Kalusteet" />
          </div>
          <div className="space-y-2">
            <Label>Brändi</Label>
            <Input value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Valmistaja</Label>
            <Input value={form.manufacturer} onChange={(event) => setForm((current) => ({ ...current, manufacturer: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Valmistajan koodi</Label>
            <Input value={form.manufacturerSku} onChange={(event) => setForm((current) => ({ ...current, manufacturerSku: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>EAN</Label>
            <Input value={form.ean} onChange={(event) => setForm((current) => ({ ...current, ean: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Yksikkö</Label>
            <Input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Hintaryhmä</Label>
            <Select value={form.installationGroupId} onValueChange={(value) => setForm((current) => ({ ...current, installationGroupId: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ei hintaryhmää</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ostohinta</Label>
            <Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(event) => setForm((current) => ({ ...current, purchasePrice: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Myyntihinta</Label>
            <Input type="number" min="0" step="0.01" value={form.defaultSalePrice} onChange={(event) => setForm((current) => ({ ...current, defaultSalePrice: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Kate %</Label>
            <Input type="number" min="0" step="0.1" value={form.defaultMarginPercent} onChange={(event) => setForm((current) => ({ ...current, defaultMarginPercent: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Asennushinta</Label>
            <Input type="number" min="0" step="0.01" value={form.defaultInstallPrice} onChange={(event) => setForm((current) => ({ ...current, defaultInstallPrice: event.target.value }))} />
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 md:col-span-2">
            <div>
              <div className="text-sm font-medium">Aktiivinen</div>
              <div className="text-xs text-muted-foreground">
                Inaktiiviset tuotteet eivät tule oletuksena käyttöön tarjoushaussa.
              </div>
            </div>
            <Checkbox checked={form.active} onCheckedChange={(checked) => setForm((current) => ({ ...current, active: Boolean(checked) }))} />
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
