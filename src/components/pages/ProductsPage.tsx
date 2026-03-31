import { useState } from 'react';
import { Plus, MagnifyingGlass, Trash, PencilSimple, Lock, X, FunnelSimple, FileXls, Wrench, Tag, CurrencyEur } from '@phosphor-icons/react';
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

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { groups } = useInstallationGroups();
  const { isOwner } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBulkActionsDialog, setShowBulkActionsDialog] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'category' | 'group' | 'price'>('category');
  const [bulkActionData, setBulkActionData] = useState({
    category: '',
    groupId: '',
    priceType: 'set' as 'set' | 'increase' | 'decrease',
    priceValue: 0,
  });

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
    if (!isOwner) {
      toast.error('Vain omistaja voi muokata tuotteita');
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
    if (!isOwner) {
      toast.error('Vain omistaja voi tallentaa muutoksia');
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
    if (!isOwner) {
      toast.error('Vain omistaja voi poistaa tuotteita');
      return;
    }

    if (confirm('Haluatko varmasti poistaa tämän tuotteen?')) {
      deleteProduct(id);
      toast.success('Tuote poistettu');
    }
  };

  const handleBulkDelete = () => {
    if (!isOwner) {
      toast.error('Vain omistaja voi poistaa tuotteita');
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
    if (!isOwner) {
      toast.error('Vain omistaja voi tehdä joukkotoimintoja');
      return;
    }

    if (selectedProducts.size === 0) {
      toast.error('Valitse tuotteet ensin');
      return;
    }

    let count = 0;
    selectedProducts.forEach(id => {
      const product = products.find(p => p.id === id);
      if (!product) return;

      let updates: Partial<Product> = {};

      if (bulkActionType === 'category') {
        if (!bulkActionData.category) {
          toast.error('Anna kategoria');
          return;
        }
        updates.category = bulkActionData.category;
      } else if (bulkActionType === 'group') {
        updates.installationGroupId = bulkActionData.groupId || undefined;
      } else if (bulkActionType === 'price') {
        if (bulkActionData.priceType === 'set') {
          updates.purchasePrice = bulkActionData.priceValue;
        } else if (bulkActionData.priceType === 'increase') {
          updates.purchasePrice = product.purchasePrice + bulkActionData.priceValue;
        } else if (bulkActionData.priceType === 'decrease') {
          updates.purchasePrice = Math.max(0, product.purchasePrice - bulkActionData.priceValue);
        }
      }

      updateProduct(id, updates);
      count++;
    });

    setSelectedProducts(new Set());
    setShowBulkActionsDialog(false);
    setBulkActionData({
      category: '',
      groupId: '',
      priceType: 'set',
      priceValue: 0,
    });

    if (bulkActionType === 'category') {
      toast.success(`${count} tuotteen kategoria päivitetty`);
    } else if (bulkActionType === 'group') {
      toast.success(`${count} tuotteen hintaryhmä päivitetty`);
    } else if (bulkActionType === 'price') {
      toast.success(`${count} tuotteen hinta päivitetty`);
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

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Tuoterekisteri</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Hallinnoi tuotteita ja hintoja</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowExportDialog(true)} className="gap-2 flex-1 sm:flex-initial">
            <FileXls weight="bold" />
            <span className="hidden sm:inline">Vie Excel</span>
            <span className="sm:hidden">Vie</span>
          </Button>
          {isOwner ? (
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

      {!isOwner && <ReadOnlyAlert />}

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

      {selectedProducts.size > 0 && isOwner && (
        <Card className="p-4 bg-accent/20 border-accent">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="px-3 py-1">
                {selectedProducts.size} valittu
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProducts(new Set())}>
                <X /> Tyhjennä valinta
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowBulkActionsDialog(true)} 
                className="gap-2 flex-1 sm:flex-initial"
              >
                <Wrench weight="bold" />
                Joukkotoiminnot
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete} 
                className="gap-2 flex-1 sm:flex-initial"
              >
                <Trash weight="bold" />
                Poista
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
                  {isOwner && (
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
                  {isOwner && <TableHead className="w-24"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const group = product.installationGroupId
                    ? groups.find((g) => g.id === product.installationGroupId)
                    : null;
                  return (
                    <TableRow key={product.id}>
                      {isOwner && (
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
                      {isOwner && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(product)}
                              className="h-8 w-8"
                            >
                              <PencilSimple />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product.id)}
                              className="h-8 w-8"
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
        open={showBulkActionsDialog}
        onOpenChange={setShowBulkActionsDialog}
        title="Joukkotoiminnot"
        maxWidth="md"
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => setShowBulkActionsDialog(false)} 
              className="flex-1 sm:flex-initial"
            >
              Peruuta
            </Button>
            <Button onClick={handleBulkAction} className="flex-1 sm:flex-initial">
              Toteuta
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Valittu {selectedProducts.size} tuotetta
          </p>
          
          <div className="space-y-2">
            <Label>Toiminto</Label>
            <RadioGroup value={bulkActionType} onValueChange={(value) => setBulkActionType(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="category" id="action-category" />
                <Label htmlFor="action-category" className="cursor-pointer flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Vaihda kategoria
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="action-group" />
                <Label htmlFor="action-group" className="cursor-pointer flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Vaihda hintaryhmä
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price" id="action-price" />
                <Label htmlFor="action-price" className="cursor-pointer flex items-center gap-2">
                  <CurrencyEur className="h-4 w-4" />
                  Päivitä ostohinta
                </Label>
              </div>
            </RadioGroup>
          </div>

          {bulkActionType === 'category' && (
            <div className="space-y-2">
              <Label htmlFor="bulk-category">Uusi kategoria</Label>
              <Input
                id="bulk-category"
                value={bulkActionData.category}
                onChange={(e) => setBulkActionData({ ...bulkActionData, category: e.target.value })}
                placeholder="esim. Laatat"
              />
            </div>
          )}

          {bulkActionType === 'group' && (
            <div className="space-y-2">
              <Label htmlFor="bulk-group">Uusi hintaryhmä</Label>
              <Select
                value={bulkActionData.groupId}
                onValueChange={(value) => setBulkActionData({ ...bulkActionData, groupId: value })}
              >
                <SelectTrigger id="bulk-group">
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

          {bulkActionType === 'price' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Hinnan muutostyyppi</Label>
                <RadioGroup 
                  value={bulkActionData.priceType} 
                  onValueChange={(value) => setBulkActionData({ ...bulkActionData, priceType: value as any })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="set" id="price-set" />
                    <Label htmlFor="price-set" className="cursor-pointer">
                      Aseta uusi hinta
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="increase" id="price-increase" />
                    <Label htmlFor="price-increase" className="cursor-pointer">
                      Nosta hintaa
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decrease" id="price-decrease" />
                    <Label htmlFor="price-decrease" className="cursor-pointer">
                      Laske hintaa
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-price">
                  {bulkActionData.priceType === 'set' ? 'Uusi hinta (€)' : 'Muutos (€)'}
                </Label>
                <Input
                  id="bulk-price"
                  type="number"
                  step="0.01"
                  value={bulkActionData.priceValue}
                  onChange={(e) => setBulkActionData({ ...bulkActionData, priceValue: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>
      </ResponsiveDialog>

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
    </div>
  );
}
