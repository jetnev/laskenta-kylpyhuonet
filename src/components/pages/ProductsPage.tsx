import { useState } from 'react';
import { Plus, MagnifyingGlass, Trash, PencilSimple, Lock, X, FunnelSimple, FileXls, Wrench, Tag, CurrencyEur, Copy, Flask } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { useProducts, useInstallationGroups } from '../../hooks/use-data';
import { useAuth } from '../../hooks/use-auth';
import { Product } from '../../lib/types';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/calculations';
import { ReadOnlyAlert } from '../ReadOnlyAlert';
import { exportProductsToExcel, ExcelColumn } from '../../lib/export';
import { Badge } from '../ui/badge';
import { ResponsiveDialog } from '../ResponsiveDialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { testProducts, testInstallationGroups } from '../../lib/test-data';

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { groups, addGroup } = useInstallationGroups();
  const { canEdit, canDelete, role } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBulkActionsDialog, setShowBulkActionsDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'category' | 'group' | 'copy'>('category');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkGroup, setBulkGroup] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    unit: 'kpl',
    purchasePrice: 0,
    installationGroupId: '',
  });

  const [exportColumns, setExportColumns] = useState<ExcelColumn[]>([
    { field: 'code', label: 'Tuotekoodi', enabled: true },
    { field: 'name', label: 'Tuotenimi', enabled: true },
    { field: 'category', label: 'Kategoria', enabled: true },
    { field: 'unit', label: 'Yksikkö', enabled: true },
    { field: 'purchasePrice', label: 'Ostohinta', enabled: true },
    { field: 'installationGroup', label: 'Hintaryhmä', enabled: true },
  ]);

  const uniqueCategories = Array.from(new Set(products.filter(p => p.category).map(p => p.category!)));

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    const matchesGroup = !groupFilter || p.installationGroupId === groupFilter;
    return matchesSearch && matchesCategory && matchesGroup;
  });

  const handleOpenDialog = (product?: Product) => {
    if (!canEdit) {
      toast.error('Sinulla ei ole muokkausoikeuksia');
      return;
    }

    if (product) {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        name: product.name,
        category: product.category || '',
        unit: product.unit,
        purchasePrice: product.purchasePrice,
        installationGroupId: product.installationGroupId || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        code: '',
        name: '',
        category: '',
        unit: 'kpl',
        purchasePrice: 0,
        installationGroupId: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!canEdit) {
      toast.error('Sinulla ei ole muokkausoikeuksia');
      return;
    }

    if (!formData.name || !formData.code) {
      toast.error('Täytä kaikki pakolliset kentät');
      return;
    }

    const productData = {
      code: formData.code,
      name: formData.name,
      category: formData.category || undefined,
      unit: formData.unit,
      purchasePrice: formData.purchasePrice,
      installationGroupId: formData.installationGroupId || undefined,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      toast.success('Tuote päivitetty');
    } else {
      addProduct(productData);
      toast.success('Tuote lisätty');
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      toast.error('Sinulla ei ole poisto-oikeuksia');
      return;
    }

    if (confirm('Haluatko varmasti poistaa tämän tuotteen?')) {
      deleteProduct(id);
      toast.success('Tuote poistettu');
    }
  };

  const handleCopyProduct = (product: Product) => {
    if (!canEdit) {
      toast.error('Sinulla ei ole muokkausoikeuksia');
      return;
    }

    const newProduct = {
      code: `${product.code}-KOPIO`,
      name: `${product.name} (kopio)`,
      category: product.category,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      installationGroupId: product.installationGroupId,
    };

    addProduct(newProduct);
    toast.success('Tuote kopioitu');
  };

  const handleBulkDelete = () => {
    if (!canDelete) {
      toast.error('Sinulla ei ole poisto-oikeuksia');
      return;
    }

    if (selectedProducts.size === 0) {
      toast.error('Valitse poistettavat tuotteet');
      return;
    }

    if (confirm(`Haluatko varmasti poistaa ${selectedProducts.size} tuotetta?`)) {
      selectedProducts.forEach(id => deleteProduct(id));
      setSelectedProducts(new Set());
      toast.success(`${selectedProducts.size} tuotetta poistettu`);
    }
  };

  const handleBulkAction = () => {
    if (!canEdit) {
      toast.error('Sinulla ei ole muokkausoikeuksia');
      return;
    }

    if (selectedProducts.size === 0) {
      toast.error('Valitse tuotteet ensin');
      return;
    }

    if (bulkAction === 'category') {
      if (!bulkCategory) {
        toast.error('Valitse kategoria');
        return;
      }
      selectedProducts.forEach(id => {
        const product = products.find(p => p.id === id);
        if (product) {
          updateProduct(id, { ...product, category: bulkCategory });
        }
      });
      toast.success(`${selectedProducts.size} tuotteen kategoria päivitetty`);
      setSelectedProducts(new Set());
      setShowBulkActionsDialog(false);
    } else if (bulkAction === 'group') {
      selectedProducts.forEach(id => {
        const product = products.find(p => p.id === id);
        if (product) {
          updateProduct(id, { ...product, installationGroupId: bulkGroup || undefined });
        }
      });
      toast.success(`${selectedProducts.size} tuotteen hintaryhmä päivitetty`);
      setSelectedProducts(new Set());
      setShowBulkActionsDialog(false);
    } else if (bulkAction === 'copy') {
      selectedProducts.forEach(id => {
        const product = products.find(p => p.id === id);
        if (product) {
          const newProduct = {
            code: `${product.code}-KOPIO`,
            name: `${product.name} (kopio)`,
            category: product.category,
            unit: product.unit,
            purchasePrice: product.purchasePrice,
            installationGroupId: product.installationGroupId,
          };
          addProduct(newProduct);
        }
      });
      toast.success(`${selectedProducts.size} tuotetta kopioitu`);
      setSelectedProducts(new Set());
      setShowBulkActionsDialog(false);
    }
  };

  const toggleProductSelection = (id: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedProducts(newSelection);
  };

  const toggleAllProducts = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleExport = () => {
    const selectedColumns = exportColumns.filter(c => c.enabled);
    if (selectedColumns.length === 0) {
      toast.error('Valitse vähintään yksi sarake');
      return;
    }
    exportProductsToExcel(filteredProducts, groups, exportColumns);
    toast.success('Tuotteet viety Excel-tiedostoon');
    setShowExportDialog(false);
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setGroupFilter('');
    setSearch('');
  };

  const activeFiltersCount = [categoryFilter, groupFilter, search].filter(Boolean).length;

  const handleLoadTestData = () => {
    if (products.length > 0) {
      if (!confirm('Tuoterekisterissä on jo tuotteita. Haluatko lisätä testidatan olemassa olevien tuotteiden päälle?')) {
        return;
      }
    }

    testInstallationGroups.forEach(g => addGroup(g));
    
    const groupsMap: Record<string, string> = {};
    groups.forEach(g => {
      groupsMap[g.name] = g.id;
    });

    const getGroupIdForCategory = (category?: string) => {
      if (!category) return undefined;
      if (category === 'Laatat') {
        return groups.find(g => g.name.includes('Laatoitus'))?.id;
      } else if (category === 'Kalusteet') {
        return groups.find(g => g.name.includes('Kalusteen'))?.id;
      } else if (category === 'Suihkutilat') {
        return groups.find(g => g.name.includes('Suihkuseinän'))?.id;
      } else if (category === 'Vesikalusteet') {
        return groups.find(g => g.name.includes('Hanojen'))?.id;
      }
      return undefined;
    };

    testProducts.forEach(p => {
      addProduct({
        ...p,
        installationGroupId: getGroupIdForCategory(p.category),
      });
    });

    toast.success(`Lisätty ${testProducts.length} testuotetta ja ${testInstallationGroups.length} hintaryhmää!`);
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Tuoterekisteri</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Hallinnoi tuotteita ja hintoja</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {role === 'owner' && products.length === 0 && (
            <Button variant="secondary" onClick={handleLoadTestData} className="gap-2 flex-1 sm:flex-initial">
              <Flask weight="bold" />
              <span className="hidden sm:inline">Lataa testidata</span>
              <span className="sm:hidden">Testi</span>
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowExportDialog(true)} className="gap-2 flex-1 sm:flex-initial">
            <FileXls weight="bold" />
            <span className="hidden sm:inline">Vie Excel</span>
            <span className="sm:hidden">Vie</span>
          </Button>
          {canEdit ? (
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus weight="bold" />
              Lisää tuote
            </Button>
          ) : (
            <Button disabled className="gap-2">
              <Lock weight="bold" />
              Lukuoikeus
            </Button>
          )}
        </div>
      </div>

      {!canEdit && <ReadOnlyAlert />}

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingProduct ? 'Muokkaa tuotetta' : 'Uusi tuote'}
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 sm:flex-initial">
              Peruuta
            </Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-initial">Tallenna</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Tuotekoodi *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="esim. LAA-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Tuotenimi *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="esim. Keraaminen laatta 30x30cm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategoria</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="esim. Laatat"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Yksikkö</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kpl">kpl</SelectItem>
                  <SelectItem value="m2">m²</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="l">l</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Ostohinta (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group">Hintaryhmä</Label>
            <Select
              value={formData.installationGroupId}
              onValueChange={(value) => setFormData({ ...formData, installationGroupId: value })}
            >
              <SelectTrigger id="group">
                <SelectValue placeholder="Ei hintaryhmää" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Ei hintaryhmää</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ResponsiveDialog>

      {selectedProducts.size > 0 && canEdit && (
        <Card className="p-4 bg-accent/20 border-accent">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                {selectedProducts.size} valittu
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProducts(new Set())}>
                <X /> Tyhjennä valinta
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  setBulkAction('category');
                  setShowBulkActionsDialog(true);
                }} 
                className="gap-2"
              >
                <Tag weight="bold" />
                Vaihda kategoria
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  setBulkAction('group');
                  setShowBulkActionsDialog(true);
                }} 
                className="gap-2"
              >
                <Wrench weight="bold" />
                Vaihda hintaryhmä
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  setBulkAction('copy');
                  setShowBulkActionsDialog(true);
                }} 
                className="gap-2"
              >
                <Copy weight="bold" />
                Kopioi valitut
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
                <Trash weight="bold" />
                Poista valitut
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hae tuotteita..."
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowFilterDialog(true)}
            >
              <FunnelSimple weight="bold" />
              Suodata
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">{activeFiltersCount}</Badge>
              )}
            </Button>
            <ResponsiveDialog
              open={showFilterDialog}
              onOpenChange={setShowFilterDialog}
              title="Suodata tuotteita"
              maxWidth="sm"
              footer={
                <>
                  <Button variant="outline" onClick={clearFilters} className="flex-1 sm:flex-initial">
                    Tyhjennä suodattimet
                  </Button>
                  <Button onClick={() => setShowFilterDialog(false)} className="flex-1 sm:flex-initial">Sulje</Button>
                </>
              }
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-category">Kategoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="filter-category">
                      <SelectValue placeholder="Kaikki kategoriat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Kaikki kategoriat</SelectItem>
                      {uniqueCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-group">Hintaryhmä</Label>
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger id="filter-group">
                      <SelectValue placeholder="Kaikki hintaryhmät" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Kaikki hintaryhmät</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ResponsiveDialog>
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex gap-2 flex-wrap">
              {categoryFilter && (
                <Badge variant="secondary" className="gap-1">
                  Kategoria: {categoryFilter}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter('')} />
                </Badge>
              )}
              {groupFilter && (
                <Badge variant="secondary" className="gap-1">
                  Ryhmä: {groups.find(g => g.id === groupFilter)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setGroupFilter('')} />
                </Badge>
              )}
            </div>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {products.length === 0 ? 'Ei tuotteita. Lisää ensimmäinen tuote yllä olevasta painikkeesta.' : 'Ei hakutuloksia.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canEdit && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProducts.size === filteredProducts.length}
                        onCheckedChange={toggleAllProducts}
                      />
                    </TableHead>
                  )}
                  <TableHead>Tuotekoodi</TableHead>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Kategoria</TableHead>
                  <TableHead>Yksikkö</TableHead>
                  <TableHead className="text-right">Ostohinta</TableHead>
                  <TableHead>Hintaryhmä</TableHead>
                  {canEdit && <TableHead className="w-32"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const group = product.installationGroupId
                    ? groups.find((g) => g.id === product.installationGroupId)
                    : null;
                  return (
                    <TableRow key={product.id}>
                      {canEdit && (
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono">{product.code}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(product.purchasePrice)}
                      </TableCell>
                      <TableCell>{group?.name || '-'}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyProduct(product)}
                              className="h-8 w-8"
                              title="Kopioi tuote"
                            >
                              <Copy />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(product)}
                              className="h-8 w-8"
                              title="Muokkaa tuotetta"
                            >
                              <PencilSimple />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product.id)}
                              className="h-8 w-8"
                              title="Poista tuote"
                            >
                              <Trash className="text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ResponsiveDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        title="Vie tuotteet Excel-tiedostoon"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowExportDialog(false)} className="flex-1 sm:flex-initial">
              Peruuta
            </Button>
            <Button onClick={handleExport} className="flex-1 sm:flex-initial gap-2">
              <FileXls weight="bold" />
              Vie Excel
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Valitse vietävät sarakkeet:
          </p>
          <div className="space-y-2">
            {exportColumns.map((col, index) => (
              <div key={col.field} className="flex items-center space-x-2">
                <Checkbox
                  id={`export-${col.field}`}
                  checked={col.enabled}
                  onCheckedChange={(checked) => {
                    const newColumns = [...exportColumns];
                    newColumns[index].enabled = !!checked;
                    setExportColumns(newColumns);
                  }}
                />
                <Label htmlFor={`export-${col.field}`} className="cursor-pointer">
                  {col.label}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Viedään {filteredProducts.length} tuotetta
          </p>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={showBulkActionsDialog}
        onOpenChange={setShowBulkActionsDialog}
        title="Joukkotoiminto"
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBulkActionsDialog(false)} className="flex-1 sm:flex-initial">
              Peruuta
            </Button>
            <Button onClick={handleBulkAction} className="flex-1 sm:flex-initial">
              Suorita
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {selectedProducts.size} tuotetta valittuna
          </p>
          
          <div className="space-y-2">
            <Label>Toiminto</Label>
            <RadioGroup value={bulkAction} onValueChange={(value) => setBulkAction(value as 'category' | 'group' | 'copy')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="category" id="bulk-category" />
                <Label htmlFor="bulk-category" className="cursor-pointer font-normal">
                  Vaihda kategoria
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="bulk-group" />
                <Label htmlFor="bulk-group" className="cursor-pointer font-normal">
                  Vaihda hintaryhmä
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="copy" id="bulk-copy" />
                <Label htmlFor="bulk-copy" className="cursor-pointer font-normal">
                  Kopioi tuotteet
                </Label>
              </div>
            </RadioGroup>
          </div>

          {bulkAction === 'category' && (
            <div className="space-y-2">
              <Label htmlFor="bulk-category-select">Uusi kategoria</Label>
              <Input
                id="bulk-category-select"
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                placeholder="Syötä kategoria"
              />
            </div>
          )}

          {bulkAction === 'group' && (
            <div className="space-y-2">
              <Label htmlFor="bulk-group-select">Uusi hintaryhmä</Label>
              <Select value={bulkGroup} onValueChange={setBulkGroup}>
                <SelectTrigger id="bulk-group-select">
                  <SelectValue placeholder="Valitse hintaryhmä" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ei hintaryhmää</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {bulkAction === 'copy' && (
            <div className="space-y-2">
              <p className="text-sm">
                Kopiot luodaan nimellä "<span className="font-mono">[Alkuperäinen nimi] (kopio)</span>" ja 
                tuotekoodilla "<span className="font-mono">[Alkuperäinen koodi]-KOPIO</span>".
              </p>
            </div>
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
