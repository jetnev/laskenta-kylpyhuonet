import { useState } from 'react';
import { Plus, Pencil, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { useProducts, useInstallationGroups } from '../../hooks/use-data';
import { Product, UnitType } from '../../lib/types';
import { formatCurrency } from '../../lib/calculations';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

const UNIT_TYPES: UnitType[] = ['kpl', 'm²', 'jm', 'm'];

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { groups } = useInstallationGroups();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    unit: 'kpl' as UnitType,
    purchasePrice: '',
    installationGroupId: '',
  });

  const filteredProducts = products.filter(
    (p) =>
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        name: product.name,
        category: product.category,
        unit: product.unit,
        purchasePrice: product.purchasePrice.toString(),
        installationGroupId: product.installationGroupId || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        code: '',
        name: '',
        category: '',
        unit: 'kpl',
        purchasePrice: '',
        installationGroupId: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const purchasePrice = parseFloat(formData.purchasePrice);
    if (isNaN(purchasePrice) || purchasePrice < 0) {
      toast.error('Virheellinen ostohinta');
      return;
    }

    const productData = {
      code: formData.code,
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      purchasePrice,
      installationGroupId: formData.installationGroupId || undefined,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      toast.success('Tuote päivitetty');
    } else {
      addProduct(productData);
      toast.success('Tuote lisätty');
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    toast.success('Tuote poistettu');
    setDeleteConfirmId(null);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Tuoterekisteri</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus weight="bold" />
              Lisää tuote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Muokkaa tuotetta' : 'Uusi tuote'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Tuotekoodi *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                    placeholder="esim. ABC-123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategoria *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    required
                    placeholder="esim. Suihkukalusteet"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tuotteen nimi *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="esim. Suihkuseinä 80x200cm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Yksikkö *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value: UnitType) =>
                      setFormData({ ...formData, unit: value })
                    }
                  >
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Ostohinta (€) *</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, purchasePrice: e.target.value })
                    }
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="installationGroup">Hintaryhmä</Label>
                <Select
                  value={formData.installationGroupId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, installationGroupId: value })
                  }
                >
                  <SelectTrigger id="installationGroup">
                    <SelectValue placeholder="Ei valittu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ei valittu</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Peruuta
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Päivitä' : 'Lisää'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <MagnifyingGlass className="text-muted-foreground" />
          <Input
            placeholder="Hae tuotekoodilla, nimellä tai kategorialla..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {searchQuery
              ? 'Ei hakutuloksia'
              : 'Ei tuotteita. Lisää ensimmäinen tuote yllä olevasta painikkeesta.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tuotekoodi</TableHead>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Kategoria</TableHead>
                  <TableHead>Yksikkö</TableHead>
                  <TableHead className="text-right">Ostohinta</TableHead>
                  <TableHead>Hintaryhmä</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const group = groups.find((g) => g.id === product.installationGroupId);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.code}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(product.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {group?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(product)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(product.id)}
                          >
                            <Trash className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vahvista poisto</AlertDialogTitle>
            <AlertDialogDescription>
              Haluatko varmasti poistaa tämän tuotteen? Tätä toimintoa ei voi peruuttaa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Poista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
